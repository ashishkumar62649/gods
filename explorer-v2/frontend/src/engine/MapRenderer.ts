import {
  Cartesian2,
  Cartesian3,
  Cartographic,
  createOsmBuildingsAsync,
  EasingFunction,
  HeadingPitchRange,
  ImageryLayer,
  IonGeocoderService,
  Math as CesiumMath,
  Matrix4,
  Rectangle,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  type Cesium3DTileset,
  type ImageryProvider,
  type Viewer as CesiumViewer,
} from 'cesium';
import type { IRenderer } from './IRenderer';
import { type MapState, useMapStore } from '../core/store/useMapStore';
import { useLiveDataStore } from '../store/liveDataStore';
import { flyObliqueToDestination } from '../earth/viewer/cameraUtils';
import { buildImageryOptions } from '../earth/viewer/imageryOptions';
import { BUILDINGS_ALTITUDE_THRESHOLD, HOME_VIEW } from '../earth/viewer/viewerConfig';

export class MapRenderer implements IRenderer {
  private viewer: CesiumViewer | null = null;
  private unsubscribe: (() => void) | null = null;
  private geocoder: IonGeocoderService | null = null;
  private buildingsTileset: Cesium3DTileset | null = null;
  private currentBaseLayers: ImageryLayer[] = [];
  private lastImageryId: string | null = null;
  private lastSearchIssuedAt = 0;
  private lastCoordinateFlyToIssuedAt = 0;
  private lastHomeRequestAt = 0;
  private orbitRafHandle: number | null = null;
  private orbitSessionId = 0;
  private cameraListener: (() => void) | null = null;
  private lastBuildingsShow: boolean | null = null;
  private buildingsLoadPromise: Promise<Cesium3DTileset | null> | null = null;
  private pendingAutoOrbitRev = 0;
  private interactionHandler: ScreenSpaceEventHandler | null = null;
  private lastCameraStatusAt = 0;

  attach(viewer: CesiumViewer): void {
    this.viewer = viewer;
    this.geocoder = new IonGeocoderService({ scene: viewer.scene });

    this.unsubscribe = useMapStore.subscribe((state) => {
      void this.renderMap(state);
    });

    this.cameraListener = () => {
      this.updateBuildingsVisibility();
      this.updateCameraStatus();
    };
    viewer.camera.changed.addEventListener(this.cameraListener);

    this.interactionHandler = new ScreenSpaceEventHandler(viewer.scene.canvas);
    const stopOrbitOnInteraction = () => {
      const state = useMapStore.getState();
      if (state.orbitEnabled || state.autoBuildingsEnabled) {
        // Increment pending auto-orbit rev so if an auto-orbit was just
        // queued (e.g. from search), it doesn't fire and hijack the camera.
        this.pendingAutoOrbitRev += 1;
        state.setOrbitEnabled(false);
        state.setAutoBuildings(false);
      }
    };
    
    this.interactionHandler.setInputAction(stopOrbitOnInteraction, ScreenSpaceEventType.LEFT_DOWN);
    this.interactionHandler.setInputAction(stopOrbitOnInteraction, ScreenSpaceEventType.RIGHT_DOWN);
    this.interactionHandler.setInputAction(stopOrbitOnInteraction, ScreenSpaceEventType.MIDDLE_DOWN);
    this.interactionHandler.setInputAction(stopOrbitOnInteraction, ScreenSpaceEventType.WHEEL);
    this.interactionHandler.setInputAction(stopOrbitOnInteraction, ScreenSpaceEventType.PINCH_START);

    void this.renderMap(useMapStore.getState());
    this.updateCameraStatus(true);
  }

  detach(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;

    if (this.viewer && this.cameraListener) {
      this.viewer.camera.changed.removeEventListener(this.cameraListener);
    }
    this.cameraListener = null;

    if (this.interactionHandler) {
      this.interactionHandler.destroy();
      this.interactionHandler = null;
    }

    this.disableOrbit();
    this.pendingAutoOrbitRev += 1;

    if (this.viewer && this.buildingsTileset && !this.viewer.isDestroyed()) {
      this.viewer.scene.primitives.remove(this.buildingsTileset);
    }
    this.buildingsTileset = null;
    this.currentBaseLayers = [];
    this.geocoder = null;
    this.viewer = null;
  }

  private async renderMap(state: MapState): Promise<void> {
    await this.applyImagery(state.selectedImageryId);
    await this.applyBuildings(state.buildingsEnabled || state.autoBuildingsEnabled);
    this.applyOrbit(state.orbitEnabled);

    if (state.lastSearch && state.lastSearch.issuedAt !== this.lastSearchIssuedAt) {
      this.lastSearchIssuedAt = state.lastSearch.issuedAt;
      await this.flyToPlace(state.lastSearch.query);
    }

    if (
      state.lastCoordinateFlyTo &&
      state.lastCoordinateFlyTo.issuedAt !== this.lastCoordinateFlyToIssuedAt
    ) {
      this.lastCoordinateFlyToIssuedAt = state.lastCoordinateFlyTo.issuedAt;
      this.flyToCoordinates(
        state.lastCoordinateFlyTo.latitude,
        state.lastCoordinateFlyTo.longitude,
        state.lastCoordinateFlyTo.height,
      );
    }

    if (
      state.lastHomeRequestAt &&
      state.lastHomeRequestAt !== this.lastHomeRequestAt
    ) {
      this.lastHomeRequestAt = state.lastHomeRequestAt;
      this.flyHome();
    }
  }

  private async applyImagery(imageryId: string): Promise<void> {
    if (!this.viewer || this.viewer.isDestroyed() || imageryId === this.lastImageryId) {
      return;
    }

    const option = buildImageryOptions().find((item) => item.id === imageryId);
    if (!option) {
      return;
    }

    const created = option.create();
    const providerList: ImageryProvider[] = Array.isArray(created) ? created : [created];

    const imageryLayers = this.viewer.imageryLayers;

    // Remove everything we previously added for the base stack.
    if (this.currentBaseLayers.length > 0) {
      for (const layer of this.currentBaseLayers) {
        imageryLayers.remove(layer, true);
      }
    } else if (imageryLayers.length > 0) {
      // First call — strip the initial Cesium default layer.
      imageryLayers.remove(imageryLayers.get(0), true);
    }

    // Add providers back-to-front so the first entry ends up on top
    // (matches OLD Viewer.tsx:233-239 behavior for overlay stacks
    // like satellite + labels).
    const added: ImageryLayer[] = [];
    for (let i = providerList.length - 1; i >= 0; i -= 1) {
      const layer = ImageryLayer.fromProviderAsync(Promise.resolve(providerList[i]));
      imageryLayers.add(layer, 0);
      added.unshift(layer);
    }

    this.currentBaseLayers = added;
    this.lastImageryId = imageryId;
    this.viewer.scene.requestRender();
  }

  private async applyBuildings(enabled: boolean): Promise<void> {
    if (!this.viewer || this.viewer.isDestroyed()) {
      return;
    }

    if (!this.buildingsTileset) {
      if (!enabled) return; // Lazy-load only on demand.
      const tileset = await this.ensureBuildingsTileset();
      if (!tileset || !this.viewer || this.viewer.isDestroyed()) return;
    }

    this.updateBuildingsVisibility();
  }

  private async ensureBuildingsTileset(): Promise<Cesium3DTileset | null> {
    if (this.buildingsTileset) {
      return this.buildingsTileset;
    }

    if (this.buildingsLoadPromise) {
      return this.buildingsLoadPromise;
    }

    const viewerAtLoadStart = this.viewer;
    if (!viewerAtLoadStart || viewerAtLoadStart.isDestroyed()) {
      return null;
    }

    this.buildingsLoadPromise = createOsmBuildingsAsync({ showOutline: false })
      .then((tileset) => {
        const latestState = useMapStore.getState();
        const shouldKeepTileset =
          latestState.buildingsEnabled || latestState.autoBuildingsEnabled;

        if (
          !this.viewer ||
          this.viewer !== viewerAtLoadStart ||
          viewerAtLoadStart.isDestroyed() ||
          !shouldKeepTileset
        ) {
          tileset.destroy();
          return null;
        }

        tileset.show = false;
        tileset.preloadWhenHidden = true;
        tileset.preloadFlightDestinations = true;
        tileset.maximumScreenSpaceError = 8;
        tileset.preferLeaves = true;
        tileset.foveatedScreenSpaceError = false;
        viewerAtLoadStart.scene.primitives.add(tileset);

        this.buildingsTileset = tileset;
        this.lastBuildingsShow = null;
        return tileset;
      })
      .catch((error) => {
        console.error('[MapRenderer] Failed to load OSM buildings:', error);
        return null;
      })
      .finally(() => {
        this.buildingsLoadPromise = null;
      });

    return this.buildingsLoadPromise;
  }

  private updateBuildingsVisibility(): void {
    const state = useMapStore.getState();
    if (!this.viewer || !this.buildingsTileset || this.viewer.isDestroyed()) {
      return;
    }

    const nextShow =
      (state.buildingsEnabled || state.autoBuildingsEnabled) &&
      this.viewer.camera.positionCartographic.height < BUILDINGS_ALTITUDE_THRESHOLD;

    if (this.lastBuildingsShow === nextShow) return;
    this.lastBuildingsShow = nextShow;
    this.buildingsTileset.show = nextShow;
    this.viewer.scene.requestRender();
  }

  private updateCameraStatus(force = false): void {
    if (!this.viewer || this.viewer.isDestroyed()) return;
    const now = performance.now();
    if (!force && now - this.lastCameraStatusAt < 250) return;
    this.lastCameraStatusAt = now;

    const cartographic = this.viewer.camera.positionCartographic;
    useMapStore.getState().setCameraStatus({
      headingDeg: CesiumMath.toDegrees(this.viewer.camera.heading),
      pitchDeg: CesiumMath.toDegrees(this.viewer.camera.pitch),
      heightM: cartographic.height,
      latitude: Number.isFinite(cartographic.latitude)
        ? CesiumMath.toDegrees(cartographic.latitude)
        : null,
      longitude: Number.isFinite(cartographic.longitude)
        ? CesiumMath.toDegrees(cartographic.longitude)
        : null,
    });
  }

  private applyOrbit(enabled: boolean): void {
    if (!this.viewer || this.viewer.isDestroyed()) {
      return;
    }

    if (enabled && this.orbitRafHandle === null) {
      this.startOrbit();
      return;
    }

    if (!enabled) {
      this.disableOrbit();
    }
  }

  private startOrbit(target?: Cartesian3, explicitRange?: number): void {
    if (!this.viewer || this.viewer.isDestroyed()) return;

    const viewer = this.viewer;
    const canvas = viewer.scene.canvas;
    const center = new Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 2);

    let resolvedTarget = target;
    if (!resolvedTarget) {
      const ray = viewer.camera.getPickRay(center);
      const globeHit = ray ? viewer.scene.globe.pick(ray, viewer.scene) : undefined;
      const ellipsoidHit = viewer.camera.pickEllipsoid(center);
      const cameraCartographic = viewer.camera.positionCartographic;
      resolvedTarget =
        globeHit ??
        ellipsoidHit ??
        Cartesian3.fromRadians(
          cameraCartographic.longitude,
          cameraCartographic.latitude,
          0,
        );
    }

    const finalTarget = resolvedTarget;
    let heading = viewer.camera.heading;
    const pitch = CesiumMath.clamp(
      viewer.camera.pitch,
      CesiumMath.toRadians(-75),
      CesiumMath.toRadians(-15),
    );
    const range =
      explicitRange ??
      Math.max(550, Cartesian3.distance(viewer.camera.position, finalTarget));
    const angularSpeed = CesiumMath.clamp(
      100 / range,
      CesiumMath.toRadians(1),
      CesiumMath.toRadians(8),
    );

    const sessionId = ++this.orbitSessionId;
    let lastTime = performance.now();

    const tick = () => {
      if (sessionId !== this.orbitSessionId) return;
      if (!this.viewer || this.viewer.isDestroyed()) return;

      const now = performance.now();
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      heading += angularSpeed * dt;
      this.viewer.camera.lookAt(finalTarget, new HeadingPitchRange(heading, pitch, range));
      this.viewer.scene.requestRender();
      this.orbitRafHandle = requestAnimationFrame(tick);
    };

    this.orbitRafHandle = requestAnimationFrame(tick);
  }

  private disableOrbit(): void {
    this.orbitSessionId += 1;
    if (this.orbitRafHandle !== null) {
      cancelAnimationFrame(this.orbitRafHandle);
      this.orbitRafHandle = null;
    }
    if (this.viewer && !this.viewer.isDestroyed()) {
      this.viewer.camera.lookAtTransform(Matrix4.IDENTITY);
      this.viewer.scene.requestRender();
    }
  }

  private async flyToPlace(query: string): Promise<void> {
    if (!this.viewer || this.viewer.isDestroyed() || !this.geocoder) {
      return;
    }

    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      return;
    }

    // Cancel any prior auto-orbit queue + active orbit so the camera can
    // land cleanly at the new destination.
    this.pendingAutoOrbitRev += 1;
    this.disableOrbit();
    useMapStore.getState().setOrbitEnabled(false);
    useMapStore.getState().setAutoBuildings(false);

    try {
      const results = await this.geocoder.geocode(trimmedQuery);
      if (!results.length) {
        console.warn(`[MapRenderer] No geocoding results for "${trimmedQuery}".`);
        return;
      }

      const chosen = pickBestGeocoderResult(trimmedQuery, results);
      const location = locationFromGeocoderDestination(chosen.destination, this.viewer);
      if (location) {
        useLiveDataStore.getState().setSelectedLocation({
          name: chosen.displayName || trimmedQuery,
          ...location,
        });
      }

      // Treat either a Cartesian3 point OR a very tight Rectangle
      // (< 0.02° diagonal) as a landmark — Ion returns famous landmarks
      // as tight rectangles, not points.
      let isLandmark = chosen.destination instanceof Cartesian3;
      let landmarkPoint: Cartesian3 | null = isLandmark
        ? (chosen.destination as Cartesian3)
        : null;
      if (!isLandmark && chosen.destination instanceof Rectangle) {
        const r = chosen.destination;
        const wDeg = CesiumMath.toDegrees(Math.abs(r.east - r.west));
        const hDeg = CesiumMath.toDegrees(Math.abs(r.north - r.south));
        const diagDeg = Math.sqrt(wDeg * wDeg + hDeg * hDeg);
        if (diagDeg < 0.02) {
          isLandmark = true;
          landmarkPoint = Cartesian3.fromRadians(
            (r.east + r.west) / 2,
            (r.north + r.south) / 2,
            0,
          );
        }
      }

      // Landmarks: skip the 12,000 km staged climb and land direct.
      flyObliqueToDestination(this.viewer, chosen.destination, isLandmark);

      // Auto-start orbit once the camera finishes landing.
      if (isLandmark && landmarkPoint) {
        this.queueLandmarkOrbit(landmarkPoint);
      } else if (chosen.destination instanceof Rectangle) {
        this.queueAreaOrbit(chosen.destination);
      }
    } catch (error) {
      console.error('[MapRenderer] Search failed:', error);
    }
  }

  private queueLandmarkOrbit(landmarkPoint: Cartesian3): void {
    if (!this.viewer || this.viewer.isDestroyed()) return;
    const viewer = this.viewer;
    const rev = ++this.pendingAutoOrbitRev;

    const removeListener = viewer.camera.moveEnd.addEventListener(() => {
      if (this.pendingAutoOrbitRev !== rev) {
        removeListener();
        return;
      }
      const distance = Cartesian3.distance(viewer.camera.position, landmarkPoint);
      if (distance < 2_000) {
        removeListener();
        const carto = viewer.scene.globe.ellipsoid.cartesianToCartographic(landmarkPoint);
        const terrainHeight = viewer.scene.globe.getHeight(carto) ?? 0;
        const measuredHeight = Math.max(
          0,
          (this.buildingsTileset?.getHeight?.(carto, viewer.scene) ?? terrainHeight) -
            terrainHeight,
        );
        const orbitTarget = Cartesian3.fromRadians(
          carto.longitude,
          carto.latitude,
          terrainHeight + measuredHeight * 0.25,
        );
        const orbitRange = Math.max(1_100, measuredHeight * 4.2 + 360);
        this.disableOrbit();
        this.startOrbit(orbitTarget, orbitRange);
        useMapStore.getState().setAutoBuildings(true);
        useMapStore.getState().setOrbitEnabled(true);
      }
    });
  }

  private queueAreaOrbit(rect: Rectangle): void {
    if (!this.viewer || this.viewer.isDestroyed()) return;
    const viewer = this.viewer;
    const rev = ++this.pendingAutoOrbitRev;

    const removeListener = viewer.camera.moveEnd.addEventListener(() => {
      if (this.pendingAutoOrbitRev !== rev) {
        removeListener();
        return;
      }
      removeListener();
      const orbitTarget = Cartesian3.fromRadians(
        (rect.east + rect.west) / 2,
        (rect.north + rect.south) / 2,
        0,
      );
      const orbitRange = Cartesian3.distance(viewer.camera.position, orbitTarget);
      this.disableOrbit();
      this.startOrbit(orbitTarget, orbitRange);
      useMapStore.getState().setOrbitEnabled(true);
    });
  }

  flyHome(): void {
    this.pendingAutoOrbitRev += 1;
    this.disableOrbit();
    useMapStore.getState().setAutoBuildings(false);
    useMapStore.getState().setOrbitEnabled(false);
    this.viewer?.camera.flyTo({
      destination: Cartesian3.fromDegrees(HOME_VIEW.lon, HOME_VIEW.lat, HOME_VIEW.height),
      orientation: {
        heading: CesiumMath.toRadians(HOME_VIEW.heading),
        pitch: CesiumMath.toRadians(HOME_VIEW.pitch),
        roll: 0,
      },
      duration: 1.6,
      easingFunction: EasingFunction.SINUSOIDAL_IN_OUT,
    });
  }

  private flyToCoordinates(latitude: number, longitude: number, height: number): void {
    if (!this.viewer || this.viewer.isDestroyed()) return;

    this.pendingAutoOrbitRev += 1;
    this.disableOrbit();
    useMapStore.getState().setAutoBuildings(false);
    useMapStore.getState().setOrbitEnabled(false);
    this.viewer.camera.flyTo({
      destination: Cartesian3.fromDegrees(longitude, latitude, height),
      orientation: {
        heading: CesiumMath.toRadians(0),
        pitch: CesiumMath.toRadians(-55),
        roll: 0,
      },
      duration: 1.4,
      easingFunction: EasingFunction.SINUSOIDAL_IN_OUT,
    });
  }
}

// ---------------------------------------------------------------------------
// Geocoder result ranking — ported from OLD
// _reference_gods_origin_main/explorer/src/earth/viewer/Viewer.tsx:807-908.
// Ion's first result is often a nearby landmark with a related name rather
// than the actual named place; this scoring restores correct behavior for
// country/city/waterway/landmark queries.
// ---------------------------------------------------------------------------
type GeocoderResult = {
  displayName: string;
  destination: Rectangle | Cartesian3;
};

function locationFromGeocoderDestination(
  destination: Rectangle | Cartesian3,
  viewer: CesiumViewer,
): { latitude: number; longitude: number; elevationM: number } | null {
  if (destination instanceof Rectangle) {
    const latitude = CesiumMath.toDegrees((destination.north + destination.south) / 2);
    const longitude = CesiumMath.toDegrees((destination.east + destination.west) / 2);
    return {
      latitude,
      longitude,
      elevationM: viewer.scene.globe.getHeight(
        new Cartographic(
          CesiumMath.toRadians(longitude),
          CesiumMath.toRadians(latitude),
          0,
        ),
      ) ?? 0,
    };
  }

  const cartographic = viewer.scene.globe.ellipsoid.cartesianToCartographic(destination);
  if (!cartographic) return null;
  return {
    latitude: CesiumMath.toDegrees(cartographic.latitude),
    longitude: CesiumMath.toDegrees(cartographic.longitude),
    elevationM: viewer.scene.globe.getHeight(cartographic) ?? cartographic.height ?? 0,
  };
}

function pickBestGeocoderResult(
  query: string,
  results: GeocoderResult[],
): GeocoderResult {
  const normalizedQuery = query.trim().toLowerCase();
  const queryVariants = [
    normalizedQuery,
    normalizedQuery.replace(/^state of\s+/, 'strait of '),
  ];
  const broadQueryPattern =
    /\b(country|state|province|region|strait|gulf|sea|ocean|bay|channel|river|lake)\b/;
  const queryLooksBroad = queryVariants.some((variant) =>
    broadQueryPattern.test(variant),
  );
  const queryLooksSpecificFeature =
    /\b(airport|tower|hotel|station|mall|museum|temple|shrine|bridge|monument|palace|fort)\b/.test(
      normalizedQuery,
    );
  const unwantedSpecificPattern =
    /\b(island|airport|tower|hotel|station|mall|museum|temple|shrine|bridge)\b/;
  const unwantedWaterPattern = /\b(bay|gulf|sea|ocean|strait|channel|harbor|port)\b/;
  const queryTokens = queryVariants[0]
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .filter((token) => !['the', 'of'].includes(token));
  const plainPlaceQuery =
    !queryLooksBroad &&
    !queryLooksSpecificFeature &&
    queryTokens.length > 0 &&
    queryTokens.length <= 2;

  const exactAreaMatch = plainPlaceQuery
    ? results.find((result) => {
        if (!(result.destination instanceof Rectangle)) return false;
        const displayName = result.displayName.trim().toLowerCase();
        const exactName = queryVariants.some(
          (variant) =>
            displayName === variant || displayName.startsWith(`${variant},`),
        );
        return exactName && !unwantedWaterPattern.test(displayName);
      })
    : undefined;

  const score = (result: GeocoderResult): number => {
    const displayName = result.displayName.trim().toLowerCase();
    const variantScore = queryVariants.reduce((bestScore, variant) => {
      let nextScore = 0;
      if (displayName === variant) nextScore = 4000;
      else if (displayName.startsWith(`${variant},`)) nextScore = 3500;
      else if (displayName.includes(variant)) nextScore = 2000;
      return Math.max(bestScore, nextScore);
    }, 0);
    let nameScore = variantScore;

    const displayTokens = displayName.split(/[^a-z0-9]+/).filter(Boolean);
    const matchedTokens = queryTokens.filter((token) =>
      displayTokens.includes(token),
    ).length;
    nameScore += matchedTokens * 300;

    if (
      !queryVariants.some((variant) => /\bisland\b/.test(variant)) &&
      /\bisland\b/.test(displayName)
    ) {
      nameScore -= 900;
    }
    if (
      plainPlaceQuery &&
      !queryVariants.some((variant) => unwantedWaterPattern.test(variant)) &&
      unwantedWaterPattern.test(displayName)
    ) {
      nameScore -= 1400;
    }
    if (
      unwantedSpecificPattern.test(displayName) &&
      !queryLooksBroad &&
      variantScore < 3500
    ) {
      nameScore -= 300;
    }

    if (result.destination instanceof Cartesian3) {
      return nameScore + (queryLooksBroad ? -600 : plainPlaceQuery ? -250 : 300);
    }

    const rect = result.destination;
    const area = Math.abs(rect.east - rect.west) * Math.abs(rect.north - rect.south);
    const compactnessScore = Math.max(
      0,
      (plainPlaceQuery ? 420 : 200) - Math.log(area + 1) * 20,
    );
    return (
      nameScore +
      compactnessScore +
      (queryLooksBroad ? 400 : 0) +
      (plainPlaceQuery ? 350 : 0)
    );
  };

  const best = results.reduce(
    (prev, curr) => (score(curr) > score(prev) ? curr : prev),
    results[0],
  );

  return exactAreaMatch ?? best;
}

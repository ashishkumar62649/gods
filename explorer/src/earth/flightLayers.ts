import {
  Billboard,
  BillboardCollection,
  Cartesian2,
  Cartesian3,
  Cartographic,
  Color,
  DistanceDisplayCondition,
  EllipsoidGeodesic,
  HorizontalOrigin,
  Label,
  LabelCollection,
  LabelStyle,
  Material,
  Math as CesiumMath,
  NearFarScalar,
  PointPrimitive,
  PointPrimitiveCollection,
  Polyline,
  PolylineCollection,
  PrimitiveCollection,
  VerticalOrigin,
  Viewer as CesiumViewer,
} from 'cesium';
import {
  AIRPORT_ICON_IMAGE,
  AUX_AIRPORT_ICON_IMAGE,
  AirportRecord,
  DESTINATION_AIRPORT_ICON_IMAGE,
  fetchFlightTrace,
  FlightRecord,
  FlightRenderMode,
  FlightRouteSnapshot,
  MEDIUM_AIRPORT_ICON_IMAGE,
  getFlightDisplayName,
  predictFlightPosition,
  SMALL_AIRPORT_ICON_IMAGE,
} from './flights';
import {
  getFlightAltitudeColorCss,
  getFlightIconDimensions,
  getFlightIconImage,
  getFlightIconKey,
} from './flightVisuals';

interface FlightPickId {
  kind: 'flight';
  flightId: string;
}

interface AirportPickId {
  kind: 'airport';
  airportId: string;
}

interface FlightPrimitiveEntry {
  dot: PointPrimitive;
  icon: Billboard;
}

interface FlightRenderEntry extends FlightPrimitiveEntry {
  flight: FlightRecord;
  sharedFramePosition: Cartesian3;
  confirmedApiPosition: Cartesian3;
  targetApiPosition: Cartesian3;
  correctionVector: Cartesian3;
  targetLatitude: number;
  targetLongitude: number;
  targetAltitudeMeters: number;
  lastUpdatedMs: number;
  fadeStartedAtMs: number | null;
  currentOpacity: number;
  dotBaseColor: Color;
  dotOutlineBaseColor: Color;
  iconBaseColor: Color;
}

interface RouteState {
  snapshot: FlightRouteSnapshot | null;
  flightId: string | null;
}

const FLIGHT_LERP_FACTOR = 0.05;
const FLIGHT_STALE_TIMEOUT_MS = 60_000;
const FLIGHT_FADE_DURATION_MS = 2_000;

export class FlightSceneLayerManager {
  private readonly viewer: CesiumViewer;
  private readonly root: PrimitiveCollection;
  private readonly flightDots: PointPrimitiveCollection;
  private readonly flightBillboards: BillboardCollection;
  private readonly airportBillboards: BillboardCollection;
  private readonly routeAirportBillboards: BillboardCollection;
  private readonly flightLabels: LabelCollection;
  private readonly trailPolylines: PolylineCollection;
  private readonly routePolylines: PolylineCollection;
  private readonly flightEntries = new Map<string, FlightRenderEntry>();
  private readonly selectedTrailSegments: Polyline[] = [];
  private readonly selectedFlightLabel: Label;
  private readonly routeArcPolyline: Polyline;
  private selectedTrailAbortController: AbortController | null = null;
  private selectedTrailRequestToken = 0;
  private activeTrailFlightId: string | null = null;
  private activeTrailAltitudesMeters: number[] = [];
  private activeTrailPositions: Cartesian3[] = [];
  private activeTrailLastAnchorTimestamp: number | null = null;
  private activeTrailHasGluePoint = false;
  private flightsVisible = false;
  private airportsVisible = false;
  private renderMode: FlightRenderMode = 'dot';
  private selectedFlightId: string | null = null;
  private showSelectedTrail = false;
  private routeState: RouteState = {
    snapshot: null,
    flightId: null,
  };
  private tickFrame = 0;

  constructor(viewer: CesiumViewer) {
    this.viewer = viewer;
    this.root = new PrimitiveCollection();
    this.flightDots = this.root.add(new PointPrimitiveCollection()) as PointPrimitiveCollection;
    this.flightBillboards = this.root.add(new BillboardCollection()) as BillboardCollection;
    this.airportBillboards = this.root.add(new BillboardCollection()) as BillboardCollection;
    this.routeAirportBillboards = this.root.add(new BillboardCollection()) as BillboardCollection;
    this.flightLabels = this.root.add(new LabelCollection()) as LabelCollection;
    this.trailPolylines = this.root.add(new PolylineCollection()) as PolylineCollection;
    this.routePolylines = this.root.add(new PolylineCollection()) as PolylineCollection;

    this.selectedFlightLabel = this.flightLabels.add({
      show: false,
      position: Cartesian3.ZERO,
      font: '600 12px "Segoe UI", "Helvetica Neue", Arial, sans-serif',
      fillColor: Color.WHITE,
      outlineColor: Color.fromCssColorString('#0b1020'),
      outlineWidth: 1,
      style: LabelStyle.FILL_AND_OUTLINE,
      showBackground: true,
      backgroundColor: Color.fromCssColorString('#0d1324').withAlpha(0.82),
      backgroundPadding: new Cartesian2(10, 6),
      pixelOffset: new Cartesian2(0, -52),
      verticalOrigin: VerticalOrigin.BOTTOM,
      horizontalOrigin: HorizontalOrigin.CENTER,
    });

    this.routeArcPolyline = this.routePolylines.add({
      show: false,
      width: 4.2,
      material: Material.fromType(Material.ColorType, {
        color: Color.fromCssColorString('#85c6ff').withAlpha(0.72),
      }),
      positions: [],
    });

    this.airportBillboards.show = false;
    this.routeAirportBillboards.show = true;

    this.viewer.scene.primitives.add(this.root);
  }

  destroy() {
    this.selectedTrailAbortController?.abort();
    if (!this.viewer.isDestroyed()) {
      this.viewer.scene.primitives.remove(this.root);
      this.viewer.scene.requestRender();
    }
  }

  setFlightsVisible(visible: boolean) {
    this.flightsVisible = visible;
    this.flightDots.show = visible;
    this.flightBillboards.show = visible;
    this.updateTrailSegmentVisibility();
    this.refreshSelectionOverlays();
    this.requestRender();
  }

  setFlightRenderMode(mode: FlightRenderMode) {
    this.renderMode = mode;
    this.refreshFlightVisuals();
    this.requestRender();
  }

  setSelectedFlightId(flightId: string | null) {
    this.selectedFlightId = flightId;
    this.refreshFlightVisuals();
    this.refreshSelectionOverlays();
    const wantsTrail = this.showSelectedTrail || Boolean(this.routeState.flightId);
    this.updateSelectedTrail(wantsTrail ? flightId : null);
    this.requestRender();
  }

  setShowSelectedTrail(show: boolean) {
    this.showSelectedTrail = show;
    const wantsTrail = show || Boolean(this.routeState.flightId);
    this.updateSelectedTrail(wantsTrail ? this.selectedFlightId : null);
    this.updateTrailSegmentVisibility();
    this.requestRender();
  }

  updateSelectedTrail(flightId: string | null) {
    this.selectedTrailRequestToken += 1;
    const requestToken = this.selectedTrailRequestToken;

    this.selectedTrailAbortController?.abort();
    this.selectedTrailAbortController = null;
    this.clearSelectedTrail();

    if (!flightId) {
      return;
    }

    const normalizedFlightId = String(flightId).trim().toLowerCase();
    if (!normalizedFlightId) {
      return;
    }

    const controller = new AbortController();
    this.selectedTrailAbortController = controller;

    fetchFlightTrace(normalizedFlightId, controller.signal)
      .then((payload) => {
        if (
          requestToken !== this.selectedTrailRequestToken ||
          !(this.showSelectedTrail || this.routeState.flightId === normalizedFlightId) ||
          this.selectedFlightId !== normalizedFlightId
        ) {
          return;
        }

        if (!payload.found || payload.path.length === 0) {
          return;
        }

        const trailData = buildOpenSkyTrailData(payload.path);
        if (trailData.positions.length < 2) {
          return;
        }

        this.activeTrailFlightId = normalizedFlightId;
        this.activeTrailPositions = trailData.positions;
        this.activeTrailAltitudesMeters = trailData.altitudesMeters;
        this.activeTrailLastAnchorTimestamp = null;
        this.activeTrailHasGluePoint = false;

        const selectedEntry = this.flightEntries.get(normalizedFlightId) ?? null;
        if (selectedEntry) {
          this.promoteSelectedTrailLiveAnchor(selectedEntry);
        } else {
          this.rebuildSelectedTrailSegments(null);
        }
        this.requestRender();
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return;
        }

        console.warn('[Explorer] Failed to load selected flight trail:', error);

        if (requestToken === this.selectedTrailRequestToken) {
          this.clearSelectedTrail();
        }
      })
      .finally(() => {
        if (this.selectedTrailAbortController === controller) {
          this.selectedTrailAbortController = null;
        }
      });
  }

  syncFlights(flights: FlightRecord[]) {
    const nowMs = Date.now();
    const nowSeconds = nowMs / 1000;

    for (const flight of flights) {
      let entry = this.flightEntries.get(flight.id);
      if (!entry) {
        const initialPosition = buildFlightApiCartesian(flight);
        entry = {
          dot: this.flightDots.add({
            id: { kind: 'flight', flightId: flight.id } satisfies FlightPickId,
            position: initialPosition,
          }),
          icon: this.flightBillboards.add({
            id: { kind: 'flight', flightId: flight.id } satisfies FlightPickId,
            position: initialPosition,
            alignedAxis: Cartesian3.ZERO,
            verticalOrigin: VerticalOrigin.CENTER,
            horizontalOrigin: HorizontalOrigin.CENTER,
            scaleByDistance: new NearFarScalar(5_000, 1.1, 20_000_000, 0.48),
          }),
          flight,
          sharedFramePosition: Cartesian3.clone(initialPosition),
          confirmedApiPosition: Cartesian3.clone(initialPosition),
          targetApiPosition: Cartesian3.clone(initialPosition),
          correctionVector: new Cartesian3(),
          targetLatitude: flight.latitude,
          targetLongitude: flight.longitude,
          targetAltitudeMeters: Math.max(0, flight.altitudeMeters),
          lastUpdatedMs: nowMs,
          fadeStartedAtMs: null,
          currentOpacity: 1,
          dotBaseColor: Color.clone(Color.WHITE, new Color()),
          dotOutlineBaseColor: Color.clone(Color.WHITE, new Color()),
          iconBaseColor: Color.clone(Color.WHITE, new Color()),
        };
        this.flightEntries.set(flight.id, entry);
      }

      const confirmedApiPosition = buildFlightApiCartesian(flight);
      Cartesian3.clone(confirmedApiPosition, entry.confirmedApiPosition);
      entry.flight = flight;
      entry.lastUpdatedMs = nowMs;
      entry.fadeStartedAtMs = null;
      if (entry.currentOpacity !== 1) {
        entry.currentOpacity = 1;
      }

      // --- Error Vector Decay (true zero-jump kinematics) ---
      // Project the new API position forward to right now, giving us the best
      // estimate of where the plane physically is at this instant.
      this.updateTargetApiPosition(entry, nowSeconds);

      // Absorb any gap between the current rendered position and the projected
      // target into correctionVector. Because sharedFramePosition was the
      // rendered position on the PREVIOUS frame, the plane does NOT jump at
      // all on this update frame:
      //   sharedFramePosition = targetApiPosition + correctionVector
      //                       = targetApiPosition + (prev_rendered - targetApiPosition)
      //                       = prev_rendered  ← zero pixel movement on update frame
      // The correctionVector decays to zero over the next ~1 second at
      // FLIGHT_LERP_FACTOR per frame, bleeding off any overshoot invisibly.
      Cartesian3.subtract(
        entry.sharedFramePosition,
        entry.targetApiPosition,
        entry.correctionVector,
      );

      this.applyFlightVisual(entry, flight);
    }

    if (this.showSelectedTrail && this.selectedFlightId) {
      const selectedEntry = this.flightEntries.get(this.selectedFlightId) ?? null;
      if (selectedEntry) {
        this.promoteSelectedTrailLiveAnchor(selectedEntry);
      }
    }

    this.refreshSelectionOverlays();
    this.refreshRouteOverlay();
    this.requestRender();
  }

  setGlobalAirports(airports: AirportRecord[]) {
    this.airportBillboards.removeAll();

    for (const airport of airports) {
      const appearance = getAirportAppearance(airport);
      this.airportBillboards.add({
        id: { kind: 'airport', airportId: airport.id } satisfies AirportPickId,
        image: appearance.image,
        position: Cartesian3.fromDegrees(airport.longitude, airport.latitude, 0),
        verticalOrigin: VerticalOrigin.BOTTOM,
        horizontalOrigin: HorizontalOrigin.CENTER,
        width: appearance.size,
        height: appearance.size,
        scaleByDistance: appearance.scaleByDistance,
        distanceDisplayCondition: appearance.distanceDisplayCondition,
        color: appearance.color,
      });
    }

    this.airportBillboards.show = this.airportsVisible;
    this.requestRender();
  }

  setAirportsVisible(visible: boolean) {
    this.airportsVisible = visible;
    this.airportBillboards.show = visible;
    this.requestRender();
  }

  setTrackedRoute(snapshot: FlightRouteSnapshot | null, flightId: string | null) {
    this.routeState = { snapshot, flightId };
    const wantsTrail = this.showSelectedTrail || Boolean(flightId);
    this.updateSelectedTrail(wantsTrail ? this.selectedFlightId : null);
    this.refreshRouteOverlay();
    this.updateTrailSegmentVisibility();
    this.requestRender();
  }

  pickFlight(windowPosition: Cartesian2) {
    const picked = this.viewer.scene.pick(windowPosition);
    const pickedId = this.extractPickId(picked);
    if (isFlightPickId(pickedId)) {
      return pickedId.flightId;
    }

    return null;
  }

  tickPositions(): void {
    if (this.flightEntries.size === 0) return;

    const nowMs = Date.now();
    const nowSeconds = nowMs / 1000;
    const viewRectangle = this.flightsVisible
      ? this.viewer.camera.computeViewRectangle(this.viewer.scene.globe.ellipsoid)
      : null;
    const cameraHeading = this.viewer.camera.heading;
    const entriesToRemove: string[] = [];
    this.tickFrame += 1;

    for (const [flightId, entry] of this.flightEntries.entries()) {
      this.updateTargetApiPosition(entry, nowSeconds);

      const staleForMs = nowMs - entry.lastUpdatedMs;
      if (staleForMs > FLIGHT_STALE_TIMEOUT_MS) {
        if (!entry.fadeStartedAtMs) {
          entry.fadeStartedAtMs = nowMs;
        }

        const nextOpacity = clamp01(
          1 - (nowMs - entry.fadeStartedAtMs) / FLIGHT_FADE_DURATION_MS,
        );
        if (nextOpacity !== entry.currentOpacity) {
          entry.currentOpacity = nextOpacity;
          this.applyEntryOpacity(entry);
        }

        if (nextOpacity <= 0) {
          entriesToRemove.push(flightId);
          continue;
        }
      } else if (entry.currentOpacity !== 1) {
        entry.currentOpacity = 1;
        this.applyEntryOpacity(entry);
      }

      if (!this.flightsVisible) {
        continue;
      }

      const insideView = viewRectangle
        ? rectangleContainsLonLat(
            viewRectangle,
            entry.targetLongitude,
            entry.targetLatitude,
          )
        : true;

      if (insideView) {
        // Error Vector Decay per-frame step:
        // Lerp correctionVector toward zero at a constant rate, then add it
        // to the dead-reckoned target. The plane position never jumps;
        // it glides smoothly from the previous rendered location to the truth.
        Cartesian3.lerp(
          entry.correctionVector,
          Cartesian3.ZERO,
          FLIGHT_LERP_FACTOR,
          entry.correctionVector,
        );
        Cartesian3.add(
          entry.targetApiPosition,
          entry.correctionVector,
          entry.sharedFramePosition,
        );
      } else {
        Cartesian3.clone(entry.targetApiPosition, entry.sharedFramePosition);
        Cartesian3.clone(Cartesian3.ZERO, entry.correctionVector);
      }

      this.applyRenderedPosition(entry);
      const headingRad = (entry.flight.headingDegrees * Math.PI) / 180;
      entry.icon.rotation = cameraHeading - headingRad;

      if (
        this.showSelectedTrail &&
        this.activeTrailFlightId === flightId &&
        this.selectedFlightId === flightId
      ) {
        this.updateSelectedTrailGluePoint(entry);
      }

      // Refresh the future-path arc root every frame so it stays glued to the
      // plane's nose as it glides forward with Error Vector Decay.
      if (
        this.routeState.snapshot?.found &&
        this.routeState.flightId === flightId
      ) {
        this.refreshRouteOverlay();
      }
    }

    for (const flightId of entriesToRemove) {
      this.removeFlightEntry(flightId);
    }

    this.refreshSelectionOverlays();
    this.refreshRouteOverlay();
  }

  private extractPickId(picked: unknown) {
    if (!picked || typeof picked !== 'object') return null;

    if ('id' in picked) {
      return picked.id;
    }

    if (
      'primitive' in picked &&
      picked.primitive &&
      typeof picked.primitive === 'object' &&
      'id' in picked.primitive
    ) {
      return picked.primitive.id;
    }

    return null;
  }

  private updateTargetApiPosition(entry: FlightRenderEntry, nowSeconds: number) {
    const ageSeconds = Math.min(20, Math.max(0, nowSeconds - entry.flight.timestamp));
    const predicted = predictFlightPosition(entry.flight, ageSeconds);
    entry.targetLongitude = predicted.longitude;
    entry.targetLatitude = predicted.latitude;
    entry.targetAltitudeMeters = Math.max(0, predicted.altitudeMeters);

    Cartesian3.fromDegrees(
      entry.targetLongitude,
      entry.targetLatitude,
      entry.targetAltitudeMeters,
      undefined,
      entry.targetApiPosition,
    );
  }

  private applyRenderedPosition(entry: FlightRenderEntry) {
    entry.dot.position = entry.sharedFramePosition;
    entry.icon.position = entry.sharedFramePosition;
  }

  private applyFlightVisual(entry: FlightRenderEntry, flight: FlightRecord) {
    const isSelected = this.selectedFlightId === flight.id;
    const hasSelection = Boolean(this.selectedFlightId);
    const dimmed = hasSelection && !isSelected;
    const iconKey = getFlightIconKey(flight);
    const baseColor = Color.fromCssColorString(
      getFlightAltitudeColorCss(flight, isSelected),
    );
    const markerColor = dimmed
      ? new Color(baseColor.red, baseColor.green, baseColor.blue, 0.24)
      : isSelected
        ? new Color(baseColor.red, baseColor.green, baseColor.blue, 0.96)
        : new Color(baseColor.red, baseColor.green, baseColor.blue, 0.88);
    const outlineColor = isSelected
      ? Color.WHITE.withAlpha(0.9)
      : new Color(0.05, 0.08, 0.14, dimmed ? 0.12 : 0.36);
    const iconSize = getFlightIconDimensions(flight, isSelected);

    entry.dot.show = this.flightsVisible && this.renderMode === 'dot' && !isSelected;
    entry.dot.pixelSize = isSelected ? 13 : 7.5;
    entry.dot.outlineWidth = isSelected ? 2 : 1;

    entry.dotBaseColor = markerColor;
    entry.dotOutlineBaseColor = outlineColor;
    entry.iconBaseColor = markerColor;

    entry.icon.show = this.flightsVisible && (this.renderMode === 'icon' || isSelected);
    entry.icon.image = getFlightIconImage(iconKey);
    entry.icon.width = iconSize.width;
    entry.icon.height = iconSize.height;

    this.applyEntryOpacity(entry);
  }

  private applyEntryOpacity(entry: FlightRenderEntry) {
    entry.dot.color = cloneColorWithOpacity(entry.dotBaseColor, entry.currentOpacity);
    entry.dot.outlineColor = cloneColorWithOpacity(
      entry.dotOutlineBaseColor,
      entry.currentOpacity,
    );
    entry.icon.color = cloneColorWithOpacity(entry.iconBaseColor, entry.currentOpacity);
  }

  private refreshFlightVisuals() {
    for (const entry of this.flightEntries.values()) {
      this.applyFlightVisual(entry, entry.flight);
    }
  }

  private refreshSelectionOverlays() {
    const selectedEntry = this.selectedFlightId
      ? this.flightEntries.get(this.selectedFlightId) ?? null
      : null;
    const showLabel = this.flightsVisible && Boolean(selectedEntry);

    if (!selectedEntry || !showLabel) {
      this.selectedFlightLabel.show = false;
      return;
    }

    this.selectedFlightLabel.show = true;
    this.selectedFlightLabel.text = getFlightDisplayName(selectedEntry.flight);
    this.selectedFlightLabel.position = selectedEntry.sharedFramePosition;
  }

  private refreshRouteOverlay() {
    const { snapshot, flightId } = this.routeState;
    const trackedEntry = flightId ? this.flightEntries.get(flightId) ?? null : null;

    if (!snapshot?.found || !snapshot.destination || !trackedEntry) {
      this.routeArcPolyline.show = false;
      this.routeArcPolyline.positions = [];
      this.routeAirportBillboards.removeAll();
      return;
    }

    // Build the parabolic future-path arc from the plane's exact rendered
    // position (sharedFramePosition) to the destination airport.
    const arcPositions = buildFutureArcPositions(
      trackedEntry.sharedFramePosition,
      snapshot.destination,
      trackedEntry.flight.altitudeMeters,
    );
    this.routeArcPolyline.show = arcPositions.length > 1;
    this.routeArcPolyline.positions = arcPositions;

    // Keep destination pin; origin is covered by the snail trail.
    this.routeAirportBillboards.removeAll();
    this.routeAirportBillboards.add({
      image: DESTINATION_AIRPORT_ICON_IMAGE,
      position: Cartesian3.fromDegrees(
        snapshot.destination.longitude,
        snapshot.destination.latitude,
        0,
      ),
      verticalOrigin: VerticalOrigin.BOTTOM,
      horizontalOrigin: HorizontalOrigin.CENTER,
      width: 24,
      height: 24,
      scaleByDistance: new NearFarScalar(20_000, 1.16, 15_000_000, 0.32),
      color: Color.fromCssColorString('#ffc09b'),
    });

    this.selectedFlightLabel.text = getFlightDisplayName(trackedEntry.flight);
  }

  private requestRender() {
    if (!this.viewer.isDestroyed()) {
      this.viewer.scene.requestRender();
    }
  }

  private clearSelectedTrail() {
    this.activeTrailFlightId = null;
    this.activeTrailAltitudesMeters = [];
    this.activeTrailPositions = [];
    this.activeTrailLastAnchorTimestamp = null;
    this.activeTrailHasGluePoint = false;
    while (this.selectedTrailSegments.length > 0) {
      const segment = this.selectedTrailSegments.pop();
      if (segment) {
        this.trailPolylines.remove(segment);
      }
    }
    this.requestRender();
  }

  private rebuildSelectedTrailSegments(referenceFlight: FlightRecord | null) {
    while (this.selectedTrailSegments.length > 0) {
      const segment = this.selectedTrailSegments.pop();
      if (segment) {
        this.trailPolylines.remove(segment);
      }
    }

    if (this.activeTrailPositions.length < 2) {
      return;
    }

    for (let index = 1; index < this.activeTrailPositions.length; index += 1) {
      this.selectedTrailSegments.push(
        this.trailPolylines.add({
          show: this.flightsVisible && (this.showSelectedTrail || Boolean(this.routeState.flightId)),
          width: 3,
          positions: [
            this.activeTrailPositions[index - 1],
            this.activeTrailPositions[index],
          ],
          material: Material.fromType(Material.ColorType, {
            color: getTrailSegmentColor(
              referenceFlight,
              this.activeTrailAltitudesMeters[index],
            ),
          }),
        }),
      );
    }
  }

  private promoteSelectedTrailLiveAnchor(entry: FlightRenderEntry) {
    if (this.activeTrailFlightId !== entry.flight.id) {
      return;
    }

    if (this.activeTrailPositions.length === 0) {
      return;
    }

    if (this.activeTrailLastAnchorTimestamp === entry.flight.timestamp) {
      return;
    }

    const confirmedAltitude = Math.max(0, entry.flight.altitudeMeters);

    if (!this.activeTrailHasGluePoint) {
      this.activeTrailPositions.push(Cartesian3.clone(entry.confirmedApiPosition));
      this.activeTrailAltitudesMeters.push(confirmedAltitude);
      this.activeTrailPositions.push(Cartesian3.clone(entry.sharedFramePosition));
      this.activeTrailAltitudesMeters.push(confirmedAltitude);
      this.activeTrailHasGluePoint = true;
    } else {
      const currentGlueIndex = this.activeTrailPositions.length - 1;
      this.activeTrailPositions[currentGlueIndex] = Cartesian3.clone(entry.confirmedApiPosition);
      this.activeTrailAltitudesMeters[currentGlueIndex] = confirmedAltitude;
      this.activeTrailPositions.push(Cartesian3.clone(entry.sharedFramePosition));
      this.activeTrailAltitudesMeters.push(confirmedAltitude);
    }

    this.activeTrailLastAnchorTimestamp = entry.flight.timestamp;
    this.rebuildSelectedTrailSegments(entry.flight);
    this.updateSelectedTrailGluePoint(entry);
    this.requestRender();
  }

  private updateSelectedTrailGluePoint(entry: FlightRenderEntry) {
    if (
      this.activeTrailFlightId !== entry.flight.id ||
      !this.activeTrailHasGluePoint ||
      this.activeTrailPositions.length < 2 ||
      this.selectedTrailSegments.length === 0
    ) {
      return;
    }

    const glueIndex = this.activeTrailPositions.length - 1;
    const altitudeMeters = Math.max(0, getRenderedFlightState(entry).altitudeMeters);

    Cartesian3.clone(entry.sharedFramePosition, this.activeTrailPositions[glueIndex]);
    this.activeTrailAltitudesMeters[glueIndex] = altitudeMeters;

    const lastSegment = this.selectedTrailSegments[this.selectedTrailSegments.length - 1];
    lastSegment.positions = [
      this.activeTrailPositions[glueIndex - 1],
      this.activeTrailPositions[glueIndex],
    ];
    lastSegment.material = Material.fromType(Material.ColorType, {
      color: getTrailSegmentColor(entry.flight, altitudeMeters),
    });
  }

  private updateTrailSegmentVisibility() {
    const show = this.flightsVisible && (this.showSelectedTrail || Boolean(this.routeState.flightId));
    for (const segment of this.selectedTrailSegments) {
      segment.show = show;
    }
  }

  private removeFlightEntry(flightId: string) {
    const entry = this.flightEntries.get(flightId);
    if (!entry) {
      return;
    }

    this.flightDots.remove(entry.dot);
    this.flightBillboards.remove(entry.icon);
    this.flightEntries.delete(flightId);

    if (this.activeTrailFlightId === flightId) {
      this.clearSelectedTrail();
    }

    if (this.routeState.flightId === flightId) {
      this.routeState = {
        snapshot: null,
        flightId: null,
      };
      this.refreshRouteOverlay();
    }

    if (this.selectedFlightId === flightId) {
      this.selectedFlightId = null;
      this.selectedFlightLabel.show = false;
    }
  }
}

function buildOpenSkyTrailData(path: Array<{
  latitude: number;
  longitude: number;
  baroAltitudeMeters: number;
}>) {
  const flatArray: number[] = [];
  const altitudesMeters: number[] = [];

  for (const point of path) {
    const altitudeMeters = Math.max(0, point.baroAltitudeMeters);
    flatArray.push(point.longitude, point.latitude, altitudeMeters);
    altitudesMeters.push(altitudeMeters);
  }

  return {
    positions: Cartesian3.fromDegreesArrayHeights(flatArray),
    altitudesMeters,
  };
}

function buildFlightApiCartesian(flight: FlightRecord) {
  return Cartesian3.fromDegrees(
    flight.longitude,
    flight.latitude,
    Math.max(0, flight.altitudeMeters),
  );
}

function getRenderedFlightState(entry: FlightRenderEntry) {
  const cartographic = Cartographic.fromCartesian(entry.sharedFramePosition);
  if (!cartographic) {
    return {
      latitude: entry.targetLatitude,
      longitude: entry.targetLongitude,
      altitudeMeters: entry.targetAltitudeMeters,
    };
  }

  return {
    latitude: CesiumMath.toDegrees(cartographic.latitude),
    longitude: CesiumMath.toDegrees(cartographic.longitude),
    altitudeMeters: Math.max(0, cartographic.height),
  };
}

function getTrailSegmentColor(referenceFlight: FlightRecord | null, altitudeMeters: number) {
  if (!referenceFlight) {
    return Color.CYAN.withAlpha(0.8);
  }

  const css = getFlightAltitudeColorCss(
    {
      ...referenceFlight,
      altitudeMeters,
    },
    false,
  );

  return Color.fromCssColorString(css).withAlpha(0.8);
}

/**
 * Parabolic Future-Path Arc
 *
 * Draws a geodesic arc from the aircraft's current rendered position
 * (startCartesian) to the destination airport, curving up then back
 * down with a parabolic altitude envelope.
 *
 * @param startCartesian   - The plane's sharedFramePosition (live, 60fps)
 * @param destination      - Destination airport record
 * @param planeAltitudeM   - Current aircraft altitude in metres (for arc start)
 * @param segments         - Number of polyline segments (default 64)
 */
function buildFutureArcPositions(
  startCartesian: Cartesian3,
  destination: AirportRecord,
  planeAltitudeM: number,
  segments = 64,
): Cartesian3[] {
  const startCarto = Cartographic.fromCartesian(startCartesian);
  if (!startCarto) return [];

  const destCarto = Cartographic.fromDegrees(
    destination.longitude,
    destination.latitude,
    0,
  );

  const geodesic = new EllipsoidGeodesic(startCarto, destCarto);
  const surfaceDistM = Number.isFinite(geodesic.surfaceDistance)
    ? geodesic.surfaceDistance
    : 0;

  if (surfaceDistM < 100) return []; // plane is already at/past destination

  // Arc peak: 10 % of remaining surface distance, clamped between 8 km and 280 km.
  const maxArcHeightM = Math.min(280_000, Math.max(8_000, surfaceDistM * 0.1));
  const startAltM = Math.max(0, planeAltitudeM);

  const positions: Cartesian3[] = [];

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;

    // Surface position along the geodesic.
    const surfacePoint = geodesic.interpolateUsingFraction(t);

    // Linearly interpolate base altitude from plane altitude down to 0.
    const baseAltM = startAltM * (1 - t);

    // Parabolic arch peaks at t=0.5. At t=0 and t=1 the offset is 0.
    const parabolaM = 4 * maxArcHeightM * t * (1 - t);

    const finalAltM = baseAltM + parabolaM;

    positions.push(
      Cartesian3.fromRadians(
        surfacePoint.longitude,
        surfacePoint.latitude,
        finalAltM,
      ),
    );
  }

  return positions;
}

function getAirportAppearance(airport: AirportRecord) {
  switch (airport.type) {
    case 'large_airport':
      return {
        image: AIRPORT_ICON_IMAGE,
        size: 18,
        color: Color.fromCssColorString('#a6e5ff').withAlpha(0.86),
        scaleByDistance: new NearFarScalar(30_000, 1.12, 15_000_000, 0.26),
        distanceDisplayCondition: new DistanceDisplayCondition(0, 25_000_000),
      };
    case 'medium_airport':
      return {
        image: MEDIUM_AIRPORT_ICON_IMAGE,
        size: 14,
        color: Color.fromCssColorString('#ffd37f').withAlpha(0.82),
        scaleByDistance: new NearFarScalar(20_000, 0.96, 8_000_000, 0.2),
        distanceDisplayCondition: new DistanceDisplayCondition(0, 8_500_000),
      };
    case 'small_airport':
      return {
        image: SMALL_AIRPORT_ICON_IMAGE,
        size: 10,
        color: Color.fromCssColorString('#8ef0a5').withAlpha(0.86),
        scaleByDistance: new NearFarScalar(15_000, 0.84, 2_500_000, 0.14),
        distanceDisplayCondition: new DistanceDisplayCondition(0, 2_800_000),
      };
    default:
      return {
        image: AUX_AIRPORT_ICON_IMAGE,
        size: 8,
        color: Color.fromCssColorString('#d9b7ff').withAlpha(0.72),
        scaleByDistance: new NearFarScalar(12_000, 0.7, 1_000_000, 0.1),
        distanceDisplayCondition: new DistanceDisplayCondition(0, 1_200_000),
      };
  }
}

function rectangleContainsLonLat(
  rectangle: { west: number; east: number; south: number; north: number },
  longitudeDegrees: number,
  latitudeDegrees: number,
) {
  const west = CesiumMath.toDegrees(rectangle.west);
  const east = CesiumMath.toDegrees(rectangle.east);
  const south = CesiumMath.toDegrees(rectangle.south);
  const north = CesiumMath.toDegrees(rectangle.north);

  if (latitudeDegrees < south || latitudeDegrees > north) {
    return false;
  }

  if (west <= east) {
    return longitudeDegrees >= west && longitudeDegrees <= east;
  }

  return longitudeDegrees >= west || longitudeDegrees <= east;
}

function cloneColorWithOpacity(color: Color, opacity: number) {
  return new Color(color.red, color.green, color.blue, color.alpha * opacity);
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function isFlightPickId(value: unknown): value is FlightPickId {
  return Boolean(
    value &&
    typeof value === 'object' &&
    'kind' in value &&
    'flightId' in value &&
    value.kind === 'flight' &&
    typeof value.flightId === 'string',
  );
}

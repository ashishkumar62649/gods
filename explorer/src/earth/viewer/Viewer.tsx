import { useCallback, useEffect, useRef, useState } from 'react';
import {
  BoundingSphere,
  Cartesian3,
  Cesium3DTileset,
  IonGeocoderService,
  ImageryLayer,
  Math as CesiumMath,
  Matrix4,
  Rectangle,
  Viewer as CesiumViewer,
} from 'cesium';
import { CesiumComponentRef, Viewer as ResiumViewer } from 'resium';
import SearchBox from '../search/SearchBox';
import FlightDeckHud from '../flights/ui/FlightDeckHud';
import FlightDetailsPanel from '../flights/ui/FlightDetailsPanel';
import {
  AviationGridState,
  FlightAssetView,
  FlightSceneLayerManager,
  GroundStationsState,
  FlightSensorLinkState,
} from '../flights/flightLayers';
import {
  AirportRecord,
  FlightRecord,
} from '../flights/flights';
import {
  buildHome,
  flyObliqueToDestination,
  getCameraCartographic,
  getCockpitCameraPose,
  getFlightCameraOffset,
  getFlightCameraTarget,
} from './cameraUtils';
import DevStatusPanel from './DevStatusPanel';
import ImageryFlyout from './ImageryFlyout';
import { buildImageryOptions } from './imageryOptions';
import LayerSidebar from './LayerSidebar';
import { useBuildingsTileset } from './useBuildingsTileset';
import { useFlightData } from './useFlightData';
import { useFlightScene } from './useFlightScene';
import {
  type CockpitPointerState,
  useInteractionGuards,
} from './useInteractionGuards';
import { useOrbitControls } from './useOrbitControls';
import { useViewerSetup } from './useViewerSetup';
import {
  BUILDINGS_ALTITUDE_THRESHOLD,
  COCKPIT_ENTRY_PITCH,
  COCKPIT_LOOK_SENSITIVITY,
  FLIGHT_EASING,
  INITIAL_AVIATION_GRID,
  SECTION_TABS,
  WORLD_TERRAIN,
} from './viewerConfig';
import type { ImageryOption, SidebarSection } from './viewerTypes';

/**
 * Camera-fix phase:
 *   - Always open framed over India (via DEFAULT_VIEW_RECTANGLE override).
 *   - Smoothly fly in to the exact home view on first mount.
 *   - Hide Cesium's built-in top-right Home button; render a custom one
 *     top-left that always returns to the same home view.
 */
export default function Viewer() {
  const viewerRef = useRef<CesiumComponentRef<CesiumViewer>>(null);
  const geocoderRef = useRef<IonGeocoderService | null>(null);
  const buildingsRef = useRef<Cesium3DTileset | null>(null);
  const flightLayerManagerRef = useRef<FlightSceneLayerManager | null>(null);
  const flightRecordsRef = useRef<Map<string, FlightRecord>>(new Map());
  const flightsEnabledRef = useRef(false);
  const aviationGridRef = useRef<AviationGridState>(INITIAL_AVIATION_GRID);
  const groundStationsRef = useRef<GroundStationsState>({
    hfdl: false,
    comms: false,
  });
  const selectedFlightIdRef = useRef<string | null>(null);
  const assetViewRef = useRef<FlightAssetView>('symbology');
  const sensorLinkRef = useRef<FlightSensorLinkState>('release');
  const cockpitPointerRef = useRef<CockpitPointerState>({
    active: false,
    pointerId: null as number | null,
    lastX: 0,
    lastY: 0,
    moved: false,
  });
  const showSelectedFlightTrailRef = useRef(false);
  const showSelectedFlightRouteRef = useRef(false);
  const airportsLoadedRef = useRef(false);
  const airportsLoadingRef = useRef(false);
  const airportRecordsCacheRef = useRef<AirportRecord[]>([]);
  const currentImageryLayersRef = useRef<ImageryLayer[]>([]);
  const hudRef = useRef<HTMLDivElement | null>(null);

  const [activeSection, setActiveSection] = useState<SidebarSection>('base');
  const [devStatusOpen, setDevStatusOpen] = useState(false);
  const [imageryOptions] = useState<ImageryOption[]>(buildImageryOptions);
  const [imageryPickerOpen, setImageryPickerOpen] = useState(false);
  const [selectedImageryId, setSelectedImageryId] = useState(() => {
    const options = buildImageryOptions();
    const preferredOption =
      options.find(
        (option) => option.name === 'Bing Maps Aerial with Labels',
      ) ?? options[0];

    return preferredOption?.id ?? '';
  });
  const [flightsEnabled, setFlightsEnabled] = useState(false);
  const [aviationGrid, setAviationGrid] = useState<AviationGridState>(INITIAL_AVIATION_GRID);
  const [isGridMenuOpen, setIsGridMenuOpen] = useState(false);
  const [groundStations, setGroundStations] = useState<GroundStationsState>({
    hfdl: false,
    comms: false,
  });
  const [sigintInfrastructureOpen, setSigintInfrastructureOpen] = useState(true);
  const [selectedFlightId, setSelectedFlightId] = useState<string | null>(null);
  const [assetView, setAssetView] = useState<FlightAssetView>('symbology');
  const [sensorLink, setSensorLink] = useState<FlightSensorLinkState>('release');
  const [selectedFlight, setSelectedFlight] = useState<FlightRecord | null>(null);
  const [showSelectedFlightTrail, setShowSelectedFlightTrail] = useState(false);
  const [showSelectedFlightRoute, setShowSelectedFlightRoute] = useState(false);

  // User toggle state for the buildings layer. Effective visibility is
  // `buildingsEnabled && altitudeOK` Ã¢â‚¬â€ the altitude gate lives in the
  // camera-changed listener below.
  const [buildingsEnabled, setBuildingsEnabled] = useState(false);
  // Ref mirror so the camera-changed listener can read the latest value
  // without being recreated on every toggle.
  const buildingsEnabledRef = useRef(buildingsEnabled);
  // Temporary buildings mode for landmark auto-orbit. This should not
  // overwrite the user's manual Buildings preference.
  const [autoBuildingsEnabled, setAutoBuildingsEnabled] = useState(false);
  const autoBuildingsEnabledRef = useRef(false);

  const applyImageryOption = useCallback((nextOption: ImageryOption) => {
    const viewer = viewerRef.current?.cesiumElement;
    if (!viewer || viewer.isDestroyed()) return;

    try {
      const imageryLayers = viewer.imageryLayers;

      for (const layer of currentImageryLayersRef.current) {
        for (let i = 0; i < imageryLayers.length; i += 1) {
          const imageryLayer = imageryLayers.get(i);
          if (imageryLayer === layer) {
            imageryLayers.remove(layer);
            break;
          }
        }
      }

      if (!currentImageryLayersRef.current.length && imageryLayers.length > 0) {
        imageryLayers.remove(imageryLayers.get(0));
      }

      const createdProviders = nextOption.create();
      const providerList = Array.isArray(createdProviders)
        ? createdProviders
        : [createdProviders];
      const nextLayers: ImageryLayer[] = [];

      for (let i = providerList.length - 1; i >= 0; i -= 1) {
        const layer = ImageryLayer.fromProviderAsync(providerList[i]);
        imageryLayers.add(layer, 0);
        nextLayers.push(layer);
      }

      currentImageryLayersRef.current = nextLayers;
      setSelectedImageryId(nextOption.id);
      setImageryPickerOpen(false);
      viewer.scene.requestRender();
    } catch (err) {
      console.error('[Explorer] Failed to switch imagery option:', err);
    }
  }, []);
  /**
   * Compute and apply the buildings tileset's effective `.show` based on
   * both inputs: user toggle and current camera altitude. Called from the
   * camera-changed listener and from the toggle handler.
   */
  const updateBuildingsVisibility = useCallback(() => {
    const viewer = viewerRef.current?.cesiumElement;
    const tileset = buildingsRef.current;
    if (!viewer || !tileset) return;
    const cameraCartographic = getCameraCartographic(viewer);
    const altitude = cameraCartographic?.height ?? Number.POSITIVE_INFINITY;
    const altitudeOK = altitude < BUILDINGS_ALTITUDE_THRESHOLD;
    tileset.show =
      (buildingsEnabledRef.current || autoBuildingsEnabledRef.current) &&
      altitudeOK;
    // Force a repaint. Without this, the toggle's effect on `tileset.show`
    // isn't reflected until the next camera event fires, so the first click
    // appears to do nothing and users need a second click to see it.
    viewer.scene.requestRender();
  }, []);

  const setAutoBuildingsMode = useCallback((enabled: boolean) => {
    autoBuildingsEnabledRef.current = enabled;
    setAutoBuildingsEnabled(enabled);
    updateBuildingsVisibilityRef.current();
  }, []);

  const selectedImageryOption =
    imageryOptions.find((option) => option.id === selectedImageryId) ??
    imageryOptions[0] ??
    null;

  const updateSelectedFlight = useCallback((flightId: string | null) => {
    selectedFlightIdRef.current = flightId;
    setSelectedFlightId(flightId);
    setSelectedFlight(flightId ? flightRecordsRef.current.get(flightId) ?? null : null);
  }, []);

  const releaseSensorLink = useCallback(() => {
    sensorLinkRef.current = 'release';
    setSensorLink('release');
    flightLayerManagerRef.current?.setSensorLinkState('release');
    cockpitPointerRef.current.active = false;
    cockpitPointerRef.current.pointerId = null;
    cockpitPointerRef.current.moved = false;

    const viewer = viewerRef.current?.cesiumElement;
    if (viewer && !viewer.isDestroyed()) {
      const ctrl = viewer.scene.screenSpaceCameraController;
      ctrl.enableRotate = true;
      ctrl.enableTranslate = true;
      ctrl.enableZoom = true;
      ctrl.enableTilt = true;
      ctrl.enableLook = true;
      viewer.scene.requestRender();
    }
  }, []);


  const focusFlight = useCallback(
    (
      flight: FlightRecord,
      options?: {
        duration?: number;
        secondsAhead?: number;
        complete?: () => void;
      },
    ) => {
      const viewer = viewerRef.current?.cesiumElement;
      if (!viewer || viewer.isDestroyed()) return;

      const target = getFlightCameraTarget(
        flight,
        options?.secondsAhead ?? 0,
      );
      const offset = getFlightCameraOffset(viewer, target);

      viewer.camera.lookAtTransform(Matrix4.IDENTITY);
      viewer.camera.flyToBoundingSphere(new BoundingSphere(target, 1), {
        duration: options?.duration ?? 1.7,
        offset,
        easingFunction: FLIGHT_EASING,
        complete: options?.complete,
      });
    },
    [],
  );

  const syncFlightLayers = useCallback((flights: FlightRecord[]) => {
    flightRecordsRef.current.clear();

    for (const flight of flights) {
      flightRecordsRef.current.set(flight.id_icao, flight);
    }

    if (selectedFlightIdRef.current && !flightRecordsRef.current.has(selectedFlightIdRef.current)) {
      updateSelectedFlight(null);
    } else if (selectedFlightIdRef.current) {
      setSelectedFlight(
        flightRecordsRef.current.get(selectedFlightIdRef.current) ?? null,
      );
    }

    flightLayerManagerRef.current?.syncFlights(flights);
  }, [updateSelectedFlight]);

  const {
    airportLayerMessage,
    flightFeed,
    selectedFlightRoute,
    selectedFlightRouteRef,
  } = useFlightData({
    flightsEnabled,
    aviationGrid,
    groundStations,
    showSelectedFlightRoute,
    selectedFlightId,
    syncFlightLayers,
    flightLayerManagerRef,
    flightRecordsRef,
    airportsLoadedRef,
    airportsLoadingRef,
    airportRecordsCacheRef,
  });

  useFlightScene({
    viewerRef,
    flightLayerManagerRef,
    flightRecordsRef,
    airportRecordsCacheRef,
    selectedFlightRouteRef,
    flightsEnabledRef,
    aviationGridRef,
    groundStationsRef,
    assetViewRef,
    sensorLinkRef,
    selectedFlightIdRef,
    showSelectedFlightTrailRef,
    showSelectedFlightRouteRef,
    flightsEnabled,
    aviationGrid,
    groundStations,
    assetView,
    sensorLink,
    selectedFlightId,
    showSelectedFlightTrail,
    updateSelectedFlight,
  });

  const toggleFlights = useCallback(() => {
    const nextEnabled = !flightsEnabledRef.current;
    flightsEnabledRef.current = nextEnabled;
    setFlightsEnabled(nextEnabled);
    flightLayerManagerRef.current?.setFlightsVisible(nextEnabled);

    if (!nextEnabled) {
      releaseSensorLink();
      updateSelectedFlight(null);
    }
  }, [releaseSensorLink, updateSelectedFlight]);

  const toggleAviationGridCategory = useCallback((layer: keyof AviationGridState) => {
    setAviationGrid((current) => ({
      ...current,
      [layer]: !current[layer],
    }));
  }, []);

  const toggleGroundStationLayer = useCallback((layer: keyof GroundStationsState) => {
    setGroundStations((current) => ({
      ...current,
      [layer]: !current[layer],
    }));
  }, []);

  const toggleSelectedFlightRoute = useCallback(() => {
    setShowSelectedFlightRoute((enabled) => !enabled);
  }, []);

  const handleImageryOptionChange = useCallback(
    (nextOption: ImageryOption) => {
      if (nextOption.id === selectedImageryId) {
        setImageryPickerOpen(false);
        return;
      }

      applyImageryOption(nextOption);
    },
    [applyImageryOption, selectedImageryId],
  );

  const toggleBuildings = useCallback(() => {
    const nextEnabled =
      !(buildingsEnabledRef.current || autoBuildingsEnabledRef.current);

    autoBuildingsEnabledRef.current = false;
    buildingsEnabledRef.current = nextEnabled;
    setAutoBuildingsEnabled(false);
    setBuildingsEnabled(nextEnabled);
    updateBuildingsVisibilityRef.current();
  }, []);

  // Keep the ref mirror in sync and re-apply visibility whenever the user
  // toggles (so the tileset hides/shows immediately).
  useEffect(() => {
    buildingsEnabledRef.current = buildingsEnabled;
    updateBuildingsVisibility();
  }, [buildingsEnabled, updateBuildingsVisibility]);

  // Ref wrapper around updateBuildingsVisibility so the dedicated buildings-
  // load effect can call it without depending on its identity (which would
  // otherwise re-run the whole load effect).
  const updateBuildingsVisibilityRef = useRef<() => void>(() => { });
  useEffect(() => {
    updateBuildingsVisibilityRef.current = updateBuildingsVisibility;
  }, [updateBuildingsVisibility]);

  useBuildingsTileset({
    viewerRef,
    buildingsRef,
    updateBuildingsVisibilityRef,
  });

  useViewerSetup({
    viewerRef,
    geocoderRef,
    updateBuildingsVisibility,
  });

  const {
    orbitEnabled,
    cancelAutoLandmarkExperience,
    toggleOrbit,
    prepareSearchOrbit,
    queueLandmarkOrbit,
    queueAreaOrbit,
  } = useOrbitControls({
    viewerRef,
    buildingsRef,
    autoBuildingsEnabled,
    setAutoBuildingsMode,
    releaseSensorLink,
  });

  useInteractionGuards({
    sensorLink,
    orbitEnabled,
    autoBuildingsEnabled,
    cockpitLookSensitivity: COCKPIT_LOOK_SENSITIVITY,
    cancelAutoLandmarkExperience,
    hudRef,
    cockpitPointerRef,
    viewerRef,
    flightLayerManagerRef,
  });

  // One source of truth for "go home" Ã¢â‚¬â€ used by both the initial fly-in
  // and the custom Home button so they can never drift apart.
  const flyHome = useCallback((duration = 2) => {
    const viewer = viewerRef.current?.cesiumElement;
    if (!viewer) return;
    const { destination, orientation } = buildHome();
    viewer.camera.flyTo({
      destination,
      orientation,
      duration,
      easingFunction: FLIGHT_EASING,
    });
  }, []);

  const flyToPlace = useCallback(
    async (query: string) => {
      const viewer = viewerRef.current?.cesiumElement;
      if (!viewer) {
        console.warn('[Explorer] Search called before viewer was ready.');
        return;
      }

      releaseSensorLink();
      cancelAutoLandmarkExperience();

      if (!geocoderRef.current) {
        try {
          geocoderRef.current = new IonGeocoderService({ scene: viewer.scene });
        } catch (err) {
          console.error('[Explorer] Failed to create IonGeocoderService:', err);
          return;
        }
      }

      try {
        const results = await geocoderRef.current.geocode(query);
        if (!results.length) {
          console.warn(`[Explorer] No geocoding results for "${query}".`);
          return;
        }

        // Rank exact-name matches above generic "more precise" hits so
        // country/city/waterway searches don't collapse into a nearby point
        // landmark with a related name.
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
        const best = results.reduce((prev, curr) => {
          const score = (result: (typeof results)[number]) => {
            const displayName = result.displayName.trim().toLowerCase();
            const variantScore = queryVariants.reduce((bestScore, variant) => {
              let nextScore = 0;
              if (displayName === variant) nextScore = 4000;
              else if (displayName.startsWith(`${variant},`)) nextScore = 3500;
              else if (displayName.includes(variant)) nextScore = 2000;
              return Math.max(bestScore, nextScore);
            }, 0);
            let nameScore = 0;
            nameScore += variantScore;

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

            const rect = result.destination as Rectangle;
            const area =
              Math.abs(rect.east - rect.west) * Math.abs(rect.north - rect.south);
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

          return score(curr) > score(prev) ? curr : prev;
        }, results[0]);
        const chosen = exactAreaMatch ?? best;

        // Treat either a Cartesian3 point OR a very tight Rectangle (< 0.02Ã‚Â°
        // diagonal) as a "landmark" for orbit purposes. The Ion geocoder
        // returns famous landmarks like the Eiffel Tower as tight rectangles,
        // not points, so the Cartesian3-only check previously missed them and
        // auto-orbit never triggered.
        let isLandmark = chosen.destination instanceof Cartesian3;
        let landmarkPoint: Cartesian3 | null = isLandmark
          ? (chosen.destination as Cartesian3)
          : null;
        if (!isLandmark) {
          const r = chosen.destination as Rectangle;
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
        prepareSearchOrbit(isLandmark, landmarkPoint);
        // Keep precise landmarks direct, but restore staged long-haul travel
        // for broader searches so the flyover feels smooth again.
        flyObliqueToDestination(viewer, chosen.destination, isLandmark);

        // Auto-start orbit after the camera finishes landing on a landmark.
        // Uses camera.moveEnd rather than flyTo's complete callback because
        // complete is not guaranteed to fire across chained/staged flights.
        // The distance guard prevents intermediate multi-stage stops (~12 Mm
        // overhead) from triggering Ã¢â‚¬â€ only the final ~350 m landing qualifies.
        if (isLandmark && landmarkPoint) {
          queueLandmarkOrbit(viewer, landmarkPoint);
        }
        if (!isLandmark && chosen.destination instanceof Rectangle) {
          queueAreaOrbit(viewer, chosen.destination);
        }
      } catch (err) {
        console.error('[Explorer] Geocoding failed:', err);
      }
    },
    [
      cancelAutoLandmarkExperience,
      prepareSearchOrbit,
      queueAreaOrbit,
      queueLandmarkOrbit,
      releaseSensorLink,
    ],
  );

  const handleSensorLinkChange = useCallback((nextLink: FlightSensorLinkState) => {
    if (nextLink === 'release') {
      releaseSensorLink();
      return;
    }

    if (!selectedFlight) return;

    cancelAutoLandmarkExperience();
    releaseSensorLink();

    const flightId = selectedFlight.id_icao;
    const viewer = viewerRef.current?.cesiumElement;
    if (!viewer || viewer.isDestroyed()) return;

    const armSensorLink = () => {
      if (selectedFlightIdRef.current !== flightId) return;

      sensorLinkRef.current = nextLink;
      setSensorLink(nextLink);
      flightLayerManagerRef.current?.setSensorLinkState(nextLink);

      if (nextLink === 'flight-deck') {
        const ctrl = viewer.scene.screenSpaceCameraController;
        ctrl.enableRotate = false;
        ctrl.enableTranslate = false;
        ctrl.enableZoom = false;
        ctrl.enableTilt = false;
        ctrl.enableLook = false;
      }

      viewer.scene.requestRender();
    };

    const liveFlight = flightRecordsRef.current.get(flightId) ?? selectedFlight;
    const ageSeconds = Math.min(20, Math.max(0, Date.now() / 1000 - liveFlight.timestamp));

    switch (nextLink) {
      case 'focus':
        focusFlight(selectedFlight, {
          duration: 1.4,
          secondsAhead: 0,
          complete: armSensorLink,
        });
        break;
      case 'flight-deck': {
        const cockpitPose = getCockpitCameraPose(
          liveFlight,
          ageSeconds,
          0,
          COCKPIT_ENTRY_PITCH,
        );
        viewer.camera.lookAtTransform(Matrix4.IDENTITY);
        viewer.camera.flyTo({
          destination: cockpitPose.destination,
          orientation: cockpitPose.orientation,
          duration: 1.6,
          easingFunction: FLIGHT_EASING,
          complete: armSensorLink,
        });
        break;
      }
      default:
        break;
    }
  }, [
    cancelAutoLandmarkExperience,
    focusFlight,
    releaseSensorLink,
    selectedFlight,
  ]);


  useEffect(() => {
    if (!selectedImageryOption || currentImageryLayersRef.current.length > 0) {
      return;
    }

    applyImageryOption(selectedImageryOption);
  }, [applyImageryOption, selectedImageryOption]);

  useEffect(() => {
    flightsEnabledRef.current = flightsEnabled;
  }, [flightsEnabled]);

  useEffect(() => {
    selectedFlightIdRef.current = selectedFlightId;
    setSelectedFlight(
      selectedFlightId ? flightRecordsRef.current.get(selectedFlightId) ?? null : null,
    );
  }, [selectedFlightId]);

  useEffect(() => {
    showSelectedFlightTrailRef.current = showSelectedFlightTrail;
  }, [showSelectedFlightTrail]);

  useEffect(() => {
    showSelectedFlightRouteRef.current = showSelectedFlightRoute;
  }, [showSelectedFlightRoute]);

  useEffect(() => {
    assetViewRef.current = assetView;
  }, [assetView]);

  useEffect(() => {
    sensorLinkRef.current = sensorLink;
  }, [sensorLink]);

  useEffect(() => {
    aviationGridRef.current = aviationGrid;
  }, [aviationGrid]);

  useEffect(() => {
    groundStationsRef.current = groundStations;
  }, [groundStations]);

  useEffect(() => {
    if (sensorLink === 'release') return;
    if (!flightsEnabled || !selectedFlightId) {
      releaseSensorLink();
    }
  }, [
    flightsEnabled,
    releaseSensorLink,
    selectedFlightId,
    sensorLink,
  ]);

  const activeLayerCount =
    Number(flightsEnabled) +
    Number(Object.values(aviationGrid).some(Boolean)) +
    Number(groundStations.hfdl) +
    Number(groundStations.comms) +
    Number(Boolean(buildingsEnabled || autoBuildingsEnabled)) +
    Number(orbitEnabled);

  const activeAviationGridCount = Object.values(aviationGrid).filter(Boolean).length;
  const aviationGridSummary =
    activeAviationGridCount > 0
      ? `${activeAviationGridCount} of 6 categories active.`
      : 'All aviation categories are currently filtered out.';

  const currentSection =
    SECTION_TABS.find((section) => section.id === activeSection) ??
    SECTION_TABS[0];

  return (
    <>
      <ResiumViewer
        full
        ref={viewerRef}
        terrain={WORLD_TERRAIN}
        homeButton={false}
        geocoder={false}
        baseLayerPicker={false}
        timeline={false}
        animation={false}
        selectionIndicator={false}
        infoBox={false}
        // Explicit: keep Cesium's built-in Navigation Help widget (the "?"
        // in the top-right toolbar). Click it to open the tilt/rotate/zoom
        // instruction overlay Ã¢â‚¬â€ that's the circular tilt-control diagram.
        sceneModePicker={false}
        navigationHelpButton={false}
        navigationInstructionsInitiallyVisible={false}
      />
      <div className="hud-shell" ref={hudRef}>
        <SearchBox onSearch={flyToPlace} />

        <LayerSidebar
          activeSection={activeSection}
          currentSection={currentSection}
          imageryPickerOpen={imageryPickerOpen}
          selectedImageryName={selectedImageryOption?.name ?? 'Choose a map style'}
          buildingsEnabled={buildingsEnabled}
          autoBuildingsEnabled={autoBuildingsEnabled}
          orbitEnabled={orbitEnabled}
          flightsEnabled={flightsEnabled}
          aviationGrid={aviationGrid}
          isGridMenuOpen={isGridMenuOpen}
          groundStations={groundStations}
          sigintInfrastructureOpen={sigintInfrastructureOpen}
          airportLayerMessage={airportLayerMessage}
          aviationGridSummary={aviationGridSummary}
          flightFeed={flightFeed}
          onSectionChange={setActiveSection}
          onToggleImageryPicker={() => setImageryPickerOpen((open) => !open)}
          onToggleBuildings={toggleBuildings}
          onToggleOrbit={toggleOrbit}
          onToggleFlights={toggleFlights}
          onToggleGridMenu={() => setIsGridMenuOpen((open) => !open)}
          onToggleAviationGridCategory={toggleAviationGridCategory}
          onToggleSigintInfrastructure={() => setSigintInfrastructureOpen((open) => !open)}
          onToggleGroundStationLayer={toggleGroundStationLayer}
          sectionTabs={SECTION_TABS}
        />

        {imageryPickerOpen && (
          <ImageryFlyout
            imageryOptions={imageryOptions}
            selectedImageryId={selectedImageryId}
            onSelect={handleImageryOptionChange}
          />
        )}
        {sensorLink === 'flight-deck' && (
          <FlightDeckHud
            flight={selectedFlight}
            route={selectedFlightRoute}
          />
        )}

        <FlightDetailsPanel
          feed={flightFeed}
          flight={selectedFlight}
          route={showSelectedFlightRoute ? selectedFlightRoute : null}
          assetView={assetView}
          sensorLink={sensorLink}
          showRoute={showSelectedFlightRoute}
          showTrail={showSelectedFlightTrail}
          onAssetViewChange={setAssetView}
          onSensorLinkChange={handleSensorLinkChange}
          onToggleRoute={toggleSelectedFlightRoute}
          onToggleTrail={() => setShowSelectedFlightTrail((enabled) => !enabled)}
          onClose={() => updateSelectedFlight(null)}
        />

        <div className="hud-quick-actions">
          <button
            type="button"
            className="custom-home-button aether-floating-action"
            onClick={() => {
              releaseSensorLink();
              flyHome(2);
            }}
            title="Return to India home view"
            aria-label="Return to India home view"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M3 12l9-9 9 9" />
              <path d="M5 10v10h14V10" />
            </svg>
          </button>

          <button
            type="button"
            className="dev-status-trigger aether-floating-action"
            onClick={() => setDevStatusOpen((open) => !open)}
            aria-expanded={devStatusOpen}
            aria-controls="dev-status-panel"
          >
            <span>Dev Status</span>
            <span className="dev-status-trigger__badge aether-floating-badge">{activeLayerCount} Live</span>
          </button>
        </div>

        <DevStatusPanel
          open={devStatusOpen}
          activeGroupLabel={currentSection.label}
          selectedImageryName={selectedImageryOption?.name ?? 'Unavailable'}
          buildingsEnabled={buildingsEnabled || autoBuildingsEnabled}
          flightsEnabled={flightsEnabled}
          flightFeed={flightFeed}
          orbitEnabled={orbitEnabled}
        />
      </div>
    </>
  );
}

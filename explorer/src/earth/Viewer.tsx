import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArcGisBaseMapType,
  ArcGisMapServerImageryProvider,
  BoundingSphere,
  Camera,
  Cartesian2,
  Cartesian3,
  Cartographic,
  Cesium3DTileset,
  EasingFunction,
  Ion,
  IonGeocoderService,
  IonImageryProvider,
  IonWorldImageryStyle,
  ImageryLayer,
  HeadingPitchRange,
  Math as CesiumMath,
  Matrix4,
  OpenStreetMapImageryProvider,
  Rectangle,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  TileMapServiceImageryProvider,
  Viewer as CesiumViewer,
  Terrain,
  Transforms,
  createWorldImageryAsync,
  createOsmBuildingsAsync,
} from 'cesium';
import { CesiumComponentRef, Viewer as ResiumViewer } from 'resium';
import FlightDetailsPanel from './FlightDetailsPanel';
import SearchBox from './SearchBox';
import { FlightSceneLayerManager } from './flightLayers';
import {
  AirportRecord,
  FLIGHT_POLL_INTERVAL_MS,
  FlightFeedState,
  FlightRecord,
  FlightRenderMode,
  FlightRouteSnapshot,
  fetchAirports,
  fetchFlightRoute,
  fetchFlightSnapshot,
  formatAltitudeMeters,
  formatHeading,
  formatSpeed,
  getFlightRenderMode,
  predictFlightPosition,
} from './flights';

/**
 * Altitude (meters) below which 3D buildings become visible.
 *
 * 300 km ≈ regional view (you can see a whole metropolis and its
 * surroundings). Below this, buildings are meaningful and worth streaming.
 *
 * Earlier value of 20 km was far too strict: the fly-in lands at
 * 15,000 km and geocoded cities typically land at 30–80 km, so the gate
 * was never crossed and the tileset's `.show` stayed `false` forever
 * regardless of the toggle.
 *
 * The tileset's own screen-space error still prevents wasted streaming
 * at high altitudes — this gate is just for user-perceived visibility.
 */
const BUILDINGS_ALTITUDE_THRESHOLD = 300_000;

// Instantiate once at module level so the object is stable across renders.
// Terrain.fromWorldTerrain() configures CWT (Ion asset 1) synchronously;
// the actual tile data streams in after the viewer mounts.
const WORLD_TERRAIN = Terrain.fromWorldTerrain();

// Pull the token from Vite's env. Using `import.meta.env` keeps the value
// out of source — it's injected at build time from `.env` (gitignored).
const ionToken = import.meta.env.VITE_CESIUM_ION_TOKEN;

// Set the token before any Cesium API that hits Ion is called.
if (ionToken) {
  Ion.defaultAccessToken = ionToken;
}

/**
 * Home view — centered on India, slightly tilted, pulled in closer than
 * the full-globe default so Earth feels like a subject, not a map.
 *
 * Tuning notes:
 *   - height 15,000 km → Earth disk is slightly larger than full-frame;
 *     most of the globe visible, India clearly the subject.
 *   - pitch -85° (5° off straight down) → subtle premium tilt; at shallower
 *     pitches the camera's aim-point drifts north of the subtended lat
 *     and India no longer sits at the exact center of frame.
 *   - heading 0 → north is up.
 *
 * Coordinates: India's geographic centroid.
 */
const HOME_VIEW = {
  lon: 78.9629,
  lat: 20.5937,
  height: 15_000_000,
  heading: 0,
  pitch: -85,
} as const;

/**
 * CRITICAL: override Cesium's module-level default-view rectangle BEFORE
 * the Viewer ever mounts. Without this, Cesium frames its built-in default
 * (roughly centered over North America) for the first camera pose, and
 * our `useEffect` ends up racing that default — you get a one-frame flash
 * of the wrong region, or on some loads it "sticks" there entirely.
 *
 * The rectangle is an India-centered window (±40° lon, ±30° lat) — wide
 * enough to still show most of the globe, but anchored over the right
 * hemisphere from the very first frame.
 */
Camera.DEFAULT_VIEW_RECTANGLE = Rectangle.fromDegrees(
  HOME_VIEW.lon - 40,
  HOME_VIEW.lat - 30,
  HOME_VIEW.lon + 40,
  HOME_VIEW.lat + 30,
);

/**
 * Meters per degree of latitude (WGS84 average). Good enough for the
 * small offsets we use when placing the camera south of a target.
 */
const METERS_PER_DEG_LAT = 111_320;
const FLIGHT_EASING = EasingFunction.SINUSOIDAL_IN_OUT;
const FLIGHT_TRACK_SECONDS_AHEAD = 3;

/**
 * Place the camera south of (lonDeg, latDeg) at `altitude` meters, pitched
 * down by `pitchDeg` so the target sits dead-center of the view.
 *
 * Geometry: we want the camera's look vector to pass through the target.
 * With heading = 0 (facing north) and pitch θ below horizontal, camera
 * altitude H and south offset D satisfy tan(|θ|) = H / D → D = H / tan|θ|.
 * Convert D meters to degrees latitude via ~111.32 km/deg.
 */
function flyObliqueToPoint(
  viewer: CesiumViewer,
  lonDeg: number,
  latDeg: number,
  altitude: number,
  pitchDeg: number,
  duration = 2,
  onComplete?: () => void,
) {
  const pitchRad = CesiumMath.toRadians(pitchDeg);
  const horizontalOffsetMeters = altitude / Math.tan(Math.abs(pitchRad));
  const latOffsetDeg = horizontalOffsetMeters / METERS_PER_DEG_LAT;
  const cameraLat = latDeg - latOffsetDeg;

  viewer.camera.flyTo({
    destination: Cartesian3.fromDegrees(lonDeg, cameraLat, altitude),
    orientation: {
      heading: 0,
      pitch: pitchRad,
      roll: 0,
    },
    duration,
    easingFunction: FLIGHT_EASING,
    complete: onComplete,
  });
}

/**
 * Tier-based cinematic fly: classify geocoder destination by size, then
 * land with progressively more oblique pitch for closer tiers so 3D
 * buildings read as standing up (not flattened top-down).
 *
 *   Landmark (Cartesian3) → 350 m,  pitch -50°  (tight oblique + orbit)
 *   Small area (< 0.02°)  → 600 m,  pitch -45°  (strong oblique)
 *   City     (< 0.5°)     → scaled, pitch -55°  (medium oblique)
 *   Region   (< 10°)      → scaled, pitch -70°  (gentle tilt)
 *   Country+ (>= 10°)     → default rectangle framing
 *
 * For long-distance searches (> 3 000 km), performs a 3-stage flight:
 * zoom out → travel at altitude → descend to target.
 *
 * _skipStaging is used internally on the final descent to prevent the
 * staging check from firing again after the camera is already overhead.
 */
function flyObliqueToDestination(
  viewer: CesiumViewer,
  destination: Rectangle | Cartesian3,
  _skipStaging = false,
  onLandmarkLanded?: () => void,
) {
  if (!_skipStaging) {
    let targetLon: number;
    let targetLat: number;
    if (destination instanceof Cartesian3) {
      const c = Cartographic.fromCartesian(destination);
      if (!c) return;
      targetLon = CesiumMath.toDegrees(c.longitude);
      targetLat = CesiumMath.toDegrees(c.latitude);
    } else {
      targetLon = CesiumMath.toDegrees(
        (destination.east + destination.west) / 2,
      );
      targetLat = CesiumMath.toDegrees(
        (destination.north + destination.south) / 2,
      );
    }

    const camCarto = getCameraCartographic(viewer);
    if (!camCarto) return;
    const camSurface = Cartesian3.fromRadians(
      camCarto.longitude,
      camCarto.latitude,
      0,
    );
    const tgtSurface = Cartesian3.fromDegrees(targetLon, targetLat, 0);

    if (Cartesian3.distance(camSurface, tgtSurface) > 3_000_000) {
      const camLon = CesiumMath.toDegrees(camCarto.longitude);
      const camLat = CesiumMath.toDegrees(camCarto.latitude);
      viewer.camera.flyTo({
        destination: Cartesian3.fromDegrees(camLon, camLat, 12_000_000),
        duration: 1.0,
        easingFunction: FLIGHT_EASING,
        complete: () =>
          viewer.camera.flyTo({
            destination: Cartesian3.fromDegrees(
              targetLon,
              targetLat,
              12_000_000,
            ),
            duration: 1.8,
            easingFunction: FLIGHT_EASING,
            complete: () =>
              flyObliqueToDestination(
                viewer,
                destination,
                true,
                onLandmarkLanded,
              ),
          }),
      });
      return;
    }
  }

  // --- Precise landmark landing -----------------------------------------
  if (destination instanceof Cartesian3) {
    const carto = Cartographic.fromCartesian(destination);
    if (!carto) return;
    const lonDeg = CesiumMath.toDegrees(carto.longitude);
    const latDeg = CesiumMath.toDegrees(carto.latitude);
    // onLandmarkLanded fires when the flyTo completes (caller starts orbit).
    flyObliqueToPoint(
      viewer,
      lonDeg,
      latDeg,
      350,
      -50,
      1.8,
      onLandmarkLanded,
    );
    return;
  }

  // --- Rectangle result — classify by diagonal span (unchanged) ----------
  const rect = destination;
  const widthDeg = CesiumMath.toDegrees(Math.abs(rect.east - rect.west));
  const heightDeg = CesiumMath.toDegrees(Math.abs(rect.north - rect.south));
  const diagDeg = Math.sqrt(widthDeg * widthDeg + heightDeg * heightDeg);
  const diagMeters = diagDeg * METERS_PER_DEG_LAT;
  const centerLonDeg = CesiumMath.toDegrees((rect.east + rect.west) / 2);
  const centerLatDeg = CesiumMath.toDegrees((rect.north + rect.south) / 2);

  if (diagDeg < 0.02) {
    flyObliqueToPoint(
      viewer,
      centerLonDeg,
      centerLatDeg,
      600,
      -45,
      2,
    );
  } else if (diagDeg < 0.5) {
    const altitude = Math.max(2000, diagMeters * 1.2);
    flyObliqueToPoint(
      viewer,
      centerLonDeg,
      centerLatDeg,
      altitude,
      -55,
      2,
    );
  } else if (diagDeg < 10) {
    const altitude = Math.max(30_000, diagMeters * 1.5);
    flyObliqueToPoint(
      viewer,
      centerLonDeg,
      centerLatDeg,
      altitude,
      -70,
      2,
    );
  } else {
    // Country or bigger: top-down rectangle framing (tilted feels wrong
    // across continents, and buildings aren't the point at this scale).
    viewer.camera.flyTo({
      destination: rect,
      duration: 2,
      easingFunction: FLIGHT_EASING,
    });
  }
}

/** Build the final home destination + orientation once per call. */
function buildHome() {
  return {
    destination: Cartesian3.fromDegrees(
      HOME_VIEW.lon,
      HOME_VIEW.lat,
      HOME_VIEW.height,
    ),
    orientation: {
      heading: CesiumMath.toRadians(HOME_VIEW.heading),
      pitch: CesiumMath.toRadians(HOME_VIEW.pitch),
      roll: 0,
    },
  };
}

function getCameraCartographic(viewer: CesiumViewer) {
  const cartographic = viewer.camera.positionCartographic;
  if (
    !cartographic ||
    !Number.isFinite(cartographic.longitude) ||
    !Number.isFinite(cartographic.latitude) ||
    !Number.isFinite(cartographic.height)
  ) {
    return null;
  }

  return cartographic;
}

function getFlightCameraTarget(
  flight: FlightRecord,
  secondsAhead: number,
) {
  const predicted = predictFlightPosition(flight, secondsAhead);
  return Cartesian3.fromDegrees(
    predicted.longitude,
    predicted.latitude,
    Math.max(0, predicted.altitudeMeters),
  );
}

function getFlightCameraOffset(
  viewer: CesiumViewer,
  target: Cartesian3,
) {
  const range = Math.max(1_000, Cartesian3.distance(viewer.camera.position, target));
  return new HeadingPitchRange(
    viewer.camera.heading,
    viewer.camera.pitch,
    range,
  );
}

/**
 * Cockpit entry view — positions the camera AT the plane's location,
 * facing in the direction it is travelling. Used for the initial fly-in
 * animation when the user activates drone/cockpit mode.
 */
function getDroneCockpitEntry(flight: FlightRecord, secondsAhead: number) {
  const target = getFlightCameraTarget(flight, secondsAhead);
  const headingRad = CesiumMath.toRadians(flight.headingDegrees);
  // Slightly above the flight position so you're "on top" of the plane.
  const enuTransform = Transforms.eastNorthUpToFixedFrame(target);
  const localUp = new Cartesian3(0, 0, 30); // 30 m above plane
  const worldPos = Matrix4.multiplyByPoint(enuTransform, localUp, new Cartesian3());

  // Orientation: face the heading direction, slight look-down.
  const pitchRad = CesiumMath.toRadians(-5);
  return {
    destination: worldPos,
    orientation: {
      heading: headingRad,
      pitch: pitchRad,
      roll: 0,
    },
  };
}

type SidebarSection = 'base' | 'intel' | 'visual' | 'system';

interface ImageryOption {
  id: string;
  name: string;
  tooltip: string;
  iconUrl: string;
  create: () => unknown;
}

const SECTION_TABS: Array<{
  id: SidebarSection;
  label: string;
  title: string;
}> = [
  { id: 'base', label: 'Base', title: 'Base Layers' },
  { id: 'intel', label: 'Intel', title: 'Intel Layers' },
  { id: 'visual', label: 'Visual', title: 'Visual Modes' },
  { id: 'system', label: 'System', title: 'System Controls' },
];

function toImageryId(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

function buildImageryOptions(): ImageryOption[] {
  const iconBase = '/cesium/Widgets/Images/ImageryProviders';

  const options: Omit<ImageryOption, 'id'>[] = [
    {
      name: 'Bing Maps Aerial',
      tooltip: 'Bing Maps aerial imagery, provided by Cesium ion.',
      iconUrl: `${iconBase}/bingAerial.png`,
      create: () =>
        createWorldImageryAsync({ style: IonWorldImageryStyle.AERIAL }),
    },
    {
      name: 'Bing Maps Aerial with Labels',
      tooltip: 'Bing Maps aerial imagery with labels, provided by Cesium ion.',
      iconUrl: `${iconBase}/bingAerialLabels.png`,
      create: () =>
        createWorldImageryAsync({
          style: IonWorldImageryStyle.AERIAL_WITH_LABELS,
        }),
    },
    {
      name: 'Bing Maps Roads',
      tooltip: 'Bing Maps road map, provided by Cesium ion.',
      iconUrl: `${iconBase}/bingRoads.png`,
      create: () => createWorldImageryAsync({ style: IonWorldImageryStyle.ROAD }),
    },
    {
      name: 'ArcGIS World Imagery',
      tooltip: 'ArcGIS satellite imagery.',
      iconUrl: `${iconBase}/ArcGisMapServiceWorldImagery.png`,
      create: () =>
        ArcGisMapServerImageryProvider.fromBasemapType(
          ArcGisBaseMapType.SATELLITE,
          { enablePickFeatures: false },
        ),
    },
    {
      name: 'ArcGIS World Hillshade',
      tooltip: 'ArcGIS elevation hillshade map.',
      iconUrl: `${iconBase}/ArcGisMapServiceWorldHillshade.png`,
      create: () =>
        ArcGisMapServerImageryProvider.fromBasemapType(
          ArcGisBaseMapType.HILLSHADE,
          { enablePickFeatures: false },
        ),
    },
    {
      name: 'Esri World Ocean',
      tooltip: 'Esri ocean-focused base map.',
      iconUrl: `${iconBase}/ArcGisMapServiceWorldOcean.png`,
      create: () =>
        ArcGisMapServerImageryProvider.fromBasemapType(
          ArcGisBaseMapType.OCEANS,
          { enablePickFeatures: false },
        ),
    },
    {
      name: 'OpenStreetMap',
      tooltip: 'OpenStreetMap collaborative world map.',
      iconUrl: `${iconBase}/openStreetMap.png`,
      create: () =>
        new OpenStreetMapImageryProvider({
          url: 'https://tile.openstreetmap.org/',
        }),
    },
    {
      name: 'Stadia Watercolor',
      tooltip: 'Hand-drawn watercolor map style from Stadia and Stamen.',
      iconUrl: `${iconBase}/stamenWatercolor.png`,
      create: () =>
        new OpenStreetMapImageryProvider({
          url: 'https://tiles.stadiamaps.com/tiles/stamen_watercolor/',
          fileExtension: 'jpg',
        }),
    },
    {
      name: 'Stadia Toner',
      tooltip: 'High-contrast black and white map style.',
      iconUrl: `${iconBase}/stamenToner.png`,
      create: () =>
        new OpenStreetMapImageryProvider({
          url: 'https://tiles.stadiamaps.com/tiles/stamen_toner/',
          retinaTiles: typeof window !== 'undefined' && window.devicePixelRatio >= 2,
        }),
    },
    {
      name: 'Stadia Alidade Smooth',
      tooltip: 'Muted map style for overlays.',
      iconUrl: `${iconBase}/stadiaAlidadeSmooth.png`,
      create: () =>
        new OpenStreetMapImageryProvider({
          url: 'https://tiles.stadiamaps.com/tiles/alidade_smooth/',
          retinaTiles: typeof window !== 'undefined' && window.devicePixelRatio >= 2,
        }),
    },
    {
      name: 'Stadia Alidade Smooth Dark',
      tooltip: 'Dark muted map style for overlays.',
      iconUrl: `${iconBase}/stadiaAlidadeSmoothDark.png`,
      create: () =>
        new OpenStreetMapImageryProvider({
          url: 'https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/',
          retinaTiles: typeof window !== 'undefined' && window.devicePixelRatio >= 2,
        }),
    },
    {
      name: 'Sentinel-2',
      tooltip: 'Sentinel-2 cloudless imagery from Cesium ion.',
      iconUrl: `${iconBase}/sentinel-2.png`,
      create: () => IonImageryProvider.fromAssetId(3954),
    },
    {
      name: 'Blue Marble',
      tooltip: 'NASA Blue Marble imagery.',
      iconUrl: `${iconBase}/blueMarble.png`,
      create: () => IonImageryProvider.fromAssetId(3845),
    },
    {
      name: 'Earth at Night',
      tooltip: 'NASA Earth at Night imagery.',
      iconUrl: `${iconBase}/earthAtNight.png`,
      create: () => IonImageryProvider.fromAssetId(3812),
    },
    {
      name: 'Natural Earth II',
      tooltip: 'Natural Earth II darkened for contrast.',
      iconUrl: `${iconBase}/naturalEarthII.png`,
      create: () =>
        TileMapServiceImageryProvider.fromUrl('/cesium/Assets/Textures/NaturalEarthII'),
    },
  ];

  return options.map((option) => ({
    ...option,
    id: toImageryId(option.name),
  }));
}

const INITIAL_FLIGHT_FEED: FlightFeedState = {
  status: 'idle',
  sourceLabel: 'Offline',
  message: 'Turn on Flights to load live traffic.',
  fetchedAt: null,
  flightCount: 0,
  totalAvailable: 0,
};

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
  const flightInteractionHandlerRef = useRef<ScreenSpaceEventHandler | null>(null);
  const flightRenderModeRef = useRef<FlightRenderMode>('dot');
  const flightsEnabledRef = useRef(false);
  const showAirportsRef = useRef(false);
  const selectedFlightIdRef = useRef<string | null>(null);
  const trackedFlightIdRef = useRef<string | null>(null);
  const droneFlightIdRef = useRef<string | null>(null);
  const cockpitFlightIdRef = useRef<string | null>(null);
  const trackedFlightViewRef = useRef<HeadingPitchRange | null>(null);
  const showSelectedFlightTrailRef = useRef(false);
  const showSelectedFlightRouteRef = useRef(false);
  const airportsLoadedRef = useRef(false);
  const airportsLoadingRef = useRef(false);
  const airportRecordsCacheRef = useRef<AirportRecord[]>([]);
  const selectedFlightRouteRef = useRef<FlightRouteSnapshot | null>(null);
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
  const [showAirports, setShowAirports] = useState(false);
  const [selectedFlightId, setSelectedFlightId] = useState<string | null>(null);
  const [trackedFlightId, setTrackedFlightId] = useState<string | null>(null);
  const [droneFlightId, setDroneFlightId] = useState<string | null>(null);
  const [cockpitFlightId, setCockpitFlightId] = useState<string | null>(null);
  const [selectedFlight, setSelectedFlight] = useState<FlightRecord | null>(null);
  const [showSelectedFlightTrail, setShowSelectedFlightTrail] = useState(false);
  const [showSelectedFlightRoute, setShowSelectedFlightRoute] = useState(false);
  const [flightFeed, setFlightFeed] = useState<FlightFeedState>(INITIAL_FLIGHT_FEED);
  const [flightRenderMode, setFlightRenderMode] = useState<FlightRenderMode>('dot');
  const [selectedFlightRoute, setSelectedFlightRoute] = useState<FlightRouteSnapshot | null>(null);
  const [airportLayerMessage, setAirportLayerMessage] = useState(
    'Render every airport with zoom-aware visibility.',
  );

  // User toggle state for the buildings layer. Effective visibility is
  // `buildingsEnabled && altitudeOK` — the altitude gate lives in the
  // camera-changed listener below.
  const [buildingsEnabled, setBuildingsEnabled] = useState(false);
  // Ref mirror so the camera-changed listener can read the latest value
  // without being recreated on every toggle.
  const buildingsEnabledRef = useRef(buildingsEnabled);
  // Temporary buildings mode for landmark auto-orbit. This should not
  // overwrite the user's manual Buildings preference.
  const [autoBuildingsEnabled, setAutoBuildingsEnabled] = useState(false);
  const autoBuildingsEnabledRef = useRef(false);

  // Orbit state — whether the continuous camera rotation loop is running.
  const [orbitEnabled, setOrbitEnabled] = useState(false);
  const orbitEnabledRef = useRef(false);
  const orbitRafRef = useRef(0);
  // The Cartesian3 point the orbit rotates around. Set when a landmark
  // search result lands; falls back to the ellipsoid point below the camera.
  const orbitTargetRef = useRef<Cartesian3 | null>(null);
  // Owns the active RAF orbit session. Incremented by startOrbit() and
  // stopOrbit(); every tick captures this value in its closure and exits
  // the moment the captured id no longer matches — killing orphan loops.
  const orbitSessionIdRef = useRef(0);
  // Owns the "pending landmark auto-orbit" listener attached after a search
  // but before the camera has landed. Incremented when a new search arms a
  // fresh listener, and when stopOrbit() cancels any in-flight auto-start.
  // Kept separate from session id so the two lifecycles don't clobber each
  // other — e.g. ending a manual orbit session must not silently revive a
  // queued auto-orbit, and arming a new auto-orbit must not fake-kill the
  // currently running manual orbit.
  const pendingAutoOrbitRevRef = useRef(0);
  // Estimated height (metres) of the current landmark being orbited.
  // 0 for manual orbit (no landmark context). Controls min orbit radius.
  const orbitLandmarkHeightRef = useRef(0);
  // Explicit orbit range for auto-search flows. `null` means derive from the
  // current landed camera distance instead.
  const orbitRangeRef = useRef<number | null>(null);

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

  const stopFlightTracking = useCallback(() => {
    trackedFlightIdRef.current = null;
    droneFlightIdRef.current = null;
    cockpitFlightIdRef.current = null;
    trackedFlightViewRef.current = null;
    setTrackedFlightId(null);
    setDroneFlightId(null);
    setCockpitFlightId(null);

    const viewer = viewerRef.current?.cesiumElement;
    if (viewer && !viewer.isDestroyed()) {
      viewer.camera.lookAtTransform(Matrix4.IDENTITY);
      // Restore all camera controller inputs that cockpit mode may have disabled.
      const ctrl = viewer.scene.screenSpaceCameraController;
      ctrl.enableRotate = true;
      ctrl.enableTranslate = true;
      ctrl.enableZoom = true;
      ctrl.enableTilt = true;
      ctrl.enableLook = true;
      viewer.scene.requestRender();
    }
  }, []);

  // ── 60 fps dead-reckoning loop ──────────────────────────────────────────
  // Attaches FlightSceneLayerManager.tickPositions() to Cesium's preRender
  // event so aircraft glide smoothly every frame instead of teleporting on
  // each OpenSky poll.
  //
  // Rules:
  //  • Empty deps → registered ONCE on mount, removed on unmount.
  //  • NO useState calls inside → zero React re-renders at 60fps.
  //  • Reads flightLayerManagerRef directly (mutable ref, not state).
  useEffect(() => {
    let cancelled = false;
    let rafId = 0;
    let removePreRender: (() => void) | undefined;

    const pollForViewer = () => {
      if (cancelled) return;
      const viewer = viewerRef.current?.cesiumElement;
      const manager = flightLayerManagerRef.current;
      if (!viewer || viewer.isDestroyed() || !manager) {
        rafId = requestAnimationFrame(pollForViewer);
        return;
      }
      // Attach the tick to Cesium's preRender — fires automatically every frame.
      removePreRender = viewer.scene.preRender.addEventListener(() => {
        flightLayerManagerRef.current?.tickPositions();
      });
    };

    rafId = requestAnimationFrame(pollForViewer);
    return () => {
      cancelled = true;
      if (rafId) cancelAnimationFrame(rafId);
      removePreRender?.();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
      flightRecordsRef.current.set(flight.id, flight);
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

  const toggleFlights = useCallback(() => {
    const nextEnabled = !flightsEnabledRef.current;
    flightsEnabledRef.current = nextEnabled;
    setFlightsEnabled(nextEnabled);
    flightLayerManagerRef.current?.setFlightsVisible(nextEnabled);

    if (!nextEnabled) {
      stopFlightTracking();
      updateSelectedFlight(null);
    }
  }, [stopFlightTracking, updateSelectedFlight]);

  const toggleAirports = useCallback(() => {
    const nextEnabled = !showAirportsRef.current;
    showAirportsRef.current = nextEnabled;
    setShowAirports(nextEnabled);
    flightLayerManagerRef.current?.setAirportsVisible(nextEnabled);
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

  const stopOrbit = useCallback(() => {
    // 1) Burn the active session id — any still-scheduled RAF tick will see
    //    the mismatch and bail on its next fire.
    orbitSessionIdRef.current++;
    // 2) Burn any pending landmark auto-start listener so a camera.moveEnd
    //    that arrives after this call can't resurrect orbit.
    pendingAutoOrbitRevRef.current++;
    orbitEnabledRef.current = false;
    setOrbitEnabled(false);
    if (orbitRafRef.current) {
      cancelAnimationFrame(orbitRafRef.current);
      orbitRafRef.current = 0;
    }
    const v = viewerRef.current?.cesiumElement;
    if (v && !v.isDestroyed()) v.camera.lookAtTransform(Matrix4.IDENTITY);
    orbitRangeRef.current = null;
  }, []);

  const cancelAutoLandmarkExperience = useCallback(() => {
    stopOrbit();
    if (autoBuildingsEnabledRef.current) {
      setAutoBuildingsMode(false);
    }
  }, [setAutoBuildingsMode, stopOrbit]);

  const startOrbit = useCallback(() => {
    const viewer = viewerRef.current?.cesiumElement;
    if (!viewer || viewer.isDestroyed()) return;

    // Fall back to the ellipsoid point below the camera when no landmark
    // target has been stored (e.g. manual toggle from an arbitrary view).
    if (!orbitTargetRef.current) {
      const c = getCameraCartographic(viewer);
      if (!c) return;
      orbitTargetRef.current = Cartesian3.fromRadians(c.longitude, c.latitude, 0);
    }
    const target = orbitTargetRef.current;

    let heading = viewer.camera.heading;

    // Clamp pitch to a useful oblique window — avoids top-down and horizon-skimming.
    const pitch = CesiumMath.clamp(
      viewer.camera.pitch,
      CesiumMath.toRadians(-75),
      CesiumMath.toRadians(-15),
    );

    // Enforce a minimum orbit radius that ensures the full structure is visible.
    // For landmarks, orbitLandmarkHeightRef carries the estimated structure
    // height; 2.5× that keeps the top of the structure safely inside the FOV.
    // Manual orbit (no landmark context) uses 550 m as the floor.
    const landmarkHeight = orbitLandmarkHeightRef.current;
    const MIN_RADIUS = Math.max(landmarkHeight * 2.5, 550);
    const desiredRange =
      orbitRangeRef.current ?? Cartesian3.distance(viewer.camera.position, target);
    const range = Math.max(desiredRange, MIN_RADIUS);

    // Angular speed in rad/s (FPS-independent). Scales with orbit radius so
    // arc-speed stays roughly constant — at smaller radii we step more angle
    // per second to cover the same ground. Clamped 1–8 °/s so tight landmark
    // orbits never feel "spinny".
    //
    // Previously STEP was per-frame (calibrated at 60 fps) and added raw in
    // the tick, so on high-refresh displays the orbit ran 2–3× too fast.
    // Now the tick multiplies by dt (seconds since last frame) to decouple
    // from the monitor refresh rate.
    const LINEAR_SPEED = 100;
    const ANGULAR_SPEED = CesiumMath.clamp(
      LINEAR_SPEED / range,
      CesiumMath.toRadians(1),
      CesiumMath.toRadians(8),
    );

    // Claim a new session id. The tick closure captures this value and
    // verifies it every frame; if stopOrbit (or another startOrbit) bumps
    // the ref, the captured id no longer matches and this tick loop
    // terminates without scheduling another RAF — guaranteeing orphaned
    // loops can't survive.
    const sessionId = ++orbitSessionIdRef.current;
    orbitEnabledRef.current = true;
    setOrbitEnabled(true);

    let lastT = performance.now();
    const tick = () => {
      if (!orbitEnabledRef.current || sessionId !== orbitSessionIdRef.current) return;
      const v = viewerRef.current?.cesiumElement;
      if (!v || v.isDestroyed()) {
        orbitEnabledRef.current = false;
        setOrbitEnabled(false);
        return;
      }
      const now = performance.now();
      const dt = (now - lastT) / 1000;
      lastT = now;
      heading += ANGULAR_SPEED * dt;
      v.camera.lookAt(target, new HeadingPitchRange(heading, pitch, range));
      orbitRafRef.current = requestAnimationFrame(tick);
    };

    if (orbitRafRef.current) cancelAnimationFrame(orbitRafRef.current);
    orbitRafRef.current = requestAnimationFrame(tick);
  }, []);

  const toggleOrbit = useCallback(() => {
    if (orbitEnabledRef.current) {
      stopOrbit();
    } else {
      stopFlightTracking();
      // Manual ON: compute a fresh focal point from the current view so the
      // orbit never jumps to a stale landmark from a previous search.
      const viewer = viewerRef.current?.cesiumElement;
      if (!viewer || viewer.isDestroyed()) return;
      const canvas = viewer.scene.canvas;
      const center = new Cartesian2(
        canvas.clientWidth / 2,
        canvas.clientHeight / 2,
      );
      // Prefer terrain/globe intersection at screen center; fall back to
      // ellipsoid pick, then to the point directly below the camera.
      const ray = viewer.camera.getPickRay(center);
      const hit = ray ? viewer.scene.globe.pick(ray, viewer.scene) : undefined;
      const ellipsoidHit = viewer.camera.pickEllipsoid(center);
      const cameraCartographic = getCameraCartographic(viewer);
      if (!hit && !ellipsoidHit && !cameraCartographic) {
        return;
      }
      orbitTargetRef.current =
        hit ??
        ellipsoidHit ??
        Cartesian3.fromRadians(
          cameraCartographic!.longitude,
          cameraCartographic!.latitude,
          0,
        );
      // Manual orbit has no landmark context — reset height so MIN_RADIUS
      // falls back to the base floor rather than stale landmark data.
      orbitLandmarkHeightRef.current = 0;
      orbitRangeRef.current = null;
      startOrbit();
    }
  }, [startOrbit, stopFlightTracking, stopOrbit]);

  const refineLandmarkOrbitFrom3D = useCallback(
    (groundTarget: Cartesian3, rev: number) => {
      if (pendingAutoOrbitRevRef.current !== rev) return;
      const viewer = viewerRef.current?.cesiumElement;
      if (!viewer || viewer.isDestroyed()) return;

      const carto = Cartographic.fromCartesian(groundTarget);
      if (!carto) return;
      const terrainHeight = viewer.scene.globe.getHeight(carto) ?? 0;
      const measuredHeight = Math.max(
        0,
        (buildingsRef.current?.getHeight(carto, viewer.scene) ?? terrainHeight) -
        terrainHeight,
      );

      orbitLandmarkHeightRef.current = measuredHeight;
      // Use a clearly wider camera distance so tall landmarks like the
      // Eiffel Tower stay comfortably in frame with visible sky around them.
      orbitRangeRef.current = Math.max(1100, measuredHeight * 4.2 + 360);
      orbitTargetRef.current = Cartesian3.fromRadians(
        carto.longitude,
        carto.latitude,
        terrainHeight + measuredHeight * 0.25,
      );
      startOrbit();
    },
    [startOrbit],
  );

  // One source of truth for "go home" — used by both the initial fly-in
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

      stopFlightTracking();
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

        // Treat either a Cartesian3 point OR a very tight Rectangle (< 0.02°
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
        stopOrbit(); // cancel any running orbit before flying
        setAutoBuildingsMode(isLandmark);
        orbitLandmarkHeightRef.current = 0;
        if (isLandmark && landmarkPoint) {
          orbitTargetRef.current = landmarkPoint;
        } else {
          orbitTargetRef.current = null;
        }
        // Keep precise landmarks direct, but restore staged long-haul travel
        // for broader searches so the flyover feels smooth again.
        flyObliqueToDestination(viewer, chosen.destination, isLandmark);

        // Auto-start orbit after the camera finishes landing on a landmark.
        // Uses camera.moveEnd rather than flyTo's complete callback because
        // complete is not guaranteed to fire across chained/staged flights.
        // The distance guard prevents intermediate multi-stage stops (~12 Mm
        // overhead) from triggering — only the final ~350 m landing qualifies.
        if (isLandmark && orbitTargetRef.current) {
          const groundTarget = orbitTargetRef.current;
          // Capture the pending-auto-orbit rev at listener registration.
          // If stopOrbit fires (user interaction) before the camera lands,
          // or a newer search arms a replacement listener, the captured rev
          // goes stale and this listener self-removes without calling
          // startOrbit — so orbit cannot come back after user interaction.
          const rev = ++pendingAutoOrbitRevRef.current;
          const removeListener = viewer.camera.moveEnd.addEventListener(() => {
            if (pendingAutoOrbitRevRef.current !== rev) { removeListener(); return; }
            const dist = Cartesian3.distance(viewer.camera.position, groundTarget);
            if (dist < 2_000) { // camera has landed near the landmark
              removeListener();
              if (!orbitEnabledRef.current) {
                // Refine the orbit axis to the visual center of the structure.
                // Geocoder Cartesian3 is at ground/sea level (height ≈ 0); the
                // actual structure rises above it. Sampling terrain height then
                // lifting by half the estimated structure height means the orbit
                // loop's lookAt frames the object as the scene subject rather
                // than the ground beneath it.
                refineLandmarkOrbitFrom3D(groundTarget, rev);
              }
            }
          });
        }
        if (!isLandmark && chosen.destination instanceof Rectangle) {
          const rect = chosen.destination;
          const rev = ++pendingAutoOrbitRevRef.current;
          const removeListener = viewer.camera.moveEnd.addEventListener(() => {
            if (pendingAutoOrbitRevRef.current !== rev) { removeListener(); return; }
            removeListener();
            if (orbitEnabledRef.current) return;

            orbitTargetRef.current = Cartesian3.fromRadians(
              (rect.east + rect.west) / 2,
              (rect.north + rect.south) / 2,
              0,
            );
            orbitLandmarkHeightRef.current = 0;
            orbitRangeRef.current = Cartesian3.distance(
              viewer.camera.position,
              orbitTargetRef.current,
            );
            startOrbit();
          });
        }
      } catch (err) {
        console.error('[Explorer] Geocoding failed:', err);
      }
    },
    [
      cancelAutoLandmarkExperience,
      refineLandmarkOrbitFrom3D,
      setAutoBuildingsMode,
      startOrbit,
      stopFlightTracking,
      stopOrbit,
    ],
  );

  // ── Chase cam (Drone) ────────────────────────────────────────────────────
  // Camera locked BEHIND the plane, always follows it.
  // User cannot look around; the view is fixed to trail the aircraft.
  const toggleSelectedFlightDrone = useCallback(() => {
    if (!selectedFlight) return;

    if (droneFlightIdRef.current === selectedFlight.id) {
      stopFlightTracking();
      return;
    }

    cancelAutoLandmarkExperience();
    stopFlightTracking();

    const flightId = selectedFlight.id;
    const viewer = viewerRef.current?.cesiumElement;
    if (!viewer || viewer.isDestroyed()) return;

    const liveFlight = flightRecordsRef.current.get(flightId) ?? selectedFlight;
    const ageSeconds = Math.min(20, Math.max(0, Date.now() / 1000 - liveFlight.timestamp));
    const target = getFlightCameraTarget(liveFlight, ageSeconds);
    // Place camera behind: heading + 180°, pitch -20°, distance ~1km.
    const speed = Math.max(60, liveFlight.speedMetersPerSecond);
    const alt = Math.max(0, liveFlight.altitudeMeters);
    const range = CesiumMath.clamp(speed * 2.5 + alt * 0.07, 350, 2_200);
    const chaseOffset = new HeadingPitchRange(
      CesiumMath.toRadians(liveFlight.headingDegrees) + Math.PI,
      CesiumMath.toRadians(-20),
      range,
    );

    viewer.camera.lookAtTransform(Matrix4.IDENTITY);
    viewer.camera.flyToBoundingSphere(new BoundingSphere(target, 1), {
      duration: 1.5,
      offset: chaseOffset,
      easingFunction: FLIGHT_EASING,
      complete: () => {
        if (selectedFlightIdRef.current !== flightId) return;
        const activeViewer = viewerRef.current?.cesiumElement;
        const refreshed = flightRecordsRef.current.get(flightId);
        if (!activeViewer || activeViewer.isDestroyed() || !refreshed) return;
        const liveAgeSeconds = Math.min(20, Math.max(0, Date.now() / 1000 - refreshed.timestamp));
        const liveTarget = getFlightCameraTarget(refreshed, liveAgeSeconds);
        const liveSpeed = Math.max(60, refreshed.speedMetersPerSecond);
        const liveAlt = Math.max(0, refreshed.altitudeMeters);
        const liveRange = CesiumMath.clamp(liveSpeed * 2.5 + liveAlt * 0.07, 350, 2_200);
        const liveOffset = new HeadingPitchRange(
          CesiumMath.toRadians(refreshed.headingDegrees) + Math.PI,
          CesiumMath.toRadians(-20),
          liveRange,
        );
        droneFlightIdRef.current = flightId;
        setDroneFlightId(flightId);
        activeViewer.camera.lookAt(liveTarget, liveOffset);
        activeViewer.scene.requestRender();
      },
    });
  }, [
    cancelAutoLandmarkExperience,
    selectedFlight,
    stopFlightTracking,
  ]);

  // ── Cockpit mode ─────────────────────────────────────────────────────────
  // Camera rides ON the plane. User can look 360° freely.
  // All Cesium inputs stay enabled; position is re-locked to the plane
  // every frame, so panning only changes the view direction.
  const toggleSelectedFlightCockpit = useCallback(() => {
    if (!selectedFlight) return;

    if (cockpitFlightIdRef.current === selectedFlight.id) {
      stopFlightTracking();
      return;
    }

    cancelAutoLandmarkExperience();
    stopFlightTracking();

    const flightId = selectedFlight.id;
    const viewer = viewerRef.current?.cesiumElement;
    if (!viewer || viewer.isDestroyed()) return;

    const liveFlight = flightRecordsRef.current.get(flightId) ?? selectedFlight;
    const ageSeconds = Math.min(20, Math.max(0, Date.now() / 1000 - liveFlight.timestamp));
    const entry = getDroneCockpitEntry(liveFlight, ageSeconds);

    viewer.camera.lookAtTransform(Matrix4.IDENTITY);

    viewer.camera.flyTo({
      destination: entry.destination,
      orientation: entry.orientation,
      duration: 1.6,
      easingFunction: FLIGHT_EASING,
      complete: () => {
        if (selectedFlightIdRef.current !== flightId) return;
        const activeViewer = viewerRef.current?.cesiumElement;
        if (!activeViewer || activeViewer.isDestroyed()) return;
        cockpitFlightIdRef.current = flightId;
        setCockpitFlightId(flightId);
        activeViewer.scene.requestRender();
      },
    });
  }, [
    cancelAutoLandmarkExperience,
    selectedFlight,
    stopFlightTracking,
  ]);


  const toggleSelectedFlightTracking = useCallback(() => {
    if (!selectedFlight) return;

    if (trackedFlightIdRef.current === selectedFlight.id) {
      stopFlightTracking();
      return;
    }

    cancelAutoLandmarkExperience();
    stopFlightTracking();

    const flightId = selectedFlight.id;
    const viewer = viewerRef.current?.cesiumElement;
    if (viewer && !viewer.isDestroyed()) {
      trackedFlightViewRef.current = getFlightCameraOffset(
        viewer,
        getFlightCameraTarget(selectedFlight, 0),
      );
    }

    focusFlight(selectedFlight, {
      duration: 1.4,
      secondsAhead: 0,
      complete: () => {
        if (selectedFlightIdRef.current !== flightId) return;

        const viewer = viewerRef.current?.cesiumElement;
        const liveFlight = flightRecordsRef.current.get(flightId);
        if (!viewer || viewer.isDestroyed() || !liveFlight) return;

        trackedFlightIdRef.current = flightId;
        setTrackedFlightId(flightId);
        const trackingOffset =
          trackedFlightViewRef.current ??
          getFlightCameraOffset(
            viewer,
            getFlightCameraTarget(liveFlight, FLIGHT_TRACK_SECONDS_AHEAD),
          );
        viewer.camera.lookAt(
          getFlightCameraTarget(liveFlight, FLIGHT_TRACK_SECONDS_AHEAD),
          trackingOffset,
        );
        viewer.scene.requestRender();
      },
    });
  }, [
    cancelAutoLandmarkExperience,
    focusFlight,
    selectedFlight,
    stopFlightTracking,
  ]);

  useEffect(() => {
    if (!ionToken) {
      console.warn(
        '[Explorer] VITE_CESIUM_ION_TOKEN is not set.\n' +
        'Copy explorer/.env.example to explorer/.env and paste your Cesium Ion token.\n' +
        'Get a token at https://ion.cesium.com/tokens.',
      );
    }

    const viewer = viewerRef.current?.cesiumElement;
    if (!viewer) return;

    const { destination, orientation } = buildHome();

    // 1) Instant setView to a pulled-back India position. This anchors
    //    the first painted frame over India — no US flash — even though
    //    our fly-in below takes ~2s to settle.
    viewer.camera.setView({
      destination: Cartesian3.fromDegrees(
        HOME_VIEW.lon,
        HOME_VIEW.lat,
        HOME_VIEW.height * 1.6, // start further out so we can fly in
      ),
      orientation,
    });

    // 2) Smooth cinematic fly-in to the final home view.
    viewer.camera.flyTo({
      destination,
      orientation,
      duration: 2.5,
      easingFunction: FLIGHT_EASING,
    });

    // 3) Navigation tuning — zoom feel + LOD smoothness.
    //    Goal: heavier zoom that moves less per scroll tick, gradual
    //    country→state→city progression, and tiles that can keep up.
    const controller = viewer.scene.screenSpaceCameraController;

    // --- Zoom feel ---------------------------------------------------------
    // inertiaZoom is constant — high value gives a weighted, deliberate coast.
    controller.inertiaZoom = 0.95;

    // _zoomFactor and maximumMovementRatio are altitude-aware: updated on
    // every camera.changed event so city-level zoom is fine and global-level
    // zoom can move faster. See updateZoomForAltitude below.

    // --- Zoom bounds (safety) ---------------------------------------------
    // Can't punch through terrain, can't zoom past Earth.
    controller.minimumZoomDistance = 30; // meters
    controller.maximumZoomDistance = 40_000_000; // meters (~Earth diameter)
    controller.enableCollisionDetection = true;

    // --- Pan / rotate feel (leave natural) --------------------------------
    // Defaults already feel right; set explicitly so future edits are obvious.
    controller.inertiaSpin = 0.9;
    controller.inertiaTranslate = 0.9;

    // --- Tile prefetch so the camera doesn't outrun LOD -------------------
    // Load adjacent tiles during pans; cache more revisited tiles.
    viewer.scene.globe.preloadSiblings = true;
    viewer.scene.globe.tileCacheSize = 1000;

    // --- Geocoder (Phase 4: search) ---------------------------------------
    // Cesium's Ion-backed geocoder. Reuses our configured Ion token.
    geocoderRef.current = new IonGeocoderService({ scene: viewer.scene });
    controller.enableTilt = true;

    // --- Labels (Phase 5) -------------------------------------------------
    // Swap base imagery → Bing Aerial WITH Labels so country/city/place
    // names appear on the globe at appropriate zoom levels.
    // Altitude tiers for _zoomFactor and maximumMovementRatio.
    // Both scale together so the feel is consistent:
    //   < 15 km  : street/neighborhood — finest steps, slowest movement
    //   15–500 km: city/regional       — balanced
    //   > 500 km : country/global      — allow faster sweeps
    const updateZoomForAltitude = () => {
      const alt = getCameraCartographic(viewer)?.height ?? HOME_VIEW.height;
      let zoomFactor: number;
      let movementRatio: number;
      if (alt < 15_000) {
        zoomFactor = 1.2;
        movementRatio = 0.008;
      } else if (alt < 500_000) {
        zoomFactor = 1.5;
        movementRatio = 0.02;
      } else {
        zoomFactor = 2.5;
        movementRatio = 0.06;
      }
      (controller as unknown as { _zoomFactor: number })._zoomFactor =
        zoomFactor;
      controller.maximumMovementRatio = movementRatio;
    };

    // Apply immediately so the first frame uses the right tier.
    updateZoomForAltitude();

    // Fire camera.changed only on meaningful motion (1% of viewport).
    // The buildings-load effect (below) owns the tileset itself; this
    // listener keeps visibility and zoom tier in sync with altitude.
    viewer.camera.percentageChanged = 0.01;
    const removeCameraListener = viewer.camera.changed.addEventListener(
      () => {
        updateBuildingsVisibility();
        updateZoomForAltitude();
      },
    );

    return () => {
      removeCameraListener();
    };
  }, [updateBuildingsVisibility]);

  useEffect(() => {
    if (!selectedImageryOption || currentImageryLayersRef.current.length > 0) {
      return;
    }

    applyImageryOption(selectedImageryOption);
  }, [applyImageryOption, selectedImageryOption]);

  useEffect(() => {
    flightsEnabledRef.current = flightsEnabled;
    flightLayerManagerRef.current?.setFlightsVisible(flightsEnabled);
  }, [flightsEnabled]);

  useEffect(() => {
    flightRenderModeRef.current = flightRenderMode;
    flightLayerManagerRef.current?.setFlightRenderMode(flightRenderMode);
  }, [flightRenderMode]);

  useEffect(() => {
    selectedFlightIdRef.current = selectedFlightId;
    setSelectedFlight(
      selectedFlightId ? flightRecordsRef.current.get(selectedFlightId) ?? null : null,
    );
    flightLayerManagerRef.current?.setSelectedFlightId(selectedFlightId);
  }, [selectedFlightId]);

  useEffect(() => {
    showSelectedFlightTrailRef.current = showSelectedFlightTrail;
    flightLayerManagerRef.current?.setShowSelectedTrail(showSelectedFlightTrail);
  }, [showSelectedFlightTrail]);

  useEffect(() => {
    showSelectedFlightRouteRef.current = showSelectedFlightRoute;
  }, [showSelectedFlightRoute]);

  useEffect(() => {
    trackedFlightIdRef.current = trackedFlightId;
  }, [trackedFlightId]);

  useEffect(() => {
    droneFlightIdRef.current = droneFlightId;
  }, [droneFlightId]);

  useEffect(() => {
    showAirportsRef.current = showAirports;
    flightLayerManagerRef.current?.setAirportsVisible(showAirports);
  }, [showAirports]);

  useEffect(() => {
    const activeFlightCameraId = droneFlightId ?? trackedFlightId;
    if (!activeFlightCameraId) return;
    if (!flightsEnabled || selectedFlightId !== activeFlightCameraId) {
      stopFlightTracking();
    }
  }, [
    droneFlightId,
    flightsEnabled,
    selectedFlightId,
    stopFlightTracking,
    trackedFlightId,
  ]);

  useEffect(() => {
    let cancelled = false;
    let rafId = 0;
    let viewerUsed: CesiumViewer | null = null;
    let localLayerManager: FlightSceneLayerManager | null = null;
    let localHandler: ScreenSpaceEventHandler | null = null;
    let attempts = 0;
    const maxAttempts = 600;

    const pollForViewer = () => {
      if (cancelled) return;
      attempts += 1;

      const viewer = viewerRef.current?.cesiumElement;
      const ready = Boolean(viewer) && !viewer!.isDestroyed();
      if (!ready) {
        if (attempts <= maxAttempts) {
          rafId = requestAnimationFrame(pollForViewer);
        }
        return;
      }

      viewerUsed = viewer!;
      const layerManager = new FlightSceneLayerManager(viewerUsed);
      layerManager.setFlightsVisible(flightsEnabledRef.current);
      layerManager.setAirportsVisible(showAirportsRef.current);
      flightLayerManagerRef.current = layerManager;
      localLayerManager = layerManager;

      const initialMode = getFlightRenderMode(
        getCameraCartographic(viewerUsed)?.height ?? HOME_VIEW.height,
      );
      flightRenderModeRef.current = initialMode;
      setFlightRenderMode(initialMode);
      layerManager.setFlightRenderMode(initialMode);
      layerManager.setSelectedFlightId(selectedFlightIdRef.current);
      layerManager.setShowSelectedTrail(showSelectedFlightTrailRef.current);
      if (airportRecordsCacheRef.current.length > 0) {
        layerManager.setGlobalAirports(airportRecordsCacheRef.current);
      }
      if (flightRecordsRef.current.size > 0) {
        layerManager.syncFlights(Array.from(flightRecordsRef.current.values()));
      }
      if (
        showSelectedFlightRouteRef.current &&
        selectedFlightIdRef.current &&
        selectedFlightRouteRef.current?.found
      ) {
        layerManager.setTrackedRoute(
          selectedFlightRouteRef.current,
          selectedFlightIdRef.current,
        );
      }

      const handler = new ScreenSpaceEventHandler(viewerUsed.scene.canvas);
      handler.setInputAction((movement: { position: Cartesian2 }) => {
        const flightId = layerManager.pickFlight(movement.position);
        updateSelectedFlight(flightId);
      }, ScreenSpaceEventType.LEFT_CLICK);

      flightInteractionHandlerRef.current = handler;
      localHandler = handler;
    };

    rafId = requestAnimationFrame(pollForViewer);

    return () => {
      cancelled = true;
      if (rafId) cancelAnimationFrame(rafId);
      if (localHandler) {
        localHandler.destroy();
      }
      flightInteractionHandlerRef.current = null;
      if (localLayerManager) {
        localLayerManager.destroy();
      }
      if (flightLayerManagerRef.current === localLayerManager) {
        flightLayerManagerRef.current = null;
      }
      flightRecordsRef.current.clear();
    };
  }, [updateSelectedFlight]);

  useEffect(() => {
    let cancelled = false;
    let rafId = 0;
    let removeCameraListener: (() => void) | null = null;
    let attempts = 0;
    const maxAttempts = 600;

    const pollForViewer = () => {
      if (cancelled) return;
      attempts += 1;

      const viewer = viewerRef.current?.cesiumElement;
      const ready = Boolean(viewer) && !viewer!.isDestroyed();
      if (!ready) {
        if (attempts <= maxAttempts) {
          rafId = requestAnimationFrame(pollForViewer);
        }
        return;
      }

      const activeViewer = viewer!;
      const updateFlightModeFromCamera = () => {
        const nextMode = getFlightRenderMode(
          getCameraCartographic(activeViewer)?.height ?? HOME_VIEW.height,
        );
        if (nextMode !== flightRenderModeRef.current) {
          flightRenderModeRef.current = nextMode;
          setFlightRenderMode(nextMode);
        }
      };

      updateFlightModeFromCamera();
      removeCameraListener = activeViewer.camera.changed.addEventListener(
        updateFlightModeFromCamera,
      );
    };

    rafId = requestAnimationFrame(pollForViewer);

    return () => {
      cancelled = true;
      if (rafId) cancelAnimationFrame(rafId);
      removeCameraListener?.();
    };
  }, []);

  useEffect(() => {
    if (!flightsEnabled) return;

    let cancelled = false;
    let activeController: AbortController | null = null;
    let refreshTimer = 0;

    const loadFlights = async () => {
      if (cancelled) return;

      activeController?.abort();
      activeController = new AbortController();

      setFlightFeed((current) =>
        current.status === 'live' || current.status === 'fallback'
          ? current
          : {
              ...current,
              status: 'loading',
              sourceLabel: 'Connecting',
              message: 'Loading live flight traffic...',
            },
      );

      try {
        const snapshot = await fetchFlightSnapshot(activeController.signal);
        if (cancelled) return;

        syncFlightLayers(snapshot.flights);
        setFlightFeed({
          status: snapshot.source === 'mock' ? 'fallback' : 'live',
          sourceLabel:
            snapshot.source === 'mock'
              ? 'Mock fallback'
              : snapshot.authMode === 'oauth'
                ? 'OpenSky OAuth'
                : 'OpenSky anonymous',
          message:
            snapshot.source === 'mock'
              ? snapshot.error
                ? `Fallback active: ${snapshot.error}`
                : 'Using fallback traffic feed.'
              : `${snapshot.flights.length} flights visible on the globe.`,
          fetchedAt: snapshot.fetchedAt,
          flightCount: snapshot.flights.length,
          totalAvailable: snapshot.totalAvailable,
        });
      } catch (error) {
        if (cancelled || activeController.signal.aborted) return;

        console.error('[Explorer] Flight feed failed:', error);
        setFlightFeed({
          status: 'error',
          sourceLabel: 'Offline',
          message:
            error instanceof Error
              ? error.message
              : 'Flight feed is temporarily unavailable.',
          fetchedAt: null,
          flightCount: 0,
          totalAvailable: 0,
        });
      }
    };

    void loadFlights();
    refreshTimer = window.setInterval(loadFlights, FLIGHT_POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      activeController?.abort();
      window.clearInterval(refreshTimer);
    };
  }, [flightsEnabled, syncFlightLayers]);

  useEffect(() => {
    if (!showAirports) return;
    if (airportsLoadedRef.current || airportsLoadingRef.current) return;

    let cancelled = false;
    const controller = new AbortController();
    airportsLoadingRef.current = true;
    setAirportLayerMessage('Loading the full airport dataset from the local proxy...');

    void fetchAirports(controller.signal)
      .then((airports) => {
        if (cancelled) return;
        airportsLoadedRef.current = true;
        airportRecordsCacheRef.current = airports;
        flightLayerManagerRef.current?.setGlobalAirports(airports);
        setAirportLayerMessage(`${airports.length} airports ready.`);
      })
      .catch((error) => {
        if (cancelled || controller.signal.aborted) return;
        console.error('[Explorer] Airport layer failed:', error);
        setAirportLayerMessage(
          error instanceof Error
            ? `Airport layer unavailable: ${error.message}`
            : 'Airport layer is temporarily unavailable.',
        );
      })
      .finally(() => {
        airportsLoadingRef.current = false;
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [showAirports]);

  useEffect(() => {
    selectedFlightRouteRef.current = selectedFlightRoute;
  }, [selectedFlightRoute]);

  useEffect(() => {
    if (!showSelectedFlightRoute || !selectedFlightId || !flightsEnabled) {
      setSelectedFlightRoute(null);
      selectedFlightRouteRef.current = null;
      flightLayerManagerRef.current?.setTrackedRoute(null, null);
      return;
    }

    const routeFlight = flightRecordsRef.current.get(selectedFlightId);
    const callsign = routeFlight?.callsign?.trim() ?? '';
    if (!callsign) {
      const unavailableRoute: FlightRouteSnapshot = {
        callsign: null,
        found: false,
        origin: null,
        destination: null,
        error: 'This flight does not have a usable callsign for route lookup.',
      };
      setSelectedFlightRoute(unavailableRoute);
      selectedFlightRouteRef.current = unavailableRoute;
      flightLayerManagerRef.current?.setTrackedRoute(null, selectedFlightId);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    setSelectedFlightRoute(null);
    selectedFlightRouteRef.current = null;
    flightLayerManagerRef.current?.setTrackedRoute(null, null);

    void fetchFlightRoute(callsign, controller.signal)
      .then((route) => {
        if (cancelled) return;
        setSelectedFlightRoute(route);
        selectedFlightRouteRef.current = route;
        flightLayerManagerRef.current?.setTrackedRoute(route.found ? route : null, selectedFlightId);
      })
      .catch((error) => {
        if (cancelled || controller.signal.aborted) return;
        console.error('[Explorer] Route lookup failed:', error);
        const failedRoute: FlightRouteSnapshot = {
          callsign,
          found: false,
          origin: null,
          destination: null,
          error:
            error instanceof Error
              ? error.message
              : 'The route service is temporarily unavailable.',
        };
        setSelectedFlightRoute(failedRoute);
        selectedFlightRouteRef.current = failedRoute;
        flightLayerManagerRef.current?.setTrackedRoute(null, selectedFlightId);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [flightsEnabled, selectedFlightId, showSelectedFlightRoute]);

  useEffect(() => {
    if (!trackedFlightId) return;

    let cancelled = false;
    let rafId = 0;
    let removePostRender: (() => void) | null = null;
    let attempts = 0;
    const maxAttempts = 600;

    const pollForViewer = () => {
      if (cancelled) return;
      attempts += 1;

      const viewer = viewerRef.current?.cesiumElement;
      const ready = Boolean(viewer) && !viewer!.isDestroyed();
      if (!ready) {
        if (attempts <= maxAttempts) {
          rafId = requestAnimationFrame(pollForViewer);
        }
        return;
      }

      const activeViewer = viewer!;
      const syncTrackedFlightCamera = () => {
        if (cancelled || activeViewer.isDestroyed()) return;

        const activeFlightId = trackedFlightIdRef.current;
        if (!activeFlightId) return;

        const liveFlight = flightRecordsRef.current.get(activeFlightId);
        if (!liveFlight) {
          stopFlightTracking();
          return;
        }

        const trackingOffset =
          trackedFlightViewRef.current ??
          getFlightCameraOffset(
            activeViewer,
            getFlightCameraTarget(liveFlight, FLIGHT_TRACK_SECONDS_AHEAD),
          );
        activeViewer.camera.lookAt(
          getFlightCameraTarget(liveFlight, FLIGHT_TRACK_SECONDS_AHEAD),
          trackingOffset,
        );
      };

      syncTrackedFlightCamera();
      removePostRender = activeViewer.scene.postRender.addEventListener(
        syncTrackedFlightCamera,
      );
    };

    rafId = requestAnimationFrame(pollForViewer);

    return () => {
      cancelled = true;
      if (rafId) cancelAnimationFrame(rafId);
      removePostRender?.();
    };
  }, [stopFlightTracking, trackedFlightId]);

  useEffect(() => {
    if (!droneFlightId) return;

    let cancelled = false;
    let rafId = 0;
    let removePostRender: (() => void) | null = null;
    let attempts = 0;
    const maxAttempts = 600;

    const pollForViewer = () => {
      if (cancelled) return;
      attempts += 1;

      const viewer = viewerRef.current?.cesiumElement;
      const ready = Boolean(viewer) && !viewer!.isDestroyed();
      if (!ready) {
        if (attempts <= maxAttempts) {
          rafId = requestAnimationFrame(pollForViewer);
        }
        return;
      }

      const activeViewer = viewer!;
      const syncDroneFlightCamera = () => {
        if (cancelled || activeViewer.isDestroyed()) return;

        const activeFlightId = droneFlightIdRef.current;
        if (!activeFlightId) return;

        const liveFlight = flightRecordsRef.current.get(activeFlightId);
        if (!liveFlight) {
          stopFlightTracking();
          return;
        }

        // ── Cockpit / rider mode ────────────────────────────────────────────
        // Move the camera WITH the plane each frame, but preserve whatever
        // direction the user is currently looking (allowing free 360° look).
        //
        // Strategy: compute the plane's world position, build a position 30 m
        // above it in the local ENU frame, then call setView with:
        //   • destination = that world position  (camera moves with plane)
        //   • orientation = current camera direction/up  (user keeps their view)
        const ageSeconds = Math.min(
          20,
          Math.max(0, Date.now() / 1000 - liveFlight.timestamp),
        );
        const planeCenter = getFlightCameraTarget(liveFlight, ageSeconds);
        const enuTransform = Transforms.eastNorthUpToFixedFrame(planeCenter);
        const cockpitOffset = new Cartesian3(0, 0, 30); // 30 m above plane
        const cockpitPos = Matrix4.multiplyByPoint(enuTransform, cockpitOffset, new Cartesian3());

        // Snapshot current look direction before setView overwrites it.
        const dir = Cartesian3.clone(activeViewer.camera.directionWC, new Cartesian3());
        const up  = Cartesian3.clone(activeViewer.camera.upWC, new Cartesian3());

        activeViewer.camera.setView({
          destination: cockpitPos,
          orientation: { direction: dir, up },
        });
      };


      syncDroneFlightCamera();
      removePostRender = activeViewer.scene.postRender.addEventListener(
        syncDroneFlightCamera,
      );
    };

    rafId = requestAnimationFrame(pollForViewer);

    return () => {
      cancelled = true;
      if (rafId) cancelAnimationFrame(rafId);
      removePostRender?.();
    };
  }, [droneFlightId, stopFlightTracking]);

  // ── Cockpit position-lock loop ──────────────────────────────────────────
  // Keeps camera AT the plane each frame while preserving user orientation.
  useEffect(() => {
    if (!cockpitFlightId) return;
    let cancelled = false;
    let rafId = 0;
    let removePostRender: (() => void) | undefined;

    const pollForViewer = () => {
      if (cancelled) return;
      const viewer = viewerRef.current?.cesiumElement;
      if (!viewer || viewer.isDestroyed()) {
        rafId = requestAnimationFrame(pollForViewer);
        return;
      }

      const syncCockpitCamera = () => {
        if (cancelled || viewer.isDestroyed()) return;
        const activeCockpitId = cockpitFlightIdRef.current;
        if (!activeCockpitId) return;

        const liveFlight = flightRecordsRef.current.get(activeCockpitId);
        if (!liveFlight) { stopFlightTracking(); return; }

        const ageSeconds = Math.min(20, Math.max(0, Date.now() / 1000 - liveFlight.timestamp));
        const planeCenter = getFlightCameraTarget(liveFlight, ageSeconds);
        const enuTransform = Transforms.eastNorthUpToFixedFrame(planeCenter);
        const cockpitPos = Matrix4.multiplyByPoint(
          enuTransform, new Cartesian3(0, 0, 30), new Cartesian3(),
        );

        // Preserve whatever direction+up the user has set via mouse drag.
        const dir = Cartesian3.clone(viewer.camera.directionWC, new Cartesian3());
        const up  = Cartesian3.clone(viewer.camera.upWC, new Cartesian3());
        viewer.camera.setView({ destination: cockpitPos, orientation: { direction: dir, up } });
      };

      syncCockpitCamera();
      removePostRender = viewer.scene.postRender.addEventListener(syncCockpitCamera);
    };

    rafId = requestAnimationFrame(pollForViewer);
    return () => {
      cancelled = true;
      if (rafId) cancelAnimationFrame(rafId);
      removePostRender?.();
    };
  }, [cockpitFlightId, stopFlightTracking]);

  useEffect(() => {
    const isCockpit = Boolean(cockpitFlightId);
    if (!orbitEnabled && !autoBuildingsEnabled && !trackedFlightId && !droneFlightId && !isCockpit) return;

    const eventCameFromHud = (target: EventTarget | null) =>
      target instanceof Node && Boolean(hudRef.current?.contains(target));

    // For drone/cockpit mode: pointer DRAG = look around (allowed).
    // Stop ONLY on a clean click (pointerdown that becomes pointerup quickly).
    // For orbit/track modes: any interaction stops immediately.
    let pointerDownTime = 0;
    let pointerMoved = false;

    const stopFromInteraction = (event: Event) => {
      if (eventCameFromHud(event.target)) return;
      // Cockpit mode: drag = look around, so don't stop on drag events.
      // Chase/orbit/track modes: stop immediately on any interaction.
      if (isCockpit) return;
      cancelAutoLandmarkExperience();
      stopFlightTracking();
    };
    const stopFromPointerMove = (e: PointerEvent | MouseEvent) => {
      if (eventCameFromHud(e.target)) return;
      if (isCockpit) {
        pointerMoved = true; // drag = look around, NOT a click
        return;
      }
      if ((e as { buttons?: number }).buttons) {
        cancelAutoLandmarkExperience();
        stopFlightTracking();
      }
    };
    const onPointerDown = (e: PointerEvent) => {
      if (!isCockpit || eventCameFromHud(e.target)) return;
      pointerDownTime = Date.now();
      pointerMoved = false;
    };
    const onPointerUp = (e: PointerEvent) => {
      if (!isCockpit || eventCameFromHud(e.target)) return;
      // Quick tap without movement = click → exit cockpit mode.
      if (!pointerMoved && Date.now() - pointerDownTime < 300) {
        stopFlightTracking();
      }
    };
    const listenerOpts = { capture: true, passive: true } as const;

    window.addEventListener('pointerdown', stopFromInteraction, listenerOpts);
    window.addEventListener('mousedown', stopFromInteraction, listenerOpts);
    window.addEventListener('wheel', stopFromInteraction, listenerOpts);
    window.addEventListener('touchstart', stopFromInteraction, listenerOpts);
    window.addEventListener('touchmove', stopFromInteraction, listenerOpts);
    window.addEventListener('pointercancel', stopFromInteraction, listenerOpts);
    window.addEventListener('pointermove', stopFromPointerMove, listenerOpts);
    window.addEventListener('mousemove', stopFromPointerMove, listenerOpts);
    window.addEventListener('keydown', stopFromInteraction, true);
    window.addEventListener('blur', stopFromInteraction, true);
    window.addEventListener('pointerdown', onPointerDown, listenerOpts);
    window.addEventListener('pointerup', onPointerUp, listenerOpts);

    return () => {
      window.removeEventListener('pointerdown', stopFromInteraction, listenerOpts);
      window.removeEventListener('mousedown', stopFromInteraction, listenerOpts);
      window.removeEventListener('wheel', stopFromInteraction, listenerOpts);
      window.removeEventListener('touchstart', stopFromInteraction, listenerOpts);
      window.removeEventListener('touchmove', stopFromInteraction, listenerOpts);
      window.removeEventListener('pointercancel', stopFromInteraction, listenerOpts);
      window.removeEventListener('pointermove', stopFromPointerMove, listenerOpts);
      window.removeEventListener('mousemove', stopFromPointerMove, listenerOpts);
      window.removeEventListener('keydown', stopFromInteraction, true);
      window.removeEventListener('blur', stopFromInteraction, true);
      window.removeEventListener('pointerdown', onPointerDown, listenerOpts);
      window.removeEventListener('pointerup', onPointerUp, listenerOpts);
    };
  }, [
    autoBuildingsEnabled,
    cancelAutoLandmarkExperience,
    cockpitFlightId,
    droneFlightId,
    orbitEnabled,
    stopFlightTracking,
    trackedFlightId,
  ]);


  // ---------------------------------------------------------------------
  // Dedicated Buildings loading effect.
  //
  // Previously this effect read viewerRef.cesiumElement once and aborted
  // permanently if null. Resium populates cesiumElement inside its own
  // mount lifecycle and there's a window where a parent effect can fire
  // before that happens — a single missed frame killed buildings for the
  // whole session.
  //
  // Fix: poll via requestAnimationFrame until the viewer is ready, THEN
  // kick off createOsmBuildingsAsync exactly once. The `cancelled` flag +
  // a ref duplicate-guard + isDestroyed checks make StrictMode double-
  // mount safe, and only one tileset ever attaches.
  // ---------------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    let rafId = 0;
    let localTileset: Cesium3DTileset | null = null;
    let viewerUsed: CesiumViewer | null = null;
    let attempts = 0;
    const maxAttempts = 600; // ~10 s at 60 fps

    const pollForViewer = () => {
      if (cancelled) return;
      attempts += 1;

      const viewer = viewerRef.current?.cesiumElement;
      const ready = Boolean(viewer) && !viewer!.isDestroyed();

      if (!ready) {
        if (attempts > maxAttempts) {
          console.error(
            '[Explorer] OSM Buildings: viewer never became ready — buildings not loaded.',
          );
          return;
        }
        rafId = requestAnimationFrame(pollForViewer);
        return;
      }

      // Viewer is ready — kick off the one-time tileset load.
      const activeViewer = viewer!;
      viewerUsed = activeViewer;

      // `showOutline: false` — Cesium's outline pass disables imagery
      // draping for the tileset, which makes buildings appear to float above
      // the base imagery. Disabling it restores visual grounding.
      createOsmBuildingsAsync({ showOutline: false })
        .then((tileset) => {
          if (cancelled || activeViewer.isDestroyed()) {
            tileset.destroy();
            return;
          }
          if (buildingsRef.current) {
            // StrictMode race: two mount cycles both raced to resolve.
            // First one won — destroy this duplicate.
            tileset.destroy();
            return;
          }

          activeViewer.scene.primitives.add(tileset);
          buildingsRef.current = tileset;
          localTileset = tileset;
          // Keep destination tiles warming up even when the user hasn't
          // manually enabled buildings yet, so landmark searches can land
          // into visible 3D faster.
          tileset.preloadWhenHidden = true;
          tileset.preloadFlightDestinations = true;
          tileset.preferLeaves = true;
          tileset.maximumScreenSpaceError = 8;
          tileset.foveatedScreenSpaceError = false;
          tileset.initialTilesLoaded.addEventListener(() => {
            if (!activeViewer.isDestroyed()) activeViewer.scene.requestRender();
          });

          updateBuildingsVisibilityRef.current();
        })
        .catch((err) => {
          console.error('[Explorer] Failed to load OSM Buildings:', err);
        });
    };

    rafId = requestAnimationFrame(pollForViewer);

    return () => {
      cancelled = true;
      if (rafId) cancelAnimationFrame(rafId);
      if (
        localTileset &&
        !localTileset.isDestroyed() &&
        viewerUsed &&
        !viewerUsed.isDestroyed()
      ) {
        viewerUsed.scene.primitives.remove(localTileset);
      }
      // Only clear the ref if WE set it. In StrictMode, if the second
      // mount's load has attached a different tileset, leave it alone.
      if (buildingsRef.current === localTileset) {
        buildingsRef.current = null;
      }
    };
  }, []);

  const activeLayerCount =
    Number(flightsEnabled) +
    Number(Boolean(buildingsEnabled || autoBuildingsEnabled)) +
    Number(orbitEnabled);

  const currentSection =
    SECTION_TABS.find((section) => section.id === activeSection) ??
    SECTION_TABS[0];

  const renderSoonCard = (label: string) => (
    <div className="layer-card layer-card--soon" key={label}>
      <div className="layer-card__body">
        <p className="layer-card__label">{label}</p>
      </div>
      <span className="layer-badge">Soon</span>
    </div>
  );

  const renderSectionBody = () => {
    switch (activeSection) {
      case 'base':
        return (
          <>
            <div className="layer-flyout-wrap">
              <button
                type="button"
                className={
                  imageryPickerOpen
                    ? 'layer-card layer-card--toggle layer-card--base layer-card--active'
                    : 'layer-card layer-card--toggle layer-card--base'
                }
                onClick={() => setImageryPickerOpen((open) => !open)}
              >
                <span className="layer-card__body">
                  <span className="layer-card__label">Imagery</span>
                  <span className="layer-card__meta">
                    {selectedImageryOption?.name ?? 'Choose a map style'}
                  </span>
                </span>
                <span className="layer-card__action">
                  <span className="layer-card__action-text">Browse</span>
                </span>
              </button>

              <div
                className={
                  imageryPickerOpen
                    ? 'imagery-flyout imagery-flyout--open'
                    : 'imagery-flyout'
                }
              >
                <div className="imagery-flyout__header">
                  <p className="imagery-flyout__eyebrow">Map Styles</p>
                  <h3 className="imagery-flyout__title">Imagery</h3>
                </div>
                <div className="imagery-flyout__grid">
                  {imageryOptions.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      className={
                        option.id === selectedImageryId
                          ? 'imagery-option imagery-option--active'
                          : 'imagery-option'
                      }
                      onClick={() => handleImageryOptionChange(option)}
                      title={option.tooltip}
                    >
                      <img
                        className="imagery-option__thumb"
                        src={option.iconUrl}
                        alt=""
                      />
                      <span className="imagery-option__name">{option.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              type="button"
              className={
                buildingsEnabled || autoBuildingsEnabled
                  ? 'layer-card layer-card--toggle layer-card--base layer-card--active'
                  : 'layer-card layer-card--toggle layer-card--base'
              }
              onClick={toggleBuildings}
            >
              <span className="layer-card__body">
                <span className="layer-card__label">Buildings</span>
                <span className="layer-card__meta">
                  Show grounded 3D city buildings.
                </span>
              </span>
              <span
                className={
                  buildingsEnabled || autoBuildingsEnabled
                    ? 'layer-switch layer-switch--on'
                    : 'layer-switch'
                }
                aria-hidden="true"
              >
                <span className="layer-switch__thumb" />
                <span className="layer-switch__text">
                  {buildingsEnabled || autoBuildingsEnabled ? 'On' : 'Off'}
                </span>
              </span>
            </button>

            <button
              type="button"
              className={
                orbitEnabled
                  ? 'layer-card layer-card--toggle layer-card--base layer-card--active'
                  : 'layer-card layer-card--toggle layer-card--base'
              }
              onClick={toggleOrbit}
            >
              <span className="layer-card__body">
                <span className="layer-card__label">Orbit</span>
                <span className="layer-card__meta">
                  Landmark orbiting around the current globe view.
                </span>
              </span>
              <span
                className={orbitEnabled ? 'layer-switch layer-switch--on' : 'layer-switch'}
                aria-hidden="true"
              >
                <span className="layer-switch__thumb" />
                <span className="layer-switch__text">
                  {orbitEnabled ? 'On' : 'Off'}
                </span>
              </span>
            </button>

            {renderSoonCard('Boundaries')}
            {renderSoonCard('Labels')}
          </>
        );
      case 'intel':
        return (
          <>
            <button
              type="button"
              className={
                flightsEnabled
                  ? 'layer-card layer-card--toggle layer-card--intel layer-card--active'
                  : 'layer-card layer-card--toggle layer-card--intel'
              }
              onClick={toggleFlights}
            >
              <span className="layer-card__body">
                <span className="layer-card__label">Flights</span>
                <span className="layer-card__meta">
                  {flightsEnabled
                    ? flightFeed.message
                    : 'Show live aircraft traffic on the globe.'}
                </span>
              </span>
              <span
                className={flightsEnabled ? 'layer-switch layer-switch--on' : 'layer-switch'}
                aria-hidden="true"
              >
                <span className="layer-switch__thumb" />
                <span className="layer-switch__text">
                  {flightsEnabled ? 'On' : 'Off'}
                </span>
              </span>
            </button>
            <button
              type="button"
              className={
                showAirports
                  ? 'layer-card layer-card--toggle layer-card--intel layer-card--active'
                  : 'layer-card layer-card--toggle layer-card--intel'
              }
              onClick={toggleAirports}
            >
              <span className="layer-card__body">
                <span className="layer-card__label">Airports</span>
                <span className="layer-card__meta">
                  {showAirports
                    ? airportLayerMessage
                    : 'Show every airport with zoom-aware visibility.'}
                </span>
              </span>
              <span
                className={showAirports ? 'layer-switch layer-switch--on' : 'layer-switch'}
                aria-hidden="true"
              >
                <span className="layer-switch__thumb" />
                <span className="layer-switch__text">
                  {showAirports ? 'On' : 'Off'}
                </span>
              </span>
            </button>
            <div className="layer-card layer-card--status">
              <div className="layer-card__body">
                <p className="layer-card__label">Flight Feed</p>
                <p className="layer-card__meta">
                  {flightFeed.fetchedAt
                    ? `${flightFeed.flightCount} shown from ${flightFeed.totalAvailable} available.`
                    : 'Waiting for the first flight snapshot.'}
                </p>
              </div>
              <span
                className={
                  flightFeed.status === 'live'
                    ? 'layer-badge layer-badge--live'
                    : 'layer-badge'
                }
              >
                {flightFeed.status === 'live'
                  ? 'Live'
                  : flightFeed.status === 'fallback'
                    ? 'Mock'
                    : flightFeed.status === 'loading'
                      ? 'Loading'
                      : flightFeed.status === 'error'
                        ? 'Error'
                        : 'Idle'}
              </span>
            </div>
            {renderSoonCard('Satellites')}
            {renderSoonCard('Ships')}
            {renderSoonCard('Events')}
            {renderSoonCard('Airspace')}
            {renderSoonCard('Interference')}
          </>
        );
      case 'visual':
        return (
          <>
            <div className="layer-card layer-card--status">
              <div className="layer-card__body">
                <p className="layer-card__label">Standard View</p>
                <p className="layer-card__meta">
                  The current stable globe look remains active.
                </p>
              </div>
              <span className="layer-badge layer-badge--live">Live</span>
            </div>
            {renderSoonCard('Night Vision')}
            {renderSoonCard('Thermal')}
            {renderSoonCard('CRT')}
            {renderSoonCard('Cinematic')}
          </>
        );
      case 'system':
        return (
          <>
            {renderSoonCard('Performance')}
            {renderSoonCard('Feed Health')}
            {renderSoonCard('Layer Activity')}
            {renderSoonCard('Diagnostics')}
            {renderSoonCard('Experimental')}
          </>
        );
      default:
        return null;
    }
  };

  return (
    <>
      <ResiumViewer
        full
        ref={viewerRef}
        terrain={WORLD_TERRAIN}
        homeButton={false}
        geocoder={false}
        baseLayerPicker={false}
        selectionIndicator={false}
        infoBox={false}
        // Explicit: keep Cesium's built-in Navigation Help widget (the "?"
        // in the top-right toolbar). Click it to open the tilt/rotate/zoom
        // instruction overlay — that's the circular tilt-control diagram.
        sceneModePicker={false}
        navigationHelpButton={false}
        navigationInstructionsInitiallyVisible={false}
      />
      <div className="hud-shell" ref={hudRef}>
        <SearchBox onSearch={flyToPlace} />

        <aside className="layer-sidebar" aria-label="Layer controls">
          <div className="layer-sidebar__panel">
            <div className="layer-tabs" role="tablist" aria-label="Layer groups">
              {SECTION_TABS.map((section) => (
                <button
                  key={section.id}
                  type="button"
                  role="tab"
                  aria-selected={activeSection === section.id}
                  className={
                    activeSection === section.id
                      ? `layer-tab layer-tab--${section.id} layer-tab--active`
                      : `layer-tab layer-tab--${section.id}`
                  }
                  onClick={() => setActiveSection(section.id)}
                >
                  {section.label}
                </button>
              ))}
            </div>

            <section className={`layer-section layer-section--${activeSection}`}>
              <div className="layer-section__header">
                <p className="layer-section__eyebrow">{currentSection.label}</p>
                <h2 className="layer-section__title">{currentSection.title}</h2>
              </div>
              <div className="layer-section__body">{renderSectionBody()}</div>
            </section>
          </div>
        </aside>

        {/* ── Cockpit HUD overlay ─────────────────────────────────────────── */}
        {cockpitFlightId && selectedFlight && (
          <div className="cockpit-hud" aria-label="Cockpit mode HUD">
            <div className="cockpit-hud__badge">✈ COCKPIT MODE</div>
            <div className="cockpit-hud__flight">{
              selectedFlight.callsign?.trim() || selectedFlight.id.toUpperCase()
            }</div>
            {selectedFlightRoute?.found && selectedFlightRoute.origin && selectedFlightRoute.destination && (
              <div className="cockpit-hud__route">
                <span className="cockpit-hud__route-from">
                  {selectedFlightRoute.origin.iataCode || selectedFlightRoute.origin.ident}
                  {selectedFlightRoute.origin.municipality ? ` · ${selectedFlightRoute.origin.municipality}` : ''}
                </span>
                <span className="cockpit-hud__route-arrow">→</span>
                <span className="cockpit-hud__route-to">
                  {selectedFlightRoute.destination.iataCode || selectedFlightRoute.destination.ident}
                  {selectedFlightRoute.destination.municipality ? ` · ${selectedFlightRoute.destination.municipality}` : ''}
                </span>
              </div>
            )}
            <div className="cockpit-hud__stats">
              <span>{formatAltitudeMeters(selectedFlight.altitudeMeters)}</span>
              <span className="cockpit-hud__sep">·</span>
              <span>{formatSpeed(selectedFlight.speedMetersPerSecond)}</span>
              <span className="cockpit-hud__sep">·</span>
              <span>{formatHeading(selectedFlight.headingDegrees)}</span>
            </div>
            <div className="cockpit-hud__hint">Drag to look · Click to exit</div>
          </div>
        )}

        <FlightDetailsPanel
          feed={flightFeed}
          flight={selectedFlight}
          route={showSelectedFlightRoute ? selectedFlightRoute : null}
          isTracking={trackedFlightId === selectedFlight?.id}
          isDroneMode={droneFlightId === selectedFlight?.id}
          isCockpitMode={cockpitFlightId === selectedFlight?.id}
          showRoute={showSelectedFlightRoute}
          showTrail={showSelectedFlightTrail}
          onToggleDrone={toggleSelectedFlightDrone}
          onToggleCockpit={toggleSelectedFlightCockpit}
          onToggleTracking={toggleSelectedFlightTracking}
          onToggleRoute={toggleSelectedFlightRoute}
          onToggleTrail={() => setShowSelectedFlightTrail((enabled) => !enabled)}
          onClose={() => updateSelectedFlight(null)}
        />

        <div className="hud-quick-actions">
          <button
            type="button"
            className="custom-home-button"
            onClick={() => {
              stopFlightTracking();
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
            className="dev-status-trigger"
            onClick={() => setDevStatusOpen((open) => !open)}
            aria-expanded={devStatusOpen}
            aria-controls="dev-status-panel"
          >
            <span>Dev Status</span>
            <span className="dev-status-trigger__badge">{activeLayerCount} Live</span>
          </button>
        </div>

        <aside
          id="dev-status-panel"
          className={
            devStatusOpen
              ? 'dev-status-panel dev-status-panel--open'
              : 'dev-status-panel'
          }
          aria-label="Developer status"
        >
          <div className="dev-status-panel__header">
            <h2 className="dev-status-panel__title">Developer Status</h2>
          </div>
          <div className="dev-status-panel__body">
            <div className="dev-status-row">
              <span className="dev-status-row__label">Active group</span>
              <span className="dev-status-row__value">{currentSection.label}</span>
            </div>
            <div className="dev-status-row">
              <span className="dev-status-row__label">Imagery</span>
              <span className="dev-status-row__value">
                {selectedImageryOption?.name ?? 'Unavailable'}
              </span>
            </div>
            <div className="dev-status-row">
              <span className="dev-status-row__label">Scene</span>
              <span className="dev-status-row__value">3D only</span>
            </div>
            <div className="dev-status-row">
              <span className="dev-status-row__label">Buildings</span>
              <span className="dev-status-row__value">
                {buildingsEnabled || autoBuildingsEnabled ? 'On' : 'Off'}
              </span>
            </div>
            <div className="dev-status-row">
              <span className="dev-status-row__label">Flights</span>
              <span className="dev-status-row__value">
                {flightsEnabled ? `${flightFeed.flightCount} active` : 'Off'}
              </span>
            </div>
            <div className="dev-status-row">
              <span className="dev-status-row__label">Flight feed</span>
              <span className="dev-status-row__value">{flightFeed.sourceLabel}</span>
            </div>
            <div className="dev-status-row">
              <span className="dev-status-row__label">Orbit</span>
              <span className="dev-status-row__value">
                {orbitEnabled ? 'On' : 'Off'}
              </span>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}

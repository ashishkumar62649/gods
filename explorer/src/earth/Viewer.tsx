import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Camera,
  Cartesian3,
  Cartographic,
  Cesium3DTileset,
  Ion,
  IonGeocoderService,
  IonImageryProvider,
  Math as CesiumMath,
  Rectangle,
  Viewer as CesiumViewer,
  createOsmBuildingsAsync,
} from 'cesium';
import { CesiumComponentRef, Viewer as ResiumViewer } from 'resium';
import SearchBox from './SearchBox';
import BuildingsToggle from './BuildingsToggle';

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

/** Cesium Ion asset id for Bing Maps Aerial WITH labels. */
const BING_AERIAL_WITH_LABELS_ASSET_ID = 3;

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
  });
}

/**
 * Tier-based cinematic fly: classify geocoder destination by size, then
 * land with progressively more oblique pitch for closer tiers so 3D
 * buildings read as standing up (not flattened top-down).
 *
 *   Landmark (< 2 km)    → 600 m,  pitch -45°  (strong oblique)
 *   City     (< 55 km)   → scaled, pitch -55°  (medium oblique)
 *   Region   (< 1100 km) → scaled, pitch -70°  (gentle tilt)
 *   Country+ (>= 1100 km) → default rectangle framing (top-down OK at
 *     that scale; tilt would feel wrong across continents)
 */
function flyObliqueToDestination(
  viewer: CesiumViewer,
  destination: Rectangle | Cartesian3,
) {
  // Point result from the geocoder — treat as landmark-tier.
  if (destination instanceof Cartesian3) {
    const carto = Cartographic.fromCartesian(destination);
    flyObliqueToPoint(
      viewer,
      CesiumMath.toDegrees(carto.longitude),
      CesiumMath.toDegrees(carto.latitude),
      600,
      -45,
    );
    return;
  }

  // Rectangle result — classify by diagonal span.
  const rect = destination;
  const widthDeg = CesiumMath.toDegrees(Math.abs(rect.east - rect.west));
  const heightDeg = CesiumMath.toDegrees(Math.abs(rect.north - rect.south));
  const diagDeg = Math.sqrt(widthDeg * widthDeg + heightDeg * heightDeg);
  const diagMeters = diagDeg * METERS_PER_DEG_LAT;
  const centerLonDeg = CesiumMath.toDegrees((rect.east + rect.west) / 2);
  const centerLatDeg = CesiumMath.toDegrees((rect.north + rect.south) / 2);

  if (diagDeg < 0.02) {
    flyObliqueToPoint(viewer, centerLonDeg, centerLatDeg, 600, -45);
  } else if (diagDeg < 0.5) {
    const altitude = Math.max(2000, diagMeters * 1.2);
    flyObliqueToPoint(viewer, centerLonDeg, centerLatDeg, altitude, -55);
  } else if (diagDeg < 10) {
    const altitude = Math.max(30_000, diagMeters * 1.5);
    flyObliqueToPoint(viewer, centerLonDeg, centerLatDeg, altitude, -70);
  } else {
    // Country or bigger: top-down rectangle framing (tilted feels wrong
    // across continents, and buildings aren't the point at this scale).
    viewer.camera.flyTo({ destination: rect, duration: 2 });
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

  // User toggle state for the buildings layer. Effective visibility is
  // `buildingsEnabled && altitudeOK` — the altitude gate lives in the
  // camera-changed listener below.
  const [buildingsEnabled, setBuildingsEnabled] = useState(true);
  // Ref mirror so the camera-changed listener can read the latest value
  // without being recreated on every toggle.
  const buildingsEnabledRef = useRef(buildingsEnabled);

  /**
   * Compute and apply the buildings tileset's effective `.show` based on
   * both inputs: user toggle and current camera altitude. Called from the
   * camera-changed listener and from the toggle handler.
   */
  const updateBuildingsVisibility = useCallback(() => {
    const viewer = viewerRef.current?.cesiumElement;
    const tileset = buildingsRef.current;
    if (!viewer || !tileset) {
      // [DEBUG] early-bail — one of the refs isn't ready.
      console.log('[buildings] updateVisibility bail — refs:', {
        viewer: Boolean(viewer),
        tileset: Boolean(tileset),
      });
      return;
    }
    const altitude = viewer.camera.positionCartographic.height;
    const altitudeOK = altitude < BUILDINGS_ALTITUDE_THRESHOLD;
    const nextShow = buildingsEnabledRef.current && altitudeOK;
    // [DEBUG] altitude + toggle + resulting show value.
    console.log('[buildings] updateVisibility:', {
      altitudeMeters: Math.round(altitude),
      threshold: BUILDINGS_ALTITUDE_THRESHOLD,
      altitudeOK,
      userEnabled: buildingsEnabledRef.current,
      nextShow,
      prevShow: tileset.show,
    });
    tileset.show = nextShow;
  }, []);

  const toggleBuildings = useCallback(() => {
    setBuildingsEnabled((prev) => !prev);
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
  const updateBuildingsVisibilityRef = useRef<() => void>(() => {});
  useEffect(() => {
    updateBuildingsVisibilityRef.current = updateBuildingsVisibility;
  }, [updateBuildingsVisibility]);

  // One source of truth for "go home" — used by both the initial fly-in
  // and the custom Home button so they can never drift apart.
  const flyHome = useCallback((duration = 2) => {
    const viewer = viewerRef.current?.cesiumElement;
    if (!viewer) return;
    const { destination, orientation } = buildHome();
    viewer.camera.flyTo({ destination, orientation, duration });
  }, []);

  /**
   * Geocode a free-text place query via Cesium Ion and fly to the first
   * result. Result destinations are typically Rectangles, which `flyTo`
   * frames at a sensible altitude for the area size — so a tiny landmark
   * lands at low altitude and a country lands high, automatically.
   */
  const flyToPlace = useCallback(async (query: string) => {
    const viewer = viewerRef.current?.cesiumElement;
    if (!viewer) {
      console.warn('[Explorer] Search called before viewer was ready.');
      return;
    }

    // Lazy-instantiate so mount-ordering can never leave us without a
    // geocoder. If the mount effect already created one, reuse it;
    // otherwise create one on first use.
    if (!geocoderRef.current) {
      try {
        geocoderRef.current = new IonGeocoderService({ scene: viewer.scene });
      } catch (err) {
        console.error(
          '[Explorer] Failed to create IonGeocoderService:',
          err,
        );
        return;
      }
    }
    const geocoder = geocoderRef.current;

    try {
      const results = await geocoder.geocode(query);
      if (!results.length) {
        console.warn(`[Explorer] No geocoding results for "${query}".`);
        return;
      }
      flyObliqueToDestination(viewer, results[0].destination);
    } catch (err) {
      console.error('[Explorer] Geocoding failed:', err);
    }
  }, []);

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
    viewer.camera.flyTo({ destination, orientation, duration: 2.5 });

    // 3) Navigation tuning — zoom feel + LOD smoothness.
    //    Goal: heavier zoom that moves less per scroll tick, gradual
    //    country→state→city progression, and tiles that can keep up.
    const controller = viewer.scene.screenSpaceCameraController;

    // --- Zoom feel ---------------------------------------------------------
    // Per-scroll distance step. `_zoomFactor` is an internal field (leading
    // underscore) but is the canonical lever for this and has been stable
    // across Cesium versions. Default 5.0 → 2.0 halves the step.
    (controller as unknown as { _zoomFactor: number })._zoomFactor = 2.0;

    // Higher = more glide / heavier feel when the scroll stops.
    controller.inertiaZoom = 0.92;

    // Each input moves this fraction of the distance-to-surface. Smaller =
    // no country→city jumps; zoom progresses through intermediate altitudes.
    controller.maximumMovementRatio = 0.05;

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

    // --- Labels (Phase 5) -------------------------------------------------
    // Swap base imagery → Bing Aerial WITH Labels so country/city/place
    // names appear on the globe at appropriate zoom levels.
    let labelsMounted = true;
    IonImageryProvider.fromAssetId(BING_AERIAL_WITH_LABELS_ASSET_ID)
      .then((labeledImagery) => {
        if (!labelsMounted) return;
        viewer.imageryLayers.removeAll();
        viewer.imageryLayers.addImageryProvider(labeledImagery);
      })
      .catch((err) => {
        console.error(
          '[Explorer] Failed to load labeled imagery (asset 3):',
          err,
        );
      });

    // Fire camera.changed only on meaningful motion (1% of viewport).
    // The buildings-load effect (below) owns the tileset itself; this
    // listener just keeps its visibility in sync with altitude.
    viewer.camera.percentageChanged = 0.01;
    const removeCameraListener = viewer.camera.changed.addEventListener(
      () => {
        updateBuildingsVisibility();
      },
    );

    return () => {
      labelsMounted = false;
      removeCameraListener();
    };
  }, [updateBuildingsVisibility]);

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
    console.log(
      '[BUILDINGS-LOAD] Step 1: effect entered — polling for viewer readiness',
    );

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

      // Log first attempt and every ~0.5 s thereafter to avoid spam.
      if (attempts === 1 || attempts % 30 === 0) {
        console.log(
          `[BUILDINGS-LOAD] Step 2: viewer-ready poll #${attempts}`,
          {
            hasCesiumElement: Boolean(viewer),
            destroyed: viewer?.isDestroyed?.(),
            ready,
          },
        );
      }

      if (!ready) {
        if (attempts > maxAttempts) {
          console.error(
            `[BUILDINGS-LOAD] TIMEOUT — viewer never ready after ${maxAttempts} frames`,
          );
          return;
        }
        rafId = requestAnimationFrame(pollForViewer);
        return;
      }

      // Viewer is ready — kick off the one-time tileset load.
      const activeViewer = viewer!;
      viewerUsed = activeViewer;
      console.log(
        `[BUILDINGS-LOAD] Step 3: viewer ready after ${attempts} attempts — calling createOsmBuildingsAsync`,
      );

      createOsmBuildingsAsync()
        .then((tileset) => {
          console.log('[BUILDINGS-LOAD] Step 4: tileset load RESOLVED', {
            cancelled,
            viewerDestroyed: activeViewer.isDestroyed(),
            alreadyAttached: Boolean(buildingsRef.current),
          });

          if (cancelled || activeViewer.isDestroyed()) {
            console.log(
              '[BUILDINGS-LOAD] Step 4a: late resolve — destroying tileset',
            );
            tileset.destroy();
            return;
          }
          if (buildingsRef.current) {
            // StrictMode race: two mount cycles both raced to resolve.
            // First one won — destroy this duplicate.
            console.log(
              '[BUILDINGS-LOAD] Step 4b: duplicate load — destroying',
            );
            tileset.destroy();
            return;
          }

          activeViewer.scene.primitives.add(tileset);
          buildingsRef.current = tileset;
          localTileset = tileset;
          console.log('[BUILDINGS-LOAD] Step 5: tileset attached', {
            primitiveCount: activeViewer.scene.primitives.length,
            refSet: Boolean(buildingsRef.current),
          });

          updateBuildingsVisibilityRef.current();
          console.log(
            '[BUILDINGS-LOAD] Step 6: initial visibility update fired',
          );
        })
        .catch((err) => {
          console.error(
            '[BUILDINGS-LOAD] createOsmBuildingsAsync FAILED:',
            err,
          );
        });
    };

    rafId = requestAnimationFrame(pollForViewer);

    return () => {
      console.log('[BUILDINGS-LOAD] cleanup', {
        attempts,
        hasLocalTileset: Boolean(localTileset),
      });
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

  return (
    <>
      <ResiumViewer
        full
        ref={viewerRef}
        homeButton={false}
        geocoder={false}
        // Explicit: keep Cesium's built-in Navigation Help widget (the "?"
        // in the top-right toolbar). Click it to open the tilt/rotate/zoom
        // instruction overlay — that's the circular tilt-control diagram.
        navigationHelpButton={true}
        navigationInstructionsInitiallyVisible={false}
      />
      <button
        type="button"
        className="custom-home-button"
        onClick={() => flyHome(2)}
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
      <SearchBox onSearch={flyToPlace} />
      <BuildingsToggle
        enabled={buildingsEnabled}
        onToggle={toggleBuildings}
      />
    </>
  );
}

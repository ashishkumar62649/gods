import {
  Billboard,
  BillboardCollection,
  Cartesian2,
  Cartesian3,
  Cartographic,
  Color,
  DistanceDisplayCondition,
  EasingFunction,
  EllipsoidGeodesic,
  HeadingPitchRoll,
  HorizontalOrigin,
  Label,
  LabelCollection,
  LabelStyle,
  Material,
  Math as CesiumMath,
  Matrix4,
  Model,
  NearFarScalar,
  PointPrimitive,
  PointPrimitiveCollection,
  Polyline,
  PolylineCollection,
  PrimitiveCollection,
  Transforms,
  VerticalOrigin,
  Viewer as CesiumViewer,
} from 'cesium';
import {
  AirportRecord,
  COMMS_TOWER_ICON_IMAGE,
  DESTINATION_AIRPORT_ICON_IMAGE,
  HFDL_TOWER_ICON_IMAGE,
  HELIPAD_ICON_IMAGE,
  LARGE_AIRPORT_ICON_IMAGE,
  MEDIUM_AIRPORT_ICON_IMAGE,
  SEAPLANE_ICON_IMAGE,
  SELECTED_FLIGHT_MODEL_URL,
  SMALL_AIRPORT_ICON_IMAGE,
  fetchFlightTrace,
  FlightRecord,
  FlightRenderMode,
  FlightRouteSnapshot,
  getFlightDisplayName,
  predictFlightPosition,
} from './flights';
import {
  getFlightAltitudeColorCss,
  getFlightIconDimensions,
  getFlightIconImage,
  getFlightIconKey,
} from './flightVisuals';

const TARGET_OPTIC_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><defs><filter id="cyanGlow"><feGaussianBlur stdDeviation="3" result="blur" /><feComposite in="SourceGraphic" in2="blur" operator="over" /></filter></defs><g filter="url(#cyanGlow)"><path d="M 20 10 L 10 10 L 10 20 M 60 10 L 70 10 L 70 20 M 10 60 L 10 70 L 20 70 M 70 60 L 70 70 L 60 70" fill="none" stroke="#22d3ee" stroke-width="3" /><path d="M 40 15 L 40 25 M 40 55 L 40 65 M 15 40 L 25 40 M 55 40 L 65 40" fill="none" stroke="#67e8f9" stroke-width="2" opacity="0.8" /><circle cx="40" cy="40" r="18" fill="none" stroke="#a5f3fc" stroke-width="1" stroke-dasharray="4 4" opacity="0.6"/></g></svg>';
const TARGET_OPTIC_IMAGE = `data:image/svg+xml;utf8,${encodeURIComponent(TARGET_OPTIC_SVG)}`;
const VDL_TOWER_IMAGE = COMMS_TOWER_ICON_IMAGE;
const ACARS_TOWER_IMAGE = COMMS_TOWER_ICON_IMAGE;
const HFDL_TOWER_IMAGE = HFDL_TOWER_ICON_IMAGE;
const GROUND_STATION_OFFSET_DEGREES = 0.005;
export const HFDL_STATIONS = [
  { id: 'hfdl-1', lat: 37.619, lon: -122.374 }, { id: 'hfdl-2', lat: 64.13, lon: -21.94 },
  { id: 'hfdl-3', lat: 52.699, lon: -8.921 }, { id: 'hfdl-4', lat: -26.139, lon: 28.246 },
  { id: 'hfdl-5', lat: 56.172, lon: 92.493 }, { id: 'hfdl-6', lat: -37.008, lon: 174.785 },
  { id: 'hfdl-7', lat: -17.769, lon: -63.162 }, { id: 'hfdl-8', lat: 71.285, lon: -156.683 },
  { id: 'hfdl-9', lat: 26.27, lon: 50.633 }, { id: 'hfdl-10', lat: 8.973, lon: -79.553 },
  { id: 'hfdl-11', lat: 21.152, lon: -157.096 }, { id: 'hfdl-12', lat: 26.195, lon: 127.645 },
  { id: 'hfdl-13', lat: 6.933, lon: 100.393 }, { id: 'hfdl-14', lat: 13.483, lon: 144.796 },
] as const;

interface FlightPickId {
  kind: 'flight';
  flightId: string;
}

interface AirportPickId {
  kind: 'airport';
  airportId: string;
}

export interface GroundStationsState {
  hfdl: boolean;
  comms: boolean;
}

export interface AviationGridState {
  major: boolean;
  regional: boolean;
  local: boolean;
  heli: boolean;
  seaplane: boolean;
}

export type FlightAssetView = 'symbology' | 'airframe';
export type FlightSensorLinkState =
  | 'release'
  | 'focus'
  | 'flight-deck';

interface FlightPrimitiveEntry {
  dot: PointPrimitive;
  icon: Billboard;
}

interface FlightRenderEntry extends FlightPrimitiveEntry {
  flight: FlightRecord;
  model?: Model;
  modelLoadPromise?: Promise<void>;
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
const FLIGHT_DECK_ENTRY_PITCH = CesiumMath.toRadians(-5);
const FLIGHT_DECK_PITCH_MIN = CesiumMath.toRadians(-85);
const FLIGHT_DECK_PITCH_MAX = CesiumMath.toRadians(55);
const FOCUS_MIN_DISTANCE = 1;
const FOCUS_MAX_DISTANCE = 200;
const scratchFocusInverse = new Matrix4();
const scratchFocusOffset = new Cartesian3();
const DEFAULT_FOCUS_OFFSET = new Cartesian3(0, -170, 65);
const FLIGHT_CAMERA_EASING = EasingFunction.SINUSOIDAL_IN_OUT;

export class FlightSceneLayerManager {
  private readonly viewer: CesiumViewer;
  private readonly root: PrimitiveCollection;
  private readonly flightDots: PointPrimitiveCollection;
  private readonly flightBillboards: BillboardCollection;
  private readonly majorBillboards: BillboardCollection;
  private readonly regionalBillboards: BillboardCollection;
  private readonly localBillboards: BillboardCollection;
  private readonly heliBillboards: BillboardCollection;
  private readonly seaplaneBillboards: BillboardCollection;
  private readonly hfdlBillboards: BillboardCollection;
  private readonly vdlBillboards: BillboardCollection;
  private readonly acarsBillboards: BillboardCollection;
  private readonly routeAirportBillboards: BillboardCollection;
  private readonly targetOpticBillboard: Billboard;
  private readonly routeDestinationBillboard: Billboard;
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
  private renderMode: FlightRenderMode = 'dot';
  private assetViewState: FlightAssetView = 'symbology';
  private sensorLinkState: FlightSensorLinkState = 'release';
  private cameraTransitionUntilMs = 0;
  private aviationGridState: AviationGridState = {
    major: true,
    regional: true,
    local: false,
    heli: false,
    seaplane: false,
  };
  private groundStationsState: GroundStationsState = {
    hfdl: false,
    comms: false,
  };
  private selectedFlightId: string | null = null;
  private showSelectedTrail = false;
  private routeState: RouteState = {
    snapshot: null,
    flightId: null,
  };
  private tickFrame = 0;
  private flightDeckLookHeadingOffset = 0;
  private flightDeckLookPitch = FLIGHT_DECK_ENTRY_PITCH;
  private destroyed = false;

  constructor(viewer: CesiumViewer) {
    this.viewer = viewer;
    this.root = new PrimitiveCollection();
    this.flightDots = this.root.add(new PointPrimitiveCollection()) as PointPrimitiveCollection;
    this.flightBillboards = this.root.add(new BillboardCollection()) as BillboardCollection;
    this.majorBillboards = this.root.add(new BillboardCollection()) as BillboardCollection;
    this.regionalBillboards = this.root.add(new BillboardCollection()) as BillboardCollection;
    this.localBillboards = this.root.add(new BillboardCollection()) as BillboardCollection;
    this.heliBillboards = this.root.add(new BillboardCollection()) as BillboardCollection;
    this.seaplaneBillboards = this.root.add(new BillboardCollection()) as BillboardCollection;
    this.hfdlBillboards = this.root.add(new BillboardCollection()) as BillboardCollection;
    this.vdlBillboards = this.root.add(new BillboardCollection()) as BillboardCollection;
    this.acarsBillboards = this.root.add(new BillboardCollection()) as BillboardCollection;
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

    this.targetOpticBillboard = this.routeAirportBillboards.add({
      image: TARGET_OPTIC_IMAGE,
      position: Cartesian3.ZERO,
      width: 80,
      height: 80,
      show: false,
      verticalOrigin: VerticalOrigin.CENTER,
      horizontalOrigin: HorizontalOrigin.CENTER,
      scaleByDistance: new NearFarScalar(2_500, 1.0, 8_000_000, 0.36),
    });

    this.routeDestinationBillboard = this.routeAirportBillboards.add({
      image: DESTINATION_AIRPORT_ICON_IMAGE,
      position: Cartesian3.ZERO,
      show: false,
      verticalOrigin: VerticalOrigin.BOTTOM,
      horizontalOrigin: HorizontalOrigin.CENTER,
      width: 24,
      height: 24,
      scaleByDistance: new NearFarScalar(20_000, 1.16, 15_000_000, 0.32),
      color: Color.fromCssColorString('#ffc09b'),
    });

    this.majorBillboards.show = this.aviationGridState.major;
    this.regionalBillboards.show = this.aviationGridState.regional;
    this.localBillboards.show = this.aviationGridState.local;
    this.heliBillboards.show = this.aviationGridState.heli;
    this.seaplaneBillboards.show = this.aviationGridState.seaplane;
    this.hfdlBillboards.show = false;
    this.vdlBillboards.show = false;
    this.acarsBillboards.show = false;
    this.routeAirportBillboards.show = true;

    this.viewer.scene.primitives.add(this.root);
  }

  destroy() {
    this.destroyed = true;
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
    this.refreshFlightVisuals();
    this.updateTrailSegmentVisibility();
    this.refreshSelectionOverlays();
    this.requestRender();
  }

  setFlightRenderMode(mode: FlightRenderMode) {
    this.renderMode = mode;
    this.refreshFlightVisuals();
    this.requestRender();
  }

  setAssetViewState(nextView: FlightAssetView) {
    this.assetViewState = nextView;
    this.refreshFlightVisuals();
    this.requestRender();
  }

  setSensorLinkState(nextState: FlightSensorLinkState) {
    const previousState = this.sensorLinkState;
    this.sensorLinkState = nextState;
    if (nextState === 'flight-deck' && previousState !== 'flight-deck') {
      this.resetFlightDeckLook();
    }

    const selectedEntry = this.selectedFlightId
      ? this.flightEntries.get(this.selectedFlightId) ?? null
      : null;

    const isEnteringLock =
      (nextState === 'focus' || nextState === 'flight-deck') &&
      previousState === 'release';

    if (isEnteringLock && selectedEntry) {
      this.kickCinematicApproach(selectedEntry, nextState);
    } else {
      this.updateSensorLinkCamera(selectedEntry);
    }
    this.requestRender();
  }

  private kickCinematicApproach(
    selectedEntry: FlightRenderEntry,
    mode: FlightSensorLinkState,
  ) {
    if (this.viewer.isDestroyed()) return;

    this.cameraTransitionUntilMs = Date.now() + 1600;
    const camera = this.viewer.camera;
    const target = selectedEntry.sharedFramePosition;

    if (!Matrix4.equals(camera.transform, Matrix4.IDENTITY)) {
      camera.lookAtTransform(Matrix4.IDENTITY);
    }

    if (mode === 'focus') {
      const headingRad = CesiumMath.toRadians(
        selectedEntry.flight.heading_true_deg,
      );
      const enu = Transforms.eastNorthUpToFixedFrame(target);
      const approach = Matrix4.multiplyByPoint(
        enu,
        new Cartesian3(0, -250, 120),
        new Cartesian3(),
      );
      camera.flyTo({
        destination: approach,
        orientation: { heading: headingRad, pitch: CesiumMath.toRadians(-25), roll: 0 },
        duration: 1.6,
        easingFunction: FLIGHT_CAMERA_EASING,
      });
      return;
    }

    const headingRad = CesiumMath.toRadians(
      selectedEntry.flight.heading_true_deg,
    );
    const enu = Transforms.eastNorthUpToFixedFrame(target);
    const cockpitPose = Matrix4.multiplyByPoint(
      enu,
      new Cartesian3(0, 0, 30),
      new Cartesian3(),
    );
    camera.flyTo({
      destination: cockpitPose,
      orientation: { heading: headingRad, pitch: FLIGHT_DECK_ENTRY_PITCH, roll: 0 },
      duration: 1.6,
      easingFunction: FLIGHT_CAMERA_EASING,
    });
  }

  resetFlightDeckLook() {
    this.flightDeckLookHeadingOffset = 0;
    this.flightDeckLookPitch = FLIGHT_DECK_ENTRY_PITCH;
  }

  adjustFlightDeckLook(deltaHeadingRadians: number, deltaPitchRadians: number) {
    this.flightDeckLookHeadingOffset += deltaHeadingRadians;
    this.flightDeckLookPitch = CesiumMath.clamp(
      this.flightDeckLookPitch + deltaPitchRadians,
      FLIGHT_DECK_PITCH_MIN,
      FLIGHT_DECK_PITCH_MAX,
    );
  }

  setSelectedFlightId(flightId: string | null) {
    this.selectedFlightId = flightId;
    if (!flightId && this.sensorLinkState !== 'release') {
      this.setSensorLinkState('release');
    }
    if (!flightId) {
      this.targetOpticBillboard.show = false;
    }
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
      // Guard: skip any record with invalid position — should be filtered by
      // the normalizer, but defence-in-depth prevents Cesium RangeErrors.
      if (
        !Number.isFinite(flight.latitude) ||
        !Number.isFinite(flight.longitude)
      ) {
        continue;
      }

      let entry = this.flightEntries.get(flight.id_icao);
      if (!entry) {
        const initialPosition = buildFlightApiCartesian(flight);
        entry = {
          dot: this.flightDots.add({
            id: { kind: 'flight', flightId: flight.id_icao } satisfies FlightPickId,
            position: initialPosition,
          }),
          icon: this.flightBillboards.add({
            id: { kind: 'flight', flightId: flight.id_icao } satisfies FlightPickId,
            position: initialPosition,
            alignedAxis: Cartesian3.ZERO,
            verticalOrigin: VerticalOrigin.CENTER,
            horizontalOrigin: HorizontalOrigin.CENTER,
            scaleByDistance: new NearFarScalar(5_000, 1.1, 20_000_000, 0.48),
          }),
          flight,
          model: undefined,
          modelLoadPromise: undefined,
          sharedFramePosition: Cartesian3.clone(initialPosition),
          confirmedApiPosition: Cartesian3.clone(initialPosition),
          targetApiPosition: Cartesian3.clone(initialPosition),
          correctionVector: new Cartesian3(),
          targetLatitude: flight.latitude,
          targetLongitude: flight.longitude,
          targetAltitudeMeters: Math.max(0, Number.isFinite(flight.altitude_baro_m) ? flight.altitude_baro_m : 0),
          lastUpdatedMs: nowMs,
          fadeStartedAtMs: null,
          currentOpacity: 1,
          dotBaseColor: Color.clone(Color.WHITE, new Color()),
          dotOutlineBaseColor: Color.clone(Color.WHITE, new Color()),
          iconBaseColor: Color.clone(Color.WHITE, new Color()),
        };
        this.flightEntries.set(flight.id_icao, entry);
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
    this.majorBillboards.removeAll();
    this.regionalBillboards.removeAll();
    this.localBillboards.removeAll();
    this.heliBillboards.removeAll();
    this.seaplaneBillboards.removeAll();
    this.hfdlBillboards.removeAll();
    this.vdlBillboards.removeAll();
    this.acarsBillboards.removeAll();

    for (const airport of airports) {
      const appearance = getAirportAppearance(airport);
      if (!appearance) {
        continue;
      }

      this.getAirportCollection(appearance.collectionKey).add({
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

      if (airport.type === 'large_airport' || airport.type === 'medium_airport') {
        this.vdlBillboards.add({
          image: VDL_TOWER_IMAGE,
          position: Cartesian3.fromDegrees(
            airport.longitude + GROUND_STATION_OFFSET_DEGREES,
            airport.latitude + GROUND_STATION_OFFSET_DEGREES,
            0,
          ),
          verticalOrigin: VerticalOrigin.BOTTOM,
          horizontalOrigin: HorizontalOrigin.CENTER,
          width: 56,
          height: 56,
          scaleByDistance: new NearFarScalar(12_000, 1.5, 14_000_000, 0.62),
        });

        this.acarsBillboards.add({
          image: ACARS_TOWER_IMAGE,
          position: Cartesian3.fromDegrees(
            airport.longitude - GROUND_STATION_OFFSET_DEGREES,
            airport.latitude - GROUND_STATION_OFFSET_DEGREES,
            0,
          ),
          verticalOrigin: VerticalOrigin.BOTTOM,
          horizontalOrigin: HorizontalOrigin.CENTER,
          width: 56,
          height: 56,
          scaleByDistance: new NearFarScalar(12_000, 1.5, 14_000_000, 0.62),
        });
      }
    }

    for (const station of HFDL_STATIONS) {
      this.hfdlBillboards.add({
        image: HFDL_TOWER_IMAGE,
        position: Cartesian3.fromDegrees(station.lon, station.lat, 0),
        verticalOrigin: VerticalOrigin.BOTTOM,
        horizontalOrigin: HorizontalOrigin.CENTER,
        width: 96,
        height: 96,
        scaleByDistance: new NearFarScalar(20_000, 1.8, 25_000_000, 0.95),
        distanceDisplayCondition: new DistanceDisplayCondition(0, 40_000_000),
      });
    }

    this.applyAviationGridVisibility();
    this.applyGroundStationVisibility();
    this.requestRender();
  }

  setAviationGridState(nextState: AviationGridState) {
    this.aviationGridState = { ...nextState };
    this.applyAviationGridVisibility();
    this.requestRender();
  }

  setGroundStationsState(nextState: GroundStationsState) {
    this.groundStationsState = { ...nextState };
    this.applyGroundStationVisibility();
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

  private applyAviationGridVisibility() {
    this.majorBillboards.show = this.aviationGridState.major;
    this.regionalBillboards.show = this.aviationGridState.regional;
    this.localBillboards.show = this.aviationGridState.local;
    this.heliBillboards.show = this.aviationGridState.heli;
    this.seaplaneBillboards.show = this.aviationGridState.seaplane;
  }

  private applyGroundStationVisibility() {
    this.hfdlBillboards.show = this.groundStationsState.hfdl;
    this.vdlBillboards.show = this.groundStationsState.comms;
    this.acarsBillboards.show = this.groundStationsState.comms;
  }

  private getAirportCollection(
    key: keyof AviationGridState,
  ) {
    switch (key) {
      case 'major':
        return this.majorBillboards;
      case 'regional':
        return this.regionalBillboards;
      case 'local':
        return this.localBillboards;
      case 'heli':
        return this.heliBillboards;
      case 'seaplane':
        return this.seaplaneBillboards;
      default:
        return this.majorBillboards;
    }
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
    this.targetOpticBillboard.show = false;

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
      const headingRad = (entry.flight.heading_true_deg * Math.PI) / 180;
      entry.icon.rotation = cameraHeading - headingRad;
      if (entry.model?.show) {
        const hpr = new HeadingPitchRoll(
          CesiumMath.toRadians(entry.flight.heading_true_deg - 90),
          0,
          0,
        );
        entry.model.modelMatrix = Transforms.headingPitchRollToFixedFrame(
          entry.sharedFramePosition,
          hpr,
        );
      }

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

      if (this.selectedFlightId === flightId) {
        this.targetOpticBillboard.position = entry.sharedFramePosition;
        this.targetOpticBillboard.show = this.flightsVisible;
      }
    }

    for (const flightId of entriesToRemove) {
      this.removeFlightEntry(flightId);
    }

    this.refreshSelectionOverlays();
    this.refreshRouteOverlay();
    this.updateSensorLinkCamera(
      this.selectedFlightId ? this.flightEntries.get(this.selectedFlightId) ?? null : null,
    );
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
    entry.targetLongitude = Number.isFinite(predicted.longitude) ? predicted.longitude : 0;
    entry.targetLatitude  = Number.isFinite(predicted.latitude)  ? predicted.latitude  : 0;
    entry.targetAltitudeMeters = Math.max(0, Number.isFinite(predicted.altitudeMeters) ? predicted.altitudeMeters : 0);

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
    const isSelected = this.selectedFlightId === flight.id_icao;
    const hasSelection = Boolean(this.selectedFlightId);
    const dimmed = hasSelection && !isSelected;
    const iconKey = getFlightIconKey(flight);

    // Oceanic coasting: drop opacity to 40% for estimated/interpolated positions
    const estimatedAlpha = flight.is_estimated ? 0.4 : 1.0;

    const baseColor = Color.fromCssColorString(
      getFlightAltitudeColorCss(flight, isSelected),
    );
    const markerColor = dimmed
      ? new Color(baseColor.red, baseColor.green, baseColor.blue, 0.24 * estimatedAlpha)
      : isSelected
        ? new Color(baseColor.red, baseColor.green, baseColor.blue, 0.96 * estimatedAlpha)
        : new Color(baseColor.red, baseColor.green, baseColor.blue, 0.88 * estimatedAlpha);
    const outlineColor = isSelected
      ? Color.WHITE.withAlpha(0.9)
      : new Color(0.05, 0.08, 0.14, dimmed ? 0.12 : 0.36);
    const iconSize = getFlightIconDimensions(flight, isSelected);
    const showSelectedAirframe =
      this.flightsVisible &&
      isSelected &&
      this.assetViewState === 'airframe';

    entry.dot.show = this.flightsVisible && this.renderMode === 'dot' && !isSelected;
    entry.dot.pixelSize = isSelected ? 13 : 7.5;
    entry.dot.outlineWidth = isSelected ? 2 : 1;

    entry.dotBaseColor = markerColor;
    entry.dotOutlineBaseColor = outlineColor;
    entry.iconBaseColor = markerColor;

    entry.icon.show =
      this.flightsVisible &&
      !showSelectedAirframe &&
      (this.renderMode === 'icon' || isSelected);
    entry.icon.image = getFlightIconImage(iconKey);
    entry.icon.width = iconSize.width;
    entry.icon.height = iconSize.height;

    if (showSelectedAirframe) {
      entry.icon.show = false;
      this.ensureAirframeModel(entry);
      if (entry.model) {
        entry.model.show = true;
      }
    } else if (entry.model) {
      entry.model.show = false;
    }

    this.applyEntryOpacity(entry);
  }

  private applyEntryOpacity(entry: FlightRenderEntry) {
    entry.dot.color = cloneColorWithOpacity(entry.dotBaseColor, entry.currentOpacity);
    entry.dot.outlineColor = cloneColorWithOpacity(
      entry.dotOutlineBaseColor,
      entry.currentOpacity,
    );
    entry.icon.color = cloneColorWithOpacity(entry.iconBaseColor, entry.currentOpacity);
    if (entry.model) {
      entry.model.color = Color.WHITE.withAlpha(entry.currentOpacity);
    }
  }

  private ensureAirframeModel(entry: FlightRenderEntry) {
    if (entry.model || entry.modelLoadPromise) {
      return;
    }

    const flightId = entry.flight.id_icao;
    entry.modelLoadPromise = Model.fromGltfAsync({
      url: SELECTED_FLIGHT_MODEL_URL,
      minimumPixelSize: 42,
      maximumScale: 128,
      incrementallyLoadTextures: false,
    })
      .then((model) => {
        if (this.destroyed || !this.flightEntries.has(flightId)) {
          if (!model.isDestroyed()) {
            model.destroy();
          }
          return;
        }

        model.show = false;
        this.root.add(model);

        const liveEntry = this.flightEntries.get(flightId);
        if (!liveEntry) {
          if (!model.isDestroyed()) {
            model.destroy();
          }
          return;
        }

        liveEntry.model = model;
        liveEntry.modelLoadPromise = undefined;
        this.applyFlightVisual(liveEntry, liveEntry.flight);
        this.requestRender();
      })
      .catch((error: unknown) => {
        entry.modelLoadPromise = undefined;
        console.warn('[Explorer] Failed to load selected flight airframe:', error);
      });
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
      this.targetOpticBillboard.show = false;
      return;
    }

    this.selectedFlightLabel.show = true;
    this.selectedFlightLabel.text = getFlightDisplayName(selectedEntry.flight);
    this.selectedFlightLabel.position = selectedEntry.sharedFramePosition;
    this.targetOpticBillboard.position = selectedEntry.sharedFramePosition;
    this.targetOpticBillboard.show = true;
  }

  private updateSensorLinkCamera(selectedEntry: FlightRenderEntry | null) {
    if (
      !selectedEntry ||
      !this.flightsVisible ||
      this.sensorLinkState === 'release'
    ) {
      this.releaseLockedCamera();
      return;
    }

    if (Date.now() < this.cameraTransitionUntilMs) {
      return;
    }

    const camera = this.viewer.camera;
    const controller = this.viewer.scene.screenSpaceCameraController;
    const target = selectedEntry.sharedFramePosition;

    switch (this.sensorLinkState) {
      case 'focus': {
        const transform = Transforms.eastNorthUpToFixedFrame(target);
        const focusOffset = this.captureFocusOffset(transform);
        // Always re-anchor on the aircraft itself, not its old world-space
        // pose, so the model/icon stays dead-center while it moves.
        camera.lookAtTransform(transform, focusOffset);
        controller.maximumZoomDistance = FOCUS_MAX_DISTANCE;
        controller.minimumZoomDistance = FOCUS_MIN_DISTANCE;
        break;
      }
      case 'flight-deck': {
        camera.lookAtTransform(Matrix4.IDENTITY);
        controller.maximumZoomDistance = Number.POSITIVE_INFINITY;
        controller.minimumZoomDistance = FOCUS_MIN_DISTANCE;
        camera.position = Cartesian3.clone(target, camera.position);
        camera.setView({
          orientation: {
            heading:
              CesiumMath.toRadians(selectedEntry.flight.heading_true_deg) +
              this.flightDeckLookHeadingOffset,
            pitch: this.flightDeckLookPitch,
            roll: 0,
          },
        });
        break;
      }
      default:
        break;
    }
  }

  private captureFocusOffset(transform: Matrix4) {
    if (!Matrix4.equals(this.viewer.camera.transform, Matrix4.IDENTITY)) {
      Cartesian3.clone(this.viewer.camera.position, scratchFocusOffset);
      return this.clampFocusOffset();
    }

    Matrix4.inverseTransformation(transform, scratchFocusInverse);
    Matrix4.multiplyByPoint(
      scratchFocusInverse,
      this.viewer.camera.positionWC,
      scratchFocusOffset,
    );
    return this.clampFocusOffset();
  }

  private clampFocusOffset() {
    const magnitude = Cartesian3.magnitude(scratchFocusOffset);
    if (!Number.isFinite(magnitude) || magnitude < 1e-3) {
      return Cartesian3.clone(DEFAULT_FOCUS_OFFSET, scratchFocusOffset);
    }

    const clampedMagnitude = CesiumMath.clamp(
      magnitude,
      FOCUS_MIN_DISTANCE,
      FOCUS_MAX_DISTANCE,
    );
    if (clampedMagnitude !== magnitude) {
      Cartesian3.normalize(scratchFocusOffset, scratchFocusOffset);
      Cartesian3.multiplyByScalar(
        scratchFocusOffset,
        clampedMagnitude,
        scratchFocusOffset,
      );
    }
    return scratchFocusOffset;
  }

  private releaseLockedCamera() {
    if (this.viewer.isDestroyed()) {
      return;
    }

    const camera = this.viewer.camera;
    const controller = this.viewer.scene.screenSpaceCameraController;

    if (!Matrix4.equals(camera.transform, Matrix4.IDENTITY)) {
      camera.lookAtTransform(Matrix4.IDENTITY);
    }

    controller.maximumZoomDistance = Number.POSITIVE_INFINITY;
    controller.minimumZoomDistance = FOCUS_MIN_DISTANCE;
  }

  private refreshRouteOverlay() {
    const { snapshot, flightId } = this.routeState;
    const trackedEntry = flightId ? this.flightEntries.get(flightId) ?? null : null;

    if (!snapshot?.found || !snapshot.destination || !trackedEntry) {
      this.routeArcPolyline.show = false;
      this.routeArcPolyline.positions = [];
      this.routeDestinationBillboard.show = false;
      return;
    }

    // Build the parabolic future-path arc from the plane's exact rendered
    // position (sharedFramePosition) to the destination airport.
    const arcPositions = buildFutureArcPositions(
      trackedEntry.sharedFramePosition,
      snapshot.destination,
      trackedEntry.flight.altitude_baro_m,
    );
    this.routeArcPolyline.show = arcPositions.length > 1;
    this.routeArcPolyline.positions = arcPositions;

    // Keep destination pin; origin is covered by the snail trail.
    this.routeDestinationBillboard.position = Cartesian3.fromDegrees(
      snapshot.destination.longitude,
      snapshot.destination.latitude,
      0,
    );
    this.routeDestinationBillboard.show = true;

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
    if (this.activeTrailFlightId !== entry.flight.id_icao) {
      return;
    }

    if (this.activeTrailPositions.length === 0) {
      return;
    }

    if (this.activeTrailLastAnchorTimestamp === entry.flight.timestamp) {
      return;
    }

    const confirmedAltitude = Math.max(0, entry.flight.altitude_baro_m);

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
      this.activeTrailFlightId !== entry.flight.id_icao ||
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
    if (entry.model) {
      this.root.remove(entry.model);
    }
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
      this.targetOpticBillboard.show = false;
      this.sensorLinkState = 'release';
      this.releaseLockedCamera();
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
  // Guard: lat/lon can theoretically be null at runtime from the backend
  // even though TypeScript types them as number. Bad positions crash Cesium.
  const lon = Number.isFinite(flight.longitude) ? flight.longitude : 0;
  const lat = Number.isFinite(flight.latitude)  ? flight.latitude  : 0;
  const alt = Math.max(0, Number.isFinite(flight.altitude_baro_m) ? flight.altitude_baro_m : 0);
  return Cartesian3.fromDegrees(lon, lat, alt);
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
      altitude_baro_m: altitudeMeters,
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

type AirportAppearance = {
  collectionKey: keyof AviationGridState;
  image: string;
  size: number;
  color: Color;
  scaleByDistance: NearFarScalar;
  distanceDisplayCondition?: DistanceDisplayCondition;
};

function getAirportAppearance(airport: AirportRecord): AirportAppearance | null {
  switch (airport.type) {
    case 'large_airport':
      return {
        collectionKey: 'major',
        image: LARGE_AIRPORT_ICON_IMAGE,
        size: 38,
        color: Color.WHITE.withAlpha(1),
        scaleByDistance: new NearFarScalar(30_000, 1.5, 20_000_000, 0.58),
        distanceDisplayCondition: new DistanceDisplayCondition(0, 25_000_000),
      };
    case 'medium_airport':
      return {
        collectionKey: 'regional',
        image: MEDIUM_AIRPORT_ICON_IMAGE,
        size: 30,
        color: Color.WHITE.withAlpha(1),
        scaleByDistance: new NearFarScalar(20_000, 1.28, 12_000_000, 0.46),
        distanceDisplayCondition: new DistanceDisplayCondition(0, 8_500_000),
      };
    case 'small_airport':
      return {
        collectionKey: 'local',
        image: SMALL_AIRPORT_ICON_IMAGE,
        size: 34,
        color: Color.WHITE.withAlpha(1),
        scaleByDistance: new NearFarScalar(18_000, 1.35, 4_500_000, 0.7),
        distanceDisplayCondition: new DistanceDisplayCondition(0.0, 4_500_000.0),
      };
    case 'heliport':
      return {
        collectionKey: 'heli',
        image: HELIPAD_ICON_IMAGE,
        size: 32,
        color: Color.WHITE.withAlpha(1),
        scaleByDistance: new NearFarScalar(18_000, 1.3, 3_500_000, 0.66),
        distanceDisplayCondition: new DistanceDisplayCondition(0.0, 3_500_000.0),
      };
    case 'seaplane_base':
      return {
        collectionKey: 'seaplane',
        image: SEAPLANE_ICON_IMAGE,
        size: 34,
        color: Color.WHITE.withAlpha(1),
        scaleByDistance: new NearFarScalar(18_000, 1.35, 4_500_000, 0.7),
        distanceDisplayCondition: new DistanceDisplayCondition(0.0, 4_500_000.0),
      };
    default:
      return null;
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

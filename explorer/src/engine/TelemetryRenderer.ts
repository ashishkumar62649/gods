import {
  Cartesian2,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  type Viewer as CesiumViewer,
} from 'cesium';
import type { IRenderer } from './IRenderer';
import type {
  AirportData,
  EmergencyFlightData,
  FlightData,
  ShipData,
  TelemetryState,
  FlightRouteSnapshot,
} from '../core/store/useTelemetryStore';
import { useTelemetryStore } from '../core/store/useTelemetryStore';
import {
  FlightSceneLayerManager,
  type AviationGridState as LegacyAviationGridState,
  type FlightAssetView as LegacyFlightAssetView,
  type GroundStationsState as LegacyGroundStationsState,
} from '../earth/flights/flightLayers';
import type { AirportRecord, FlightRecord } from '../earth/flights/flights';
import {
  getFlightRenderMode,
  type FlightRenderMode,
} from '../earth/flights/flights';
import { MaritimeLayerManager } from '../earth/maritime/MaritimeLayerManager';
import type { MaritimeVesselRecord } from '../earth/maritime/maritime';

export class TelemetryRenderer implements IRenderer {
  private viewer: CesiumViewer | null = null;
  private unsubscribe: (() => void) | null = null;
  private clickHandler: ScreenSpaceEventHandler | null = null;
  private flightManager: FlightSceneLayerManager | null = null;
  private maritimeManager: MaritimeLayerManager | null = null;
  private tickListener: (() => void) | null = null;
  private cameraListener: (() => void) | null = null;
  private lastRenderMode: FlightRenderMode | null = null;

  // Identity-cache the slices we've applied so we only re-map/sync when
  // the underlying reference actually changed. Each upsert/set in the
  // Zustand store produces a new reference for the mutated map, so this
  // is a perfect == check.
  private lastFlights: TelemetryState['flights'] | null = null;
  private lastActiveEmergencies: TelemetryState['activeEmergencies'] | null = null;
  private lastMaritime: TelemetryState['maritime'] | null = null;
  private lastAirports: TelemetryState['airports'] | null = null;
  private lastFlightsVisible: boolean | null = null;
  private lastMaritimeVisible: boolean | null = null;
  private lastSelectedFlightId: string | null | undefined = undefined;
  private lastAssetView: TelemetryState['assetView'] | null = null;
  private lastSensorLink: TelemetryState['sensorLink'] | null = null;
  private lastShowTrail: boolean | null = null;
  private lastShowRoute: boolean | null = null;
  private lastFlightRoute: FlightRouteSnapshot | null = null;
  private lastAviationGrid: TelemetryState['aviationGrid'] | null = null;
  private lastGroundStations: TelemetryState['groundStations'] | null = null;

  attach(viewer: CesiumViewer): void {
    this.viewer = viewer;
    this.flightManager = new FlightSceneLayerManager(viewer);
    this.maritimeManager = new MaritimeLayerManager(viewer);

    this.unsubscribe = useTelemetryStore.subscribe((state) => {
      this.renderTelemetry(state);
    });

    this.clickHandler = new ScreenSpaceEventHandler(viewer.scene.canvas);
    this.clickHandler.setInputAction(
      (click: { position: Cartesian2 }) => {
        const flightId = this.flightManager?.pickFlight(click.position) ?? null;
        if (flightId) {
          useTelemetryStore.getState().setSelectedEntity(flightId, 'flight');
          return;
        }

        const shipId = this.maritimeManager?.pickVessel(click.position) ?? null;
        if (shipId) {
          useTelemetryStore.getState().setSelectedEntity(shipId, 'ship');
          return;
        }

        const picked = viewer.scene.pick(click.position);
        if (picked && typeof picked === 'object') {
          const id = (picked as any).id ?? (picked as any).primitive?.id;
          if (id && id.kind === 'ship' && id.vesselId) {
            useTelemetryStore.getState().setSelectedEntity(id.vesselId, 'ship');
            return;
          }
        }

        useTelemetryStore.getState().setSelectedEntity(null, null);
      },
      ScreenSpaceEventType.LEFT_CLICK,
    );

    // Per-frame interpolation — gated on visibility so invisible layers
    // don't burn frame budget.
    this.tickListener = () => {
      const state = useTelemetryStore.getState();
      if (state.flightsVisible) this.flightManager?.tickPositions(state.flightFilters);
      if (state.maritimeVisible) this.maritimeManager?.tickVessels();
    };
    viewer.scene.preRender.addEventListener(this.tickListener);

    // Render-mode check is event-driven, not per-frame, to avoid allocating
    // a positionCartographic getter every preRender tick.
    this.cameraListener = () => this.syncRenderMode();
    viewer.camera.changed.addEventListener(this.cameraListener);

    this.renderTelemetry(useTelemetryStore.getState());
    this.syncRenderMode();
  }

  detach(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;

    if (this.viewer && this.tickListener) {
      this.viewer.scene.preRender.removeEventListener(this.tickListener);
    }
    this.tickListener = null;

    if (this.viewer && this.cameraListener) {
      this.viewer.camera.changed.removeEventListener(this.cameraListener);
    }
    this.cameraListener = null;

    this.clickHandler?.destroy();
    this.clickHandler = null;

    this.flightManager?.destroy();
    this.flightManager = null;

    this.maritimeManager?.destroy();
    this.maritimeManager = null;

    this.viewer = null;
    this.lastRenderMode = null;
    this.lastFlights = null;
    this.lastActiveEmergencies = null;
    this.lastMaritime = null;
    this.lastAirports = null;
    this.lastFlightsVisible = null;
    this.lastMaritimeVisible = null;
    this.lastSelectedFlightId = undefined;
    this.lastAssetView = null;
    this.lastSensorLink = null;
    this.lastShowTrail = null;
    this.lastShowRoute = null;
    this.lastFlightRoute = null;
    this.lastAviationGrid = null;
    this.lastGroundStations = null;
  }

  private renderTelemetry(state: TelemetryState): void {
    if (!this.viewer || this.viewer.isDestroyed() || !this.flightManager) {
      return;
    }

    let dirty = false;

    if (state.flightsVisible !== this.lastFlightsVisible) {
      this.lastFlightsVisible = state.flightsVisible;
      this.flightManager.setFlightsVisible(state.flightsVisible);
      if (state.flightsVisible) this.lastFlights = null;
      dirty = true;
    }

    const selectedFlightId =
      state.selectedEntityKind === 'flight' ? state.selectedEntityId : null;
    if (selectedFlightId !== this.lastSelectedFlightId) {
      this.lastSelectedFlightId = selectedFlightId;
      this.flightManager.setSelectedFlightId(selectedFlightId);
      dirty = true;
    }

    if (state.assetView !== this.lastAssetView) {
      this.lastAssetView = state.assetView;
      this.flightManager.setAssetViewState(state.assetView as LegacyFlightAssetView);
      dirty = true;
    }

    if (state.sensorLink !== this.lastSensorLink) {
      this.lastSensorLink = state.sensorLink;
      this.flightManager.setSensorLinkState(
        state.sensorLink === 'cockpit' ? 'flight-deck' : state.sensorLink,
      );
      dirty = true;
    }

    if (state.showSelectedFlightTrail !== this.lastShowTrail) {
      this.lastShowTrail = state.showSelectedFlightTrail;
      this.flightManager.setShowSelectedTrail(state.showSelectedFlightTrail);
      dirty = true;
    }

    if (
      state.showSelectedFlightRoute !== this.lastShowRoute ||
      state.selectedFlightRoute !== this.lastFlightRoute ||
      selectedFlightId !== this.lastSelectedFlightId
    ) {
      this.lastShowRoute = state.showSelectedFlightRoute;
      this.lastFlightRoute = state.selectedFlightRoute;
      // We only pass the route snapshot to flightManager if showSelectedFlightRoute is true
      this.flightManager.setTrackedRoute(
        state.showSelectedFlightRoute ? state.selectedFlightRoute : null,
        selectedFlightId,
      );
      dirty = true;
    }

    if (state.aviationGrid !== this.lastAviationGrid) {
      this.lastAviationGrid = state.aviationGrid;
      this.flightManager.setAviationGridState(
        state.aviationGrid as LegacyAviationGridState,
      );
      dirty = true;
    }

    if (state.groundStations !== this.lastGroundStations) {
      this.lastGroundStations = state.groundStations;
      this.flightManager.setGroundStationsState(
        state.groundStations as LegacyGroundStationsState,
      );
      dirty = true;
    }

    const aviationVisible =
      Object.values(state.aviationGrid).some(Boolean) ||
      Object.values(state.groundStations).some(Boolean);
    if (aviationVisible && state.airports !== this.lastAirports) {
      this.lastAirports = state.airports;
      this.flightManager.setGlobalAirports(state.airports.map(toAirportRecord));
      dirty = true;
    }

    // The expensive hot path: only re-map and re-sync flights when the
    // reference changed (i.e. a telemetry poll produced an upsert).
    if (
      state.flightsVisible &&
      (state.flights !== this.lastFlights ||
        state.activeEmergencies !== this.lastActiveEmergencies)
    ) {
      this.lastFlights = state.flights;
      this.lastActiveEmergencies = state.activeEmergencies;
      this.flightManager.syncFlights(
        mergeRenderableFlights(state.flights, state.activeEmergencies).map(toFlightRecord),
      );
      dirty = true;
    }

    if (state.maritimeVisible !== this.lastMaritimeVisible) {
      this.lastMaritimeVisible = state.maritimeVisible;
      this.maritimeManager?.setVisible(state.maritimeVisible);
      if (state.maritimeVisible) this.lastMaritime = null;
      dirty = true;
    }

    if (state.maritimeVisible && state.maritime !== this.lastMaritime) {
      this.lastMaritime = state.maritime;
      this.maritimeManager?.syncVessels(
        Object.values(state.maritime).map(toMaritimeVesselRecord),
      );
      dirty = true;
    }

    if (dirty) {
      this.viewer.scene.requestRender();
    }
  }

  private syncRenderMode(): void {
    if (!this.viewer || !this.flightManager || this.viewer.isDestroyed()) {
      return;
    }

    const cameraHeight = this.viewer.camera.positionCartographic.height;
    const nextMode = getFlightRenderMode(cameraHeight);
    if (nextMode === this.lastRenderMode) {
      return;
    }

    this.lastRenderMode = nextMode;
    this.flightManager.setFlightRenderMode(nextMode);
  }
}

function toFlightRecord(flight: FlightData): FlightRecord {
  return {
    id_icao: flight.id.toLowerCase(),
    callsign: flight.callsign || null,
    registration: flight.registration,
    aircraft_type: flight.aircraftType,
    description: flight.description,
    owner_operator: flight.ownerOperator,
    country_origin: flight.countryOrigin,
    vehicle_type: flight.vehicleType,
    vehicle_subtype: flight.vehicleSubtype,
    operation_type: flight.operationType,
    operation_subtype: flight.operationSubtype,
    latitude: flight.lat,
    longitude: flight.lon,
    altitude_baro_m: flight.alt,
    altitude_geom_m: flight.altitudeGeomM,
    velocity_mps: flight.velocityMps,
    heading_true_deg: ((flight.heading % 360) + 360) % 360,
    heading_mag_deg: flight.headingMagDeg,
    vertical_rate_mps: flight.verticalRateMps,
    on_ground: flight.onGround,
    is_estimated: flight.isEstimated,
    squawk: flight.squawk,
    is_active_emergency: flight.isActiveEmergency,
    emergency_status: flight.emergencyStatus,
    is_military: flight.isMilitary,
    is_interesting: flight.isInteresting,
    is_pia: flight.isPia,
    is_ladd: flight.isLadd,
    data_source: flight.dataSource,
    timestamp: flight.timestamp,
  };
}

function mergeRenderableFlights(
  flights: TelemetryState['flights'],
  emergencies: TelemetryState['activeEmergencies'],
): Array<FlightData | EmergencyFlightData> {
  const merged = new Map<string, FlightData | EmergencyFlightData>();

  for (const flight of Object.values(flights)) {
    merged.set(flight.id, flight);
  }

  for (const emergency of Object.values(emergencies)) {
    if (emergency.emergencyStatus === 'SIGNAL_LOST' || !merged.has(emergency.id)) {
      merged.set(emergency.id, {
        ...emergency,
        velocityMps: emergency.emergencyStatus === 'SIGNAL_LOST' ? 0 : emergency.velocityMps,
        verticalRateMps: emergency.emergencyStatus === 'SIGNAL_LOST' ? 0 : emergency.verticalRateMps,
        timestamp: emergency.emergencyStatus === 'SIGNAL_LOST'
          ? Date.now() / 1000
          : emergency.timestamp,
      });
    }
  }

  return Array.from(merged.values());
}

function toAirportRecord(airport: AirportData): AirportRecord {
  return {
    id: airport.id,
    ident: airport.ident,
    name: airport.name,
    type: airport.type,
    municipality: airport.municipality,
    isoCountry: airport.isoCountry,
    iataCode: airport.iataCode,
    icaoCode: airport.icaoCode,
    latitude: airport.latitude,
    longitude: airport.longitude,
  };
}

function toMaritimeVesselRecord(ship: ShipData): MaritimeVesselRecord {
  return {
    mmsi: ship.mmsi,
    name: ship.name || ship.id,
    lat: ship.lat,
    lon: ship.lon,
    timestamp: ship.timestamp,
    type: ship.type === 'BUNKER_OR_TANKER' ? 'BUNKER_OR_TANKER' : 'CARGO',
    speedKn: Number.isFinite(ship.speed) ? ship.speed : 0,
    headingDeg: Number.isFinite(ship.heading) ? ship.heading : 0,
  };
}

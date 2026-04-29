import { create } from 'zustand';

export type FlightAssetView = 'symbology' | 'airframe';
export type FlightSensorLinkState = 'release' | 'focus' | 'cockpit';
export type SelectedTelemetryKind = 'flight' | 'ship' | null;
export type EmergencyStatus = 'NONE' | 'ACTIVE' | 'SIGNAL_LOST';

export interface AviationGridState {
  major: boolean;
  regional: boolean;
  local: boolean;
  heli: boolean;
  seaplane: boolean;
}

export interface GroundStationsState {
  hfdl: boolean;
  comms: boolean;
}

export interface FlightData {
  id: string;
  lat: number;
  lon: number;
  alt: number;
  heading: number;
  callsign: string;
  isMilitary: boolean;
  registration: string | null;
  aircraftType: string | null;
  description: string | null;
  ownerOperator: string | null;
  countryOrigin: string | null;
  altitudeGeomM: number | null;
  velocityMps: number;
  headingMagDeg: number | null;
  verticalRateMps: number;
  onGround: boolean;
  isEstimated: boolean;
  squawk: string | null;
  isActiveEmergency: boolean;
  emergencyStatus: EmergencyStatus;
  isInteresting: boolean;
  isPia: boolean;
  isLadd: boolean;
  dataSource: string;
  timestamp: number;
  vehicleType: string;
  vehicleSubtype: string;
  operationType: string;
  operationSubtype: string;
}

export interface EmergencyFlightData extends FlightData {
  verifiedAt: string;
  lastSeenAt: string;
  expiresAt: string;
  regionLabel: string;
}

export interface AirportData {
  id: string;
  ident: string;
  name: string;
  type: string;
  municipality: string | null;
  isoCountry: string | null;
  iataCode: string | null;
  icaoCode: string | null;
  latitude: number;
  longitude: number;
}

export interface FlightRouteSnapshot {
  callsign: string | null;
  found: boolean;
  fetchedAt?: string;
  source?: 'opensky' | 'estimated';
  origin: AirportData | null;
  destination: AirportData | null;
  error?: string;
}

export interface FlightTracePoint {
  time: number;
  latitude: number;
  longitude: number;
  baroAltitudeMeters: number;
  trueTrack: number | null;
  onGround: boolean;
}

export interface FlightTraceSnapshot {
  icao24: string;
  found: boolean;
  startTime?: number | null;
  endTime?: number | null;
  callsign?: string | null;
  path: FlightTracePoint[];
  error?: string;
}

export interface ShipData {
  id: string;
  lat: number;
  lon: number;
  heading: number;
  speed: number;
  type: string;
  name: string;
  timestamp: string;
  mmsi: string | null;
}
export interface FlightFilters {
  vehicle: Record<string, Record<string, boolean>>; // { "Helicopter": { "Rotorcraft": true } }
  operation: Record<string, Record<string, boolean>>;
}

export interface TelemetryState {
  flights: Record<string, FlightData>;
  activeEmergencies: Record<string, EmergencyFlightData>;
  maritime: Record<string, ShipData>;
  airports: AirportData[];
  flightsVisible: boolean;
  maritimeVisible: boolean;
  flightFilters: FlightFilters;
  aviationGrid: AviationGridState;
  groundStations: GroundStationsState;
  selectedEntityId: string | null;
  selectedEntityKind: SelectedTelemetryKind;
  assetView: FlightAssetView;
  sensorLink: FlightSensorLinkState;
  showSelectedFlightTrail: boolean;
  showSelectedFlightRoute: boolean;
  selectedFlightRoute: FlightRouteSnapshot | null;
  selectedFlightTrace: FlightTraceSnapshot | null;
  feedStatus: 'connected' | 'disconnected' | 'reconnecting';
  flightCount: number;
  shipCount: number;
}

export interface TelemetryActions {
  upsertFlights(flights: FlightData[]): void;
  setActiveEmergencies(emergencies: EmergencyFlightData[]): void;
  upsertMaritime(ships: ShipData[]): void;
  setAirports(airports: AirportData[]): void;
  removeStaleTelemetry(ids: string[], type: 'flight' | 'ship'): void;
  setSelectedEntity(id: string | null, kind?: SelectedTelemetryKind): void;
  setFeedStatus(status: TelemetryState['feedStatus']): void;
  setFlightsVisible(visible: boolean): void;
  toggleFlightsVisible(): void;
  toggleMaritimeVisible(): void;
  toggleAviationGrid(layer: keyof AviationGridState): void;
  toggleGroundStationLayer(layer: keyof GroundStationsState): void;
  setAssetView(view: FlightAssetView): void;
  setSensorLink(link: FlightSensorLinkState): void;
  toggleSelectedFlightTrail(): void;
  toggleSelectedFlightRoute(): void;
  setSelectedFlightRoute(route: FlightRouteSnapshot | null): void;
  setSelectedFlightTrace(trace: FlightTraceSnapshot | null): void;
  toggleFlightFilter(category: 'vehicle' | 'operation', topLevel: string, subLevel: string | null, value: boolean): void;
}

export type TelemetryStore = TelemetryState & TelemetryActions;

export const useTelemetryStore = create<TelemetryStore>()((set) => ({
  flights: {},
  activeEmergencies: {},
  maritime: {},
  airports: [],
  flightsVisible: false,
  maritimeVisible: false,
  flightFilters: { vehicle: {}, operation: {} },
  aviationGrid: {
    major: false,
    regional: false,
    local: false,
    heli: false,
    seaplane: false,
  },
  groundStations: {
    hfdl: false,
    comms: false,
  },
  selectedEntityId: null,
  selectedEntityKind: null,
  assetView: 'symbology',
  sensorLink: 'release',
  showSelectedFlightTrail: false,
  showSelectedFlightRoute: false,
  selectedFlightRoute: null,
  selectedFlightTrace: null,
  feedStatus: 'disconnected',
  flightCount: 0,
  shipCount: 0,

  upsertFlights: (flights) =>
    set((state) => {
      const nextFlights = { ...state.flights };

      for (const flight of flights) {
        nextFlights[flight.id] = flight;
      }

      return {
        flights: nextFlights,
        flightCount: Object.keys(nextFlights).length,
      };
    }),

  setActiveEmergencies: (emergencies) =>
    set((state) => {
      const nextEmergencies: Record<string, EmergencyFlightData> = {};

      for (const emergency of emergencies) {
        const existing = state.activeEmergencies[emergency.id];
        nextEmergencies[emergency.id] = {
          ...emergency,
          regionLabel: existing?.regionLabel || emergency.regionLabel,
        };
      }

      return { activeEmergencies: nextEmergencies };
    }),

  upsertMaritime: (ships) =>
    set((state) => {
      const nextMaritime = { ...state.maritime };

      for (const ship of ships) {
        nextMaritime[ship.id] = ship;
      }

      return {
        maritime: nextMaritime,
        shipCount: Object.keys(nextMaritime).length,
      };
    }),

  setAirports: (airports) =>
    set({
      airports,
    }),

  removeStaleTelemetry: (ids, type) =>
    set((state) => {
      if (type === 'flight') {
        const nextFlights = { ...state.flights };

        for (const id of ids) {
          delete nextFlights[id];
        }

        return {
          flights: nextFlights,
          flightCount: Object.keys(nextFlights).length,
        };
      }

      const nextMaritime = { ...state.maritime };

      for (const id of ids) {
        delete nextMaritime[id];
      }

      return {
        maritime: nextMaritime,
        shipCount: Object.keys(nextMaritime).length,
      };
    }),

  setSelectedEntity: (id, kind = null) =>
    set((state) => ({
      selectedEntityId: id,
      selectedEntityKind: id ? kind : null,
      sensorLink: id ? state.sensorLink : 'release',
    })),

  setFeedStatus: (status) => set({ feedStatus: status }),

  setFlightsVisible: (visible) => set({ flightsVisible: visible }),

  toggleFlightFilter: (category, topLevel, subLevel, value) => set((state) => {
    const nextFilters = {
      vehicle: { ...state.flightFilters.vehicle },
      operation: { ...state.flightFilters.operation }
    };
    
    // Ensure top level exists
    if (!nextFilters[category][topLevel]) {
      nextFilters[category][topLevel] = {};
    }
    
    // Deep clone the top level object to maintain immutability
    nextFilters[category][topLevel] = { ...nextFilters[category][topLevel] };

    if (subLevel === null) {
      // We are toggling the entire top level. To do this, we use a special key '*' to represent the group toggle state.
      // And we explicitly apply it to all current known subtypes in the state (if any).
      nextFilters[category][topLevel]['*'] = value;
      for (const sub of Object.keys(nextFilters[category][topLevel])) {
        nextFilters[category][topLevel][sub] = value;
      }
    } else {
      nextFilters[category][topLevel][subLevel] = value;
      // Re-evaluate group toggle state '*' if necessary, though optional.
    }

    return { flightFilters: nextFilters };
  }),

  toggleFlightsVisible: () =>

    set((state) => ({
      flightsVisible: !state.flightsVisible,
    })),

  toggleMaritimeVisible: () =>
    set((state) => ({
      maritimeVisible: !state.maritimeVisible,
    })),

  toggleAviationGrid: (layer) =>
    set((state) => ({
      aviationGrid: {
        ...state.aviationGrid,
        [layer]: !state.aviationGrid[layer],
      },
    })),

  toggleGroundStationLayer: (layer) =>
    set((state) => ({
      groundStations: {
        ...state.groundStations,
        [layer]: !state.groundStations[layer],
      },
    })),

  setAssetView: (view) =>
    set({
      assetView: view,
    }),

  setSensorLink: (link) =>
    set({
      sensorLink: link,
    }),

  toggleSelectedFlightTrail: () =>
    set((state) => ({
      showSelectedFlightTrail: !state.showSelectedFlightTrail,
    })),

  toggleSelectedFlightRoute: () =>
    set((state) => ({
      showSelectedFlightRoute: !state.showSelectedFlightRoute,
    })),

  setSelectedFlightRoute: (route) =>
    set({
      selectedFlightRoute: route,
    }),

  setSelectedFlightTrace: (trace) =>
    set({
      selectedFlightTrace: trace,
    }),
}));

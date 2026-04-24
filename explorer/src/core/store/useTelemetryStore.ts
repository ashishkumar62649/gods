import { create } from 'zustand';

export type FlightAssetView = 'symbology' | 'airframe';
export type FlightSensorLinkState = 'release' | 'focus' | 'cockpit';
export type SelectedTelemetryKind = 'flight' | 'ship' | null;

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
  isInteresting: boolean;
  isPia: boolean;
  isLadd: boolean;
  dataSource: string;
  timestamp: number;
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

export interface TelemetryState {
  flights: Record<string, FlightData>;
  maritime: Record<string, ShipData>;
  airports: AirportData[];
  flightsVisible: boolean;
  maritimeVisible: boolean;
  aviationGrid: AviationGridState;
  groundStations: GroundStationsState;
  selectedEntityId: string | null;
  selectedEntityKind: SelectedTelemetryKind;
  assetView: FlightAssetView;
  sensorLink: FlightSensorLinkState;
  showSelectedFlightTrail: boolean;
  showSelectedFlightRoute: boolean;
  feedStatus: 'connected' | 'disconnected' | 'reconnecting';
  flightCount: number;
  shipCount: number;
}

export interface TelemetryActions {
  upsertFlights(flights: FlightData[]): void;
  upsertMaritime(ships: ShipData[]): void;
  setAirports(airports: AirportData[]): void;
  removeStaleTelemetry(ids: string[], type: 'flight' | 'ship'): void;
  setSelectedEntity(id: string | null, kind?: SelectedTelemetryKind): void;
  setFeedStatus(status: TelemetryState['feedStatus']): void;
  toggleFlightsVisible(): void;
  toggleMaritimeVisible(): void;
  toggleAviationGrid(layer: keyof AviationGridState): void;
  toggleGroundStationLayer(layer: keyof GroundStationsState): void;
  setAssetView(view: FlightAssetView): void;
  setSensorLink(link: FlightSensorLinkState): void;
  toggleSelectedFlightTrail(): void;
  toggleSelectedFlightRoute(): void;
}

export type TelemetryStore = TelemetryState & TelemetryActions;

export const useTelemetryStore = create<TelemetryStore>()((set) => ({
  flights: {},
  maritime: {},
  airports: [],
  flightsVisible: false,
  maritimeVisible: false,
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

  setFeedStatus: (status) =>
    set({
      feedStatus: status,
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
}));

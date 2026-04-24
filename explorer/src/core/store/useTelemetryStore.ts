import { create } from 'zustand';

export interface FlightData {
  id: string;
  lat: number;
  lon: number;
  alt: number;
  heading: number;
  callsign: string;
  isMilitary: boolean;
}

export interface ShipData {
  id: string;
  lat: number;
  lon: number;
  heading: number;
  speed: number;
  type: string;
}

export interface TelemetryState {
  flights: Record<string, FlightData>;
  maritime: Record<string, ShipData>;
  selectedEntityId: string | null;
  feedStatus: 'connected' | 'disconnected' | 'reconnecting';
}

export interface TelemetryActions {
  upsertFlights(flights: FlightData[]): void;
  upsertMaritime(ships: ShipData[]): void;
  removeStaleTelemetry(ids: string[], type: 'flight' | 'ship'): void;
  setSelectedEntity(id: string | null): void;
  setFeedStatus(status: TelemetryState['feedStatus']): void;
}

export type TelemetryStore = TelemetryState & TelemetryActions;

export const useTelemetryStore = create<TelemetryStore>()((set) => ({
  flights: {},
  maritime: {},
  selectedEntityId: null,
  feedStatus: 'disconnected',

  upsertFlights: (flights) =>
    set((state) => {
      const nextFlights = { ...state.flights };

      for (const flight of flights) {
        nextFlights[flight.id] = flight;
      }

      return { flights: nextFlights };
    }),

  upsertMaritime: (ships) =>
    set((state) => {
      const nextMaritime = { ...state.maritime };

      for (const ship of ships) {
        nextMaritime[ship.id] = ship;
      }

      return { maritime: nextMaritime };
    }),

  removeStaleTelemetry: (ids, type) =>
    set((state) => {
      if (type === 'flight') {
        const nextFlights = { ...state.flights };

        for (const id of ids) {
          delete nextFlights[id];
        }

        return { flights: nextFlights };
      }

      const nextMaritime = { ...state.maritime };

      for (const id of ids) {
        delete nextMaritime[id];
      }

      return { maritime: nextMaritime };
    }),

  setSelectedEntity: (id) =>
    set({
      selectedEntityId: id,
    }),

  setFeedStatus: (status) =>
    set({
      feedStatus: status,
    }),
}));

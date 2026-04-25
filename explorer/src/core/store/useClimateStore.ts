import { create } from 'zustand';

export interface ClimateState {
  activeLayers: {
    precipitation: boolean;
    temperature: boolean;
    clouds: boolean;
    wind: boolean;
    pressure: boolean;
    fog: boolean;
    lighting: boolean;
  };
  tileUrls: {
    precipitation: string | null;
    temperature: string | null;
    clouds: string | null;
    wind: string | null;
    pressure: string | null;
  };
  dataSource: 'OWM' | 'FALLBACK' | 'NONE';
  lastSync: number | null;
  isLoading: boolean;
  error: string | null;
}

export interface ClimateSnapshot {
  source: ClimateState['dataSource'];
  timestamp: number;
  urls: ClimateState['tileUrls'];
}

export interface ClimateActions {
  toggleLayer(layer: keyof ClimateState['activeLayers']): void;
  setClimateSnapshot(snapshot: ClimateSnapshot): void;
  setSyncState(source: ClimateState['dataSource'], timestamp: number): void;
  setError(msg: string | null): void;
}

export type ClimateStore = ClimateState & ClimateActions;

export const useClimateStore = create<ClimateStore>()((set) => ({
  activeLayers: {
    precipitation: false,
    temperature: false,
    clouds: false,
    wind: false,
    pressure: false,
    fog: false,
    lighting: false,
  },
  tileUrls: {
    precipitation: null,
    temperature: null,
    clouds: null,
    wind: null,
    pressure: null,
  },
  dataSource: 'NONE',
  lastSync: null,
  isLoading: false,
  error: null,

  toggleLayer: (layer) =>
    set((state) => ({
      activeLayers: {
        ...state.activeLayers,
        [layer]: !state.activeLayers[layer],
      },
    })),

  setClimateSnapshot: (snapshot) =>
    set({
      tileUrls: snapshot.urls,
      dataSource: snapshot.source,
      lastSync: snapshot.timestamp,
      isLoading: false,
      error: null,
    }),

  setSyncState: (source, timestamp) =>
    set({
      dataSource: source,
      lastSync: timestamp,
      isLoading: false,
      error: null,
    }),

  setError: (msg) =>
    set({
      error: msg,
      isLoading: false,
    }),
}));

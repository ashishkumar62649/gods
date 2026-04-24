import { create } from 'zustand';

export interface ClimateState {
  activeLayers: {
    precipitation: boolean;
    temperature: boolean;
    clouds: boolean;
    fog: boolean;
    lighting: boolean;
  };
  dataSource: 'OWM' | 'FALLBACK' | 'NONE';
  lastSync: number | null;
  isLoading: boolean;
  error: string | null;
}

export interface ClimateActions {
  toggleLayer(layer: keyof ClimateState['activeLayers']): void;
  setSyncState(source: ClimateState['dataSource'], timestamp: number): void;
  setError(msg: string | null): void;
}

export type ClimateStore = ClimateState & ClimateActions;

export const useClimateStore = create<ClimateStore>()((set) => ({
  activeLayers: {
    precipitation: false,
    temperature: false,
    clouds: false,
    fog: false,
    lighting: false,
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

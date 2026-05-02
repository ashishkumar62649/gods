import { create } from 'zustand';
import type {
  AirQualityIntelPoint,
  HazardIntelEvent,
  HydrologyIntelPoint,
  IntelFeedStatus,
  IntelLayerKey,
  IntelSnapshot,
  IntelSummary,
  SourceHealthRecord,
  WeatherIntelPoint,
} from '../types/intel';

export interface IntelLayerState {
  weather: boolean;
  hazards: boolean;
  airQuality: boolean;
  hydrology: boolean;
}

export interface IntelState {
  activeLayers: IntelLayerState;
  status: IntelFeedStatus;
  message: string;
  lastSync: number | null;
  error: string | null;
  summary: IntelSummary | null;
  weather: WeatherIntelPoint[];
  hazards: HazardIntelEvent[];
  airQuality: AirQualityIntelPoint[];
  hydrology: HydrologyIntelPoint[];
  sources: SourceHealthRecord[];
}

export interface IntelActions {
  toggleLayer(layer: IntelLayerKey): void;
  setLayerVisible(layer: IntelLayerKey, visible: boolean): void;
  setLoading(message?: string): void;
  setSnapshot(snapshot: IntelSnapshot): void;
  setError(message: string): void;
}

export type IntelStore = IntelState & IntelActions;

const INITIAL_LAYERS: IntelLayerState = {
  weather: true,
  hazards: true,
  airQuality: true,
  hydrology: true,
};

export const useIntelStore = create<IntelStore>()((set) => ({
  activeLayers: INITIAL_LAYERS,
  status: 'idle',
  message: 'Waiting for database intelligence.',
  lastSync: null,
  error: null,
  summary: null,
  weather: [],
  hazards: [],
  airQuality: [],
  hydrology: [],
  sources: [],

  toggleLayer: (layer) =>
    set((state) => ({
      activeLayers: {
        ...state.activeLayers,
        [layer]: !state.activeLayers[layer],
      },
    })),

  setLayerVisible: (layer, visible) =>
    set((state) => ({
      activeLayers: {
        ...state.activeLayers,
        [layer]: visible,
      },
    })),

  setLoading: (message = 'Refreshing database intelligence.') =>
    set({
      status: 'loading',
      message,
      error: null,
    }),

  setSnapshot: (snapshot) =>
    set({
      status: 'live',
      message: buildSnapshotMessage(snapshot),
      lastSync: snapshot.fetchedAt,
      error: null,
      summary: snapshot.summary,
      weather: snapshot.weather,
      hazards: snapshot.hazards,
      airQuality: snapshot.airQuality,
      hydrology: snapshot.hydrology,
      sources: snapshot.sources,
    }),

  setError: (message) =>
    set({
      status: 'error',
      message,
      error: message,
    }),
}));

function buildSnapshotMessage(snapshot: IntelSnapshot) {
  const counts = [
    `${snapshot.weather.length.toLocaleString()} weather`,
    `${snapshot.hazards.length.toLocaleString()} hazards`,
    `${snapshot.airQuality.length.toLocaleString()} air`,
    `${snapshot.hydrology.length.toLocaleString()} hydro`,
  ];
  return `${counts.join(' / ')} records loaded from PostgreSQL.`;
}

import { create } from 'zustand';
import type { PointWeather } from '../api/weatherApi';

export interface PinnedPoint {
  id: string;
  lat: number;
  lon: number;
  data: PointWeather;
  pinnedAt: number;
}

export interface WeatherInspectState {
  pinnedPoints: PinnedPoint[];
  expandedIds: Record<string, true>;
  isFetching: boolean;
  lastError: string | null;
}

export interface WeatherInspectActions {
  pinPoint(point: PinnedPoint): void;
  unpinPoint(id: string): void;
  toggleExpanded(id: string): void;
  setFetching(value: boolean): void;
  setError(message: string | null): void;
  clearAll(): void;
}

export type WeatherInspectStore = WeatherInspectState & WeatherInspectActions;

const MAX_PINNED = 10;

export const useWeatherInspectStore = create<WeatherInspectStore>()((set) => ({
  pinnedPoints: [],
  expandedIds: {},
  isFetching: false,
  lastError: null,

  pinPoint: (point) =>
    set((state) => ({
      pinnedPoints: [point, ...state.pinnedPoints].slice(0, MAX_PINNED),
    })),

  unpinPoint: (id) =>
    set((state) => {
      const nextExpanded = { ...state.expandedIds };
      delete nextExpanded[id];
      return {
        pinnedPoints: state.pinnedPoints.filter((p) => p.id !== id),
        expandedIds: nextExpanded,
      };
    }),

  toggleExpanded: (id) =>
    set((state) => {
      const nextExpanded = { ...state.expandedIds };
      if (nextExpanded[id]) delete nextExpanded[id];
      else nextExpanded[id] = true;
      return { expandedIds: nextExpanded };
    }),

  setFetching: (value) => set({ isFetching: value }),

  setError: (message) => set({ lastError: message }),

  clearAll: () => set({ pinnedPoints: [], expandedIds: {} }),
}));

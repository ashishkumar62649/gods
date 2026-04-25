import { create } from 'zustand';
import type { PointWeather } from '../api/weatherApi';

export interface PinnedPoint {
  id: string;
  lat: number;
  lon: number;
  data: PointWeather;
  pinnedAt: number;
}

export type TacticalLevel = 'orbital' | 'transition' | 'surface';

export interface WeatherInspectState {
  pinnedPoints: PinnedPoint[];
  expandedIds: Record<string, true>;
  isFetching: boolean;
  lastError: string | null;
  cursorPoint: PinnedPoint | null;
  cameraAltitudeMeters: number | null;
  tacticalLevel: TacticalLevel;
}

export interface WeatherInspectActions {
  pinPoint(point: PinnedPoint): void;
  unpinPoint(id: string): void;
  toggleExpanded(id: string): void;
  setFetching(value: boolean): void;
  setError(message: string | null): void;
  setCursorPoint(point: PinnedPoint | null): void;
  setCameraAltitude(meters: number): void;
  clearAll(): void;
}

export const TRANSITION_ALTITUDE_M = 100_000;
export const SURFACE_ALTITUDE_M = 50_000;

function levelFromAltitude(meters: number | null): TacticalLevel {
  if (meters === null) return 'orbital';
  if (meters > TRANSITION_ALTITUDE_M) return 'orbital';
  if (meters > SURFACE_ALTITUDE_M) return 'transition';
  return 'surface';
}

export type WeatherInspectStore = WeatherInspectState & WeatherInspectActions;

const MAX_PINNED = 10;

export const useWeatherInspectStore = create<WeatherInspectStore>()((set) => ({
  pinnedPoints: [],
  expandedIds: {},
  isFetching: false,
  lastError: null,
  cursorPoint: null,
  cameraAltitudeMeters: null,
  tacticalLevel: 'orbital',

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

  setCursorPoint: (point) => set({ cursorPoint: point }),

  setCameraAltitude: (meters) =>
    set({
      cameraAltitudeMeters: meters,
      tacticalLevel: levelFromAltitude(meters),
    }),

  clearAll: () => set({ pinnedPoints: [], expandedIds: {}, cursorPoint: null }),
}));

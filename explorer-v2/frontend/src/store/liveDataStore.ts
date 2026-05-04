import { create } from 'zustand';

interface LiveDataState {
  nowMs: number;
  selectedLocationName: string;
  selectedLocationLat: number;
  selectedLocationLon: number;
  selectedLocationElevationM: number;
  feedCycle: number;
  setNow: (nowMs: number) => void;
  recordSearchContext: (query: string) => void;
  setSelectedLocation: (location: {
    name: string;
    latitude: number;
    longitude: number;
    elevationM?: number;
  }) => void;
}

export const useLiveDataStore = create<LiveDataState>()((set) => ({
  nowMs: Date.now(),
  selectedLocationName: 'Live Focus Area',
  selectedLocationLat: 22.57,
  selectedLocationLon: 88.36,
  selectedLocationElevationM: 9,
  feedCycle: 0,
  setNow: (nowMs) =>
    set((state) => ({
      nowMs,
      feedCycle: state.feedCycle + 1,
    })),
  recordSearchContext: (query) =>
    set((state) => {
      const normalized = query.trim();
      if (!normalized) return state;
      return {
        selectedLocationName: normalized,
      };
    }),
  setSelectedLocation: (location) =>
    set({
      selectedLocationName: location.name,
      selectedLocationLat: clamp(-90, 90, location.latitude),
      selectedLocationLon: clamp(-180, 180, location.longitude),
      selectedLocationElevationM: Math.max(0, Math.round(location.elevationM ?? 0)),
    }),
}));

export function startLiveClock(getTimelineTimeMs?: () => number) {
  useLiveDataStore.getState().setNow(Date.now());
  const timer = window.setInterval(() => {
    useLiveDataStore.getState().setNow(getTimelineTimeMs?.() ?? Date.now());
  }, 1000);
  return () => window.clearInterval(timer);
}

function clamp(min: number, max: number, value: number) {
  return Math.max(min, Math.min(max, value));
}

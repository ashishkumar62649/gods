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
      const hash = [...normalized].reduce((sum, char) => sum + char.charCodeAt(0), 0);
      return {
        selectedLocationName: normalized,
        selectedLocationLat: clamp(-60, 72, -35 + (hash % 107)),
        selectedLocationLon: clamp(-170, 170, -140 + ((hash * 7) % 310)),
        selectedLocationElevationM: 5 + (hash % 740),
      };
    }),
}));

export function startLiveMockFeed() {
  useLiveDataStore.getState().setNow(Date.now());
  const timer = window.setInterval(() => {
    useLiveDataStore.getState().setNow(Date.now());
  }, 1000);
  return () => window.clearInterval(timer);
}

function clamp(min: number, max: number, value: number) {
  return Math.max(min, Math.min(max, value));
}

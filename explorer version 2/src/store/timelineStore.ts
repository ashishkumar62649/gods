import { create } from 'zustand';

type TimelineMode = 'past-24h' | 'forecast-72h' | 'live';

interface TimelineState {
  isPlaying: boolean;
  speed: 1 | 2 | 4;
  timelineMode: TimelineMode;
  currentTimeLabel: string;
  togglePlaying: () => void;
  setSpeed: (speed: 1 | 2 | 4) => void;
  setTimelineMode: (timelineMode: TimelineMode) => void;
}

export const useTimelineStore = create<TimelineState>()((set) => ({
  isPlaying: true,
  speed: 1,
  timelineMode: 'forecast-72h',
  currentTimeLabel: '24 Apr 2026',
  togglePlaying: () => set((state) => ({ isPlaying: !state.isPlaying })),
  setSpeed: (speed) => set({ speed }),
  setTimelineMode: (timelineMode) => set({ timelineMode }),
}));

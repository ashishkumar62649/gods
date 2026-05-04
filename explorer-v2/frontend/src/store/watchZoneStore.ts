import { create } from 'zustand';

interface WatchZoneState {
  search: string;
  severity: string;
  category: string;
  source: string;
  timeWindow: string;
  selectedZoneId: string;
  sortDescending: boolean;
  historyPlaying: boolean;
  setSearch: (search: string) => void;
  setSeverity: (severity: string) => void;
  setCategory: (category: string) => void;
  setSource: (source: string) => void;
  setTimeWindow: (timeWindow: string) => void;
  selectZone: (selectedZoneId: string) => void;
  toggleSort: () => void;
  toggleHistoryPlaying: () => void;
}

export const useWatchZoneStore = create<WatchZoneState>()((set) => ({
  search: '',
  severity: 'All',
  category: 'All',
  source: 'All',
  timeWindow: 'Past 24 Hours',
  selectedZoneId: 'bay',
  sortDescending: true,
  historyPlaying: false,
  setSearch: (search) => set({ search }),
  setSeverity: (severity) => set({ severity }),
  setCategory: (category) => set({ category }),
  setSource: (source) => set({ source }),
  setTimeWindow: (timeWindow) => set({ timeWindow }),
  selectZone: (selectedZoneId) => set({ selectedZoneId }),
  toggleSort: () => set((state) => ({ sortDescending: !state.sortDescending })),
  toggleHistoryPlaying: () => set((state) => ({ historyPlaying: !state.historyPlaying })),
}));

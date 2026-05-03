import { create } from 'zustand';
import type { AppMode } from '../app/appModes';

interface UiState {
  mode: AppMode;
  leftPanelCollapsed: boolean;
  rightPanelOpen: boolean;
  activeBottomTab: string;
  setMode: (mode: AppMode) => void;
  toggleLeftPanel: () => void;
  setRightPanelOpen: (open: boolean) => void;
  setActiveBottomTab: (tab: string) => void;
}

export const useUiStore = create<UiState>()((set) => ({
  mode: 'world-overview',
  leftPanelCollapsed: false,
  rightPanelOpen: true,
  activeBottomTab: 'overview',
  setMode: (mode) => set({ mode }),
  toggleLeftPanel: () =>
    set((state) => ({ leftPanelCollapsed: !state.leftPanelCollapsed })),
  setRightPanelOpen: (rightPanelOpen) => set({ rightPanelOpen }),
  setActiveBottomTab: (activeBottomTab) => set({ activeBottomTab }),
}));

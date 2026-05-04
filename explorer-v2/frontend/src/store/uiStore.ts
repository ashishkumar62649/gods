import { create } from 'zustand';
import type { AppMode } from '../app/appModes';

interface UiState {
  mode: AppMode;
  leftPanelCollapsed: boolean;
  rightPanelOpen: boolean;
  assistantOpen: boolean;
  mapLayerPickerOpen: boolean;
  activeBottomTab: string;
  setMode: (mode: AppMode) => void;
  toggleLeftPanel: () => void;
  toggleMapLayerPicker: () => void;
  toggleAssistant: () => void;
  setRightPanelOpen: (open: boolean) => void;
  setActiveBottomTab: (tab: string) => void;
}

export const useUiStore = create<UiState>()((set) => ({
  mode: 'world-overview',
  leftPanelCollapsed: false,
  rightPanelOpen: true,
  assistantOpen: false,
  mapLayerPickerOpen: false,
  activeBottomTab: 'overview',
  setMode: (mode) => set({ mode, rightPanelOpen: true }),
  toggleLeftPanel: () =>
    set((state) => ({ leftPanelCollapsed: !state.leftPanelCollapsed })),
  toggleMapLayerPicker: () =>
    set((state) => ({ mapLayerPickerOpen: !state.mapLayerPickerOpen })),
  toggleAssistant: () =>
    set((state) => ({ assistantOpen: !state.assistantOpen })),
  setRightPanelOpen: (rightPanelOpen) => set({ rightPanelOpen }),
  setActiveBottomTab: (activeBottomTab) => set({ activeBottomTab }),
}));

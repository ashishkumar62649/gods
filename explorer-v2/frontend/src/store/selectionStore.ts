import { create } from 'zustand';

interface SelectionState {
  selectedAssetId?: string;
  selectedAssetDomain?: string;
  selectedAssetRecord?: Record<string, unknown>;
  selectedWatchZoneId?: string;
  selectedAlertId?: string;
  selectedLocationId?: string;
  selectAsset: (id: string, domain?: string, record?: Record<string, unknown>) => void;
  selectWatchZone: (id: string) => void;
  selectAlert: (id: string) => void;
  selectLocation: (id: string) => void;
}

export const useSelectionStore = create<SelectionState>()((set) => ({
  selectedAssetId: undefined,
  selectedWatchZoneId: 'bay-of-bengal',
  selectedAlertId: 'hooghly-flood-risk',
  selectedLocationId: undefined,
  selectAsset: (selectedAssetId, selectedAssetDomain = 'aviation', selectedAssetRecord) =>
    set({ selectedAssetId, selectedAssetDomain, selectedAssetRecord }),
  selectWatchZone: (selectedWatchZoneId) => set({ selectedWatchZoneId }),
  selectAlert: (selectedAlertId) => set({ selectedAlertId }),
  selectLocation: (selectedLocationId) => set({ selectedLocationId }),
}));

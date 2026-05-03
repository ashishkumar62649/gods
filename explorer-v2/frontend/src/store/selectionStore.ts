import { create } from 'zustand';

interface SelectionState {
  selectedAssetId?: string;
  selectedWatchZoneId?: string;
  selectedAlertId?: string;
  selectedLocationId?: string;
  selectAsset: (id: string) => void;
  selectWatchZone: (id: string) => void;
  selectAlert: (id: string) => void;
  selectLocation: (id: string) => void;
}

export const useSelectionStore = create<SelectionState>()((set) => ({
  selectedAssetId: 'ignite21',
  selectedWatchZoneId: 'bay-of-bengal',
  selectedAlertId: 'hooghly-flood-risk',
  selectedLocationId: 'kolkata',
  selectAsset: (selectedAssetId) => set({ selectedAssetId }),
  selectWatchZone: (selectedWatchZoneId) => set({ selectedWatchZoneId }),
  selectAlert: (selectedAlertId) => set({ selectedAlertId }),
  selectLocation: (selectedLocationId) => set({ selectedLocationId }),
}));

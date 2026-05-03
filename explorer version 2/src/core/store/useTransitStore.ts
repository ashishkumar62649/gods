import { create } from 'zustand';

export interface TransitState {
  visibleNetworks: {
    railway: boolean;
    metro: boolean;
  };
  activeZoomBand: 'SPACE' | 'CONTINENT' | 'REGION' | 'CITY' | 'STREET';
}

export interface TransitActions {
  toggleNetwork(network: keyof TransitState['visibleNetworks']): void;
  setZoomBand(band: TransitState['activeZoomBand']): void;
}

export type TransitStore = TransitState & TransitActions;

export const useTransitStore = create<TransitStore>()((set) => ({
  visibleNetworks: {
    railway: false,
    metro: false,
  },
  activeZoomBand: 'SPACE',

  toggleNetwork: (network) =>
    set((state) => ({
      visibleNetworks: {
        ...state.visibleNetworks,
        [network]: !state.visibleNetworks[network],
      },
    })),

  setZoomBand: (band) =>
    set({
      activeZoomBand: band,
    }),
}));

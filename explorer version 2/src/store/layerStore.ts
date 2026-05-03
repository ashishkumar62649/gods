import { create } from 'zustand';

interface LayerState {
  activeLayers: Record<string, boolean>;
  layerOpacity: Record<string, number>;
  toggleLayer: (id: string) => void;
  setLayerOpacity: (id: string, opacity: number) => void;
}

export const useLayerStore = create<LayerState>()((set) => ({
  activeLayers: {
    satelliteTrueColor: true,
    radarPrecipitation: true,
    clouds: true,
    temperature: true,
    wind10m: true,
    pressureMslp: true,
    humidity2m: false,
    aircraftAdsb: true,
    aircraftMilitary: true,
    vesselsAis: false,
    satellites: false,
    launchesDebris: false,
  },
  layerOpacity: {
    satelliteTrueColor: 100,
    temperature: 100,
  },
  toggleLayer: (id) =>
    set((state) => ({
      activeLayers: {
        ...state.activeLayers,
        [id]: !state.activeLayers[id],
      },
    })),
  setLayerOpacity: (id, opacity) =>
    set((state) => ({
      layerOpacity: {
        ...state.layerOpacity,
        [id]: Math.max(0, Math.min(100, opacity)),
      },
    })),
}));

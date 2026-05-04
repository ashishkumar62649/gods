import { create } from 'zustand';

interface LayerState {
  activeLayers: Record<string, boolean>;
  layerOpacity: Record<string, number>;
  toggleLayer: (id: string) => void;
  setLayer: (id: string, enabled: boolean) => void;
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
    aircraftTrails: true,
    vesselsAis: false,
    satellites: false,
    hazards: true,
    earthquakes: true,
    volcanoes: true,
    wildfires: true,
    storms: true,
    hydrology: false,
    airQuality: false,
    internetCables: true,
    infrastructureAssets: true,
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
  setLayer: (id, enabled) =>
    set((state) => ({
      activeLayers: {
        ...state.activeLayers,
        [id]: enabled,
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

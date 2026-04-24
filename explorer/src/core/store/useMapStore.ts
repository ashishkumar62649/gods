import { create } from 'zustand';

export interface ImageryChoice {
  id: string;
  name: string;
}

export interface SearchCommand {
  query: string;
  issuedAt: number;
}

export interface MapState {
  selectedImageryId: string;
  buildingsEnabled: boolean;
  autoBuildingsEnabled: boolean;
  orbitEnabled: boolean;
  lastSearch: SearchCommand | null;
  lastHomeRequestAt: number | null;
}

export interface MapActions {
  setImagery(id: string): void;
  toggleBuildings(): void;
  setAutoBuildings(enabled: boolean): void;
  setOrbitEnabled(enabled: boolean): void;
  toggleOrbit(): void;
  requestSearch(query: string): void;
  requestFlyHome(): void;
}

export type MapStore = MapState & MapActions;

export const IMAGERY_CHOICES: ImageryChoice[] = [
  { id: 'maptiler-satellite', name: 'MapTiler Satellite' },
  { id: 'bing-maps-aerial', name: 'Bing Maps Aerial' },
  { id: 'bing-maps-aerial-with-labels', name: 'Bing Aerial Labels' },
  { id: 'bing-maps-roads', name: 'Bing Roads' },
  { id: 'arcgis-world-imagery', name: 'ArcGIS Imagery' },
  { id: 'arcgis-world-hillshade', name: 'ArcGIS Hillshade' },
  { id: 'esri-world-ocean', name: 'Esri Ocean' },
  { id: 'openstreetmap', name: 'OpenStreetMap' },
  { id: 'stadia-watercolor', name: 'Stadia Watercolor' },
  { id: 'stadia-toner', name: 'Stadia Toner' },
  { id: 'stadia-alidade-smooth', name: 'Alidade Smooth' },
  { id: 'stadia-alidade-smooth-dark', name: 'Alidade Dark' },
  { id: 'sentinel-2', name: 'Sentinel-2' },
  { id: 'blue-marble', name: 'Blue Marble' },
  { id: 'earth-at-night', name: 'Earth at Night' },
  { id: 'natural-earth-ii', name: 'Natural Earth II' },
];

export const useMapStore = create<MapStore>()((set) => ({
  selectedImageryId: 'maptiler-satellite',
  buildingsEnabled: false,
  autoBuildingsEnabled: false,
  orbitEnabled: false,
  lastSearch: null,
  lastHomeRequestAt: null,

  setImagery: (id) =>
    set({
      selectedImageryId: id,
    }),

  toggleBuildings: () =>
    set((state) => ({
      buildingsEnabled: !state.buildingsEnabled,
      autoBuildingsEnabled: false,
    })),

  setAutoBuildings: (enabled) =>
    set({
      autoBuildingsEnabled: enabled,
    }),

  setOrbitEnabled: (enabled) =>
    set({
      orbitEnabled: enabled,
    }),

  toggleOrbit: () =>
    set((state) => ({
      orbitEnabled: !state.orbitEnabled,
    })),

  requestSearch: (query) =>
    set({
      lastSearch: {
        query,
        issuedAt: Date.now(),
      },
    }),

  requestFlyHome: () =>
    set({
      autoBuildingsEnabled: false,
      orbitEnabled: false,
      lastHomeRequestAt: Date.now(),
    }),
}));

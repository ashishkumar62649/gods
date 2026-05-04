import { create } from 'zustand';

export interface ImageryChoice {
  id: string;
  name: string;
}

export interface SearchCommand {
  query: string;
  issuedAt: number;
}

export interface CoordinateFlyToCommand {
  latitude: number;
  longitude: number;
  height: number;
  issuedAt: number;
}

export interface MapState {
  selectedImageryId: string;
  buildingsEnabled: boolean;
  autoBuildingsEnabled: boolean;
  orbitEnabled: boolean;
  cameraHeadingDeg: number;
  cameraPitchDeg: number;
  cameraHeightM: number;
  cameraLat: number | null;
  cameraLon: number | null;
  lastSearch: SearchCommand | null;
  lastCoordinateFlyTo: CoordinateFlyToCommand | null;
  lastHomeRequestAt: number | null;
}

export interface MapActions {
  setImagery(id: string): void;
  toggleBuildings(): void;
  setAutoBuildings(enabled: boolean): void;
  setOrbitEnabled(enabled: boolean): void;
  setCameraStatus(status: {
    headingDeg: number;
    pitchDeg: number;
    heightM: number;
    latitude: number | null;
    longitude: number | null;
  }): void;
  toggleOrbit(): void;
  requestSearch(query: string): void;
  requestFlyToCoordinates(latitude: number, longitude: number, height?: number): void;
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

const DEFAULT_IMAGERY_ID = import.meta.env.VITE_MAPTILER_API_KEY
  ? 'maptiler-satellite'
  : 'arcgis-world-imagery';

export const useMapStore = create<MapStore>()((set) => ({
  selectedImageryId: DEFAULT_IMAGERY_ID,
  buildingsEnabled: false,
  autoBuildingsEnabled: false,
  orbitEnabled: false,
  cameraHeadingDeg: 0,
  cameraPitchDeg: 0,
  cameraHeightM: 0,
  cameraLat: null,
  cameraLon: null,
  lastSearch: null,
  lastCoordinateFlyTo: null,
  lastHomeRequestAt: null,

  setImagery: (id) =>
    set({
      selectedImageryId: id,
    }),

  toggleBuildings: () =>
    set((state) => {
      const buildingsAreActive =
        state.buildingsEnabled || state.autoBuildingsEnabled;

      return {
        buildingsEnabled: !buildingsAreActive,
        autoBuildingsEnabled: false,
      };
    }),

  setAutoBuildings: (enabled) =>
    set({
      autoBuildingsEnabled: enabled,
    }),

  setOrbitEnabled: (enabled) =>
    set({
      orbitEnabled: enabled,
    }),

  setCameraStatus: (status) =>
    set((state) => {
      const headingDeg = normalizeDegrees(status.headingDeg);
      const pitchDeg = Math.round(status.pitchDeg * 10) / 10;
      const heightM = Math.round(status.heightM);
      const cameraLat =
        status.latitude === null ? null : Math.round(status.latitude * 10000) / 10000;
      const cameraLon =
        status.longitude === null ? null : Math.round(status.longitude * 10000) / 10000;

      if (
        Math.abs(state.cameraHeadingDeg - headingDeg) < 0.5 &&
        Math.abs(state.cameraPitchDeg - pitchDeg) < 0.5 &&
        Math.abs(state.cameraHeightM - heightM) < 5 &&
        state.cameraLat === cameraLat &&
        state.cameraLon === cameraLon
      ) {
        return state;
      }

      return {
        cameraHeadingDeg: headingDeg,
        cameraPitchDeg: pitchDeg,
        cameraHeightM: heightM,
        cameraLat,
        cameraLon,
      };
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

  requestFlyToCoordinates: (latitude, longitude, height = 35_000) =>
    set({
      autoBuildingsEnabled: false,
      orbitEnabled: false,
      lastCoordinateFlyTo: {
        latitude,
        longitude,
        height,
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

function normalizeDegrees(value: number) {
  return Math.round((((value % 360) + 360) % 360) * 10) / 10;
}

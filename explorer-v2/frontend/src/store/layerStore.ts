import { create } from 'zustand';
import type {
  AviationGridState,
  FlightAssetView,
  FlightSensorLinkState,
  GroundStationsState,
} from '../earth/flights/flightLayers';
import type { FlightRenderMode } from '../earth/flights/flights';

export type SatelliteSceneMode = 'points' | 'orbit-trails' | 'sensor-focus';
export type MaritimeSceneMode = 'traffic' | 'cable-risk' | 'vessel-follow';

interface LayerState {
  activeLayers: Record<string, boolean>;
  layerOpacity: Record<string, number>;
  flightRenderMode: FlightRenderMode;
  flightAssetView: FlightAssetView;
  flightSensorLink: FlightSensorLinkState;
  aviationGrid: AviationGridState;
  groundStations: GroundStationsState;
  satelliteSceneMode: SatelliteSceneMode;
  maritimeSceneMode: MaritimeSceneMode;
  toggleLayer: (id: string) => void;
  setLayer: (id: string, enabled: boolean) => void;
  setLayerOpacity: (id: string, opacity: number) => void;
  setFlightRenderMode: (mode: FlightRenderMode) => void;
  setFlightAssetView: (view: FlightAssetView) => void;
  setFlightSensorLink: (state: FlightSensorLinkState) => void;
  setAviationGrid: (key: keyof AviationGridState, enabled: boolean) => void;
  setGroundStationLayer: (key: keyof GroundStationsState, enabled: boolean) => void;
  setSatelliteSceneMode: (mode: SatelliteSceneMode) => void;
  setMaritimeSceneMode: (mode: MaritimeSceneMode) => void;
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
    vesselsAis: true,
    satellites: true,
    hazards: true,
    earthquakes: true,
    volcanoes: true,
    wildfires: true,
    storms: true,
    hydrology: false,
    airQuality: false,
    internetCables: true,
    infrastructureAssets: true,
    launchesDebris: true,
  },
  layerOpacity: {
    satelliteTrueColor: 100,
    radarPrecipitation: 90,
    clouds: 72,
    temperature: 100,
    wind10m: 86,
    pressureMslp: 82,
    humidity2m: 82,
    aircraftAdsb: 100,
    aircraftMilitary: 100,
    aircraftTrails: 88,
    vesselsAis: 86,
    satellites: 72,
    hazards: 100,
    earthquakes: 100,
    volcanoes: 100,
    wildfires: 100,
    storms: 100,
    hydrology: 90,
    airQuality: 90,
    internetCables: 90,
    infrastructureAssets: 90,
    launchesDebris: 60,
  },
  flightRenderMode: 'dot',
  flightAssetView: 'symbology',
  flightSensorLink: 'release',
  aviationGrid: {
    major: true,
    regional: true,
    local: false,
    heli: false,
    seaplane: false,
  },
  groundStations: {
    hfdl: false,
    comms: false,
  },
  satelliteSceneMode: 'points',
  maritimeSceneMode: 'cable-risk',
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
  setFlightRenderMode: (flightRenderMode) => set({ flightRenderMode }),
  setFlightAssetView: (flightAssetView) => set({ flightAssetView }),
  setFlightSensorLink: (flightSensorLink) => set({ flightSensorLink }),
  setAviationGrid: (key, enabled) =>
    set((state) => ({
      aviationGrid: {
        ...state.aviationGrid,
        [key]: enabled,
      },
    })),
  setGroundStationLayer: (key, enabled) =>
    set((state) => ({
      groundStations: {
        ...state.groundStations,
        [key]: enabled,
      },
    })),
  setSatelliteSceneMode: (satelliteSceneMode) => set({ satelliteSceneMode }),
  setMaritimeSceneMode: (maritimeSceneMode) => set({ maritimeSceneMode }),
}));

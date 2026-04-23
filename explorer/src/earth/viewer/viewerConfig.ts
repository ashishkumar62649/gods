import {
  Camera,
  EasingFunction,
  Ion,
  Math as CesiumMath,
  Rectangle,
  Terrain,
} from 'cesium';
import type { AviationGridState } from '../flights/flightLayers';
import type { SidebarSection } from './viewerTypes';

export const BUILDINGS_ALTITUDE_THRESHOLD = 300_000;
export const WORLD_TERRAIN = Terrain.fromWorldTerrain();

export const INITIAL_AVIATION_GRID: AviationGridState = {
  major: true,
  regional: true,
  local: false,
  heli: false,
  seaplane: false,
};

export const AVIATION_GRID_OPTIONS: Array<{
  key: keyof AviationGridState;
  label: string;
}> = [
  { key: 'major', label: 'Major Airports' },
  { key: 'regional', label: 'Regional Airports' },
  { key: 'local', label: 'Local Airstrips' },
  { key: 'heli', label: 'Helicopter Pads' },
  { key: 'seaplane', label: 'Seaplane Bases' },
];

export const HOME_VIEW = {
  lon: 78.9629,
  lat: 20.5937,
  height: 15_000_000,
  heading: 0,
  pitch: -85,
} as const;

export const FLIGHT_EASING = EasingFunction.SINUSOIDAL_IN_OUT;
export const COCKPIT_ENTRY_PITCH = CesiumMath.toRadians(-5);
export const COCKPIT_LOOK_SENSITIVITY = 0.004;

export const SECTION_TABS: Array<{
  id: SidebarSection;
  label: string;
  title: string;
}> = [
  { id: 'base', label: 'Base', title: 'Base Layers' },
  { id: 'intel', label: 'Intel', title: 'Intel Layers' },
  { id: 'infrastructure', label: 'Infra', title: 'Global Infrastructure' },
  { id: 'visual', label: 'Visual', title: 'Visual Modes' },
  { id: 'system', label: 'System', title: 'System Controls' },
];

export const ionToken = import.meta.env.VITE_CESIUM_ION_TOKEN;

if (ionToken) {
  Ion.defaultAccessToken = ionToken;
}

Camera.DEFAULT_VIEW_RECTANGLE = Rectangle.fromDegrees(
  HOME_VIEW.lon - 40,
  HOME_VIEW.lat - 30,
  HOME_VIEW.lon + 40,
  HOME_VIEW.lat + 30,
);

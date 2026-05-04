import type { AppMode } from '../app/appModes';
import type { Severity } from '../app/appTypes';

export interface MockMapEntity {
  id: string;
  type:
    | 'aircraft'
    | 'storm'
    | 'fire'
    | 'earthquake'
    | 'watch-zone'
    | 'port'
    | 'city'
    | 'corridor'
    | 'location';
  label: string;
  x: number;
  y: number;
  lat: number;
  lon: number;
  severity?: Severity;
  mode?: AppMode;
}

export const mockMapEntities: MockMapEntity[] = [
  { id: 'storm-mocha', type: 'storm', label: 'Storm cell', x: 51, y: 48, lat: 15.5, lon: 88.7, severity: 'high', mode: 'world-overview' },
  { id: 'tropical', type: 'storm', label: 'Tropical disturbance', x: 36, y: 54, lat: 3.1, lon: 65.2, severity: 'elevated', mode: 'world-overview' },
  { id: 'jakarta-fire', type: 'fire', label: 'Fire cluster', x: 59, y: 61, lat: -6.2, lon: 106.8, severity: 'moderate', mode: 'world-overview' },
  { id: 'quake-east', type: 'earthquake', label: 'Seismic signal', x: 67, y: 31, lat: 34.8, lon: 104.1, severity: 'moderate', mode: 'world-overview' },
  { id: 'bay-zone', type: 'watch-zone', label: 'Bay of Bengal', x: 55, y: 43, lat: 15.5, lon: 88.7, severity: 'high', mode: 'watch-zones' },
  { id: 'red-sea', type: 'watch-zone', label: 'Red Sea Route', x: 31, y: 39, lat: 19.2, lon: 39.5, severity: 'high', mode: 'watch-zones' },
  { id: 'kolkata-zone', type: 'corridor', label: 'Kolkata Corridor', x: 55, y: 25, lat: 22.57, lon: 88.36, severity: 'elevated', mode: 'watch-zones' },
  { id: 'mumbai-port', type: 'port', label: 'Mumbai Port', x: 47, y: 42, lat: 18.94, lon: 72.84, severity: 'moderate', mode: 'watch-zones' },
  { id: 'kolkata-pin', type: 'location', label: 'Selected location', x: 45, y: 43, lat: 22.57, lon: 88.36, severity: 'elevated', mode: 'location-intelligence' },
];

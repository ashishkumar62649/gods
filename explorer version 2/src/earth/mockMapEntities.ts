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
  severity?: Severity;
  mode?: AppMode;
}

export const mockMapEntities: MockMapEntity[] = [
  { id: 'storm-mocha', type: 'storm', label: 'Storm MOCHA', x: 51, y: 48, severity: 'high', mode: 'world-overview' },
  { id: 'tropical', type: 'storm', label: 'Tropical Disturbance', x: 36, y: 54, severity: 'elevated', mode: 'world-overview' },
  { id: 'jakarta-fire', type: 'fire', label: 'Fire Cluster', x: 59, y: 61, severity: 'moderate', mode: 'world-overview' },
  { id: 'quake-east', type: 'earthquake', label: 'M 4.1', x: 67, y: 31, severity: 'moderate', mode: 'world-overview' },
  { id: 'ignite21', type: 'aircraft', label: 'IGNITE21', x: 45, y: 28, severity: 'elevated', mode: 'asset-intelligence' },
  { id: 'bay-zone', type: 'watch-zone', label: 'Bay of Bengal', x: 55, y: 43, severity: 'high', mode: 'watch-zones' },
  { id: 'red-sea', type: 'watch-zone', label: 'Red Sea Route', x: 31, y: 39, severity: 'high', mode: 'watch-zones' },
  { id: 'kolkata-zone', type: 'corridor', label: 'Kolkata Corridor', x: 55, y: 25, severity: 'elevated', mode: 'watch-zones' },
  { id: 'mumbai-port', type: 'port', label: 'Mumbai Port', x: 47, y: 42, severity: 'moderate', mode: 'watch-zones' },
  { id: 'kolkata-pin', type: 'location', label: 'Kolkata, West Bengal, India', x: 45, y: 43, severity: 'elevated', mode: 'location-intelligence' },
];

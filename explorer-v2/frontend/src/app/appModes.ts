export type AppMode =
  | 'world-overview'
  | 'asset-intelligence'
  | 'watch-zones'
  | 'location-intelligence';

export const APP_MODES: Array<{ id: AppMode; label: string }> = [
  { id: 'world-overview', label: 'World Overview' },
  { id: 'asset-intelligence', label: 'Asset Intelligence' },
  { id: 'watch-zones', label: 'Watch Zones & Alerts' },
  { id: 'location-intelligence', label: 'Location Intelligence' },
];

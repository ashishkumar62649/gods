export type SatelliteMissionCategory =
  | 'SIGINT'
  | 'NAV'
  | 'COMMS'
  | 'WEATHER'
  | 'OTHER';

export type SatelliteDecayStatus = 'STABLE' | 'DECAYING';

export type SatelliteMissionFilters = Record<
  Exclude<SatelliteMissionCategory, 'OTHER'>,
  boolean
>;

export const SATELLITE_MISSION_FILTERS: Array<{
  key: Exclude<SatelliteMissionCategory, 'OTHER'>;
  label: string;
}> = [
  { key: 'SIGINT', label: 'SIGINT' },
  { key: 'NAV', label: 'NAV' },
  { key: 'COMMS', label: 'COMMS' },
  { key: 'WEATHER', label: 'WEATHER' },
];

export const INITIAL_SATELLITE_MISSION_FILTERS: SatelliteMissionFilters = {
  SIGINT: true,
  NAV: true,
  COMMS: true,
  WEATHER: true,
};

export interface SatelliteRecord {
  id_norad: string;
  object_name: string;
  object_type: string | null;
  country_origin: string | null;
  launch_date: string | null;
  latitude: number;
  longitude: number;
  altitude_km: number;
  velocity_kps: number | null;
  tle_epoch: string | null;
  inclination_deg: number | null;
  period_minutes: number | null;
  mean_motion_rev_per_day: number | null;
  perigee_km: number | null;
  apogee_km: number | null;
  constellation_id: string | null;
  mission_category: SatelliteMissionCategory;
  decay_status: SatelliteDecayStatus;
  line1: string;
  line2: string;
  data_source: string;
  tle_source: string;
  timestamp: number;
}

export interface SatelliteFeedMeta {
  count: number;
  timestamp: number;
  tle?: {
    count: number;
    lastFetchAt: string | null;
    source: string | null;
    error: string | null;
  };
  propagation?: {
    count: number;
    propagatedAt: string | null;
    errorCount: number;
    skippedCount: number;
    loopActive: boolean;
  };
}

export interface SatelliteFeedSnapshot {
  satellites: SatelliteRecord[];
  meta: SatelliteFeedMeta;
}

export type SatelliteFeedStatus = 'idle' | 'loading' | 'live' | 'error';

export interface SatelliteFeedState {
  status: SatelliteFeedStatus;
  sourceLabel: string;
  message: string;
  fetchedAt: string | null;
  satelliteCount: number;
  totalAvailable: number;
  decayingCount: number;
}

const SATELLITE_API_BASE = import.meta.env.VITE_FLIGHT_API_BASE?.trim() ?? '';

export const SATELLITE_API_URL = `${SATELLITE_API_BASE}/api/satellites`;
export const SATELLITE_POLL_INTERVAL_MS = 5_000;

export async function fetchSatelliteSnapshot(
  signal?: AbortSignal,
): Promise<SatelliteFeedSnapshot> {
  const response = await fetch(SATELLITE_API_URL, { signal });
  if (!response.ok) {
    throw new Error(`Satellite feed returned ${response.status}`);
  }

  return (await response.json()) as SatelliteFeedSnapshot;
}

export function getSatelliteDisplayName(satellite: SatelliteRecord) {
  return satellite.object_name?.trim() || `NORAD ${satellite.id_norad}`;
}

export function formatSatelliteAltitude(altitudeKm: number) {
  if (!Number.isFinite(altitudeKm)) return 'Unknown';
  return `${Math.round(altitudeKm).toLocaleString()} km`;
}

export function formatSatelliteVelocity(velocityKps: number | null) {
  if (velocityKps === null || !Number.isFinite(velocityKps)) return 'Unknown';
  return `${velocityKps.toFixed(2)} km/s`;
}

export function formatOrbitValue(value: number | null, unit: string, digits = 1) {
  if (!Number.isFinite(value)) return 'Unknown';
  return `${value!.toFixed(digits)} ${unit}`;
}

export function formatSatelliteMission(satellite: SatelliteRecord) {
  return satellite.mission_category ?? 'OTHER';
}

import { API_ROUTES } from '../config/endpoints';
import type { SatelliteData } from '../store/useSatelliteStore';

const ORBITAL_TIMEOUT_MS = 20_000;

export async function fetchSatelliteTelemetry(): Promise<SatelliteData[]> {
  try {
    const payload = await fetchPayload(API_ROUTES.LOCAL_SATELLITES);
    const rawSatellites = readArrayPayload(payload, 'satellites');

    return rawSatellites.map(normalizeSatellite).filter((satellite) => (
      satellite.id_norad &&
      Number.isFinite(satellite.latitude) &&
      Number.isFinite(satellite.longitude) &&
      Number.isFinite(satellite.altitude_km)
    ));
  } catch (error) {
    console.error('[Orbital API] Satellite fetch failed:', error);
    return [];
  }
}

async function fetchPayload(url: string) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), ORBITAL_TIMEOUT_MS);

  try {
    const response = await fetch(url, { signal: controller.signal });

    if (!response.ok) {
      throw new Error(`Orbital endpoint returned ${response.status}`);
    }

    return await response.json();
  } finally {
    window.clearTimeout(timeoutId);
  }
}

function normalizeSatellite(record: Record<string, unknown>): SatelliteData {
  return {
    id_norad: readString(record, 'id_norad'),
    object_name: readString(record, 'object_name'),
    object_type: readNullableString(record, 'object_type'),
    country_origin: readNullableString(record, 'country_origin'),
    launch_date: readNullableString(record, 'launch_date'),
    latitude: readNumber(record, 'latitude'),
    longitude: readNumber(record, 'longitude'),
    altitude_km: readNumber(record, 'altitude_km'),
    velocity_kps: readNullableNumber(record, 'velocity_kps'),
    tle_epoch: readNullableString(record, 'tle_epoch'),
    inclination_deg: readNullableNumber(record, 'inclination_deg'),
    period_minutes: readNullableNumber(record, 'period_minutes'),
    mean_motion_rev_per_day: readNullableNumber(record, 'mean_motion_rev_per_day'),
    perigee_km: readNullableNumber(record, 'perigee_km'),
    apogee_km: readNullableNumber(record, 'apogee_km'),
    constellation_id: readNullableString(record, 'constellation_id'),
    mission_category: readMission(record),
    decay_status: readString(record, 'decay_status') === 'DECAYING' ? 'DECAYING' : 'STABLE',
    line1: readString(record, 'line1'),
    line2: readString(record, 'line2'),
    data_source: readString(record, 'data_source') || 'unknown',
    tle_source: readString(record, 'tle_source') || 'unknown',
    timestamp: readNumber(record, 'timestamp') || Date.now(),
  };
}

function readMission(record: Record<string, unknown>): SatelliteData['mission_category'] {
  const mission = readString(record, 'mission_category');
  if (mission === 'SIGINT' || mission === 'NAV' || mission === 'COMMS' || mission === 'WEATHER') {
    return mission;
  }
  return 'OTHER';
}

function readArrayPayload(payload: unknown, key: string): Record<string, unknown>[] {
  if (Array.isArray(payload)) return payload.filter(isRecord);
  if (isRecord(payload) && Array.isArray(payload[key])) return payload[key].filter(isRecord);
  return [];
}

function readString(record: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    const text = typeof value === 'string' ? value.trim() : String(value ?? '').trim();
    if (text) return text;
  }
  return '';
}

function readNullableString(record: Record<string, unknown>, ...keys: string[]) {
  const value = readString(record, ...keys);
  return value || null;
}

function readNumber(record: Record<string, unknown>, ...keys: string[]) {
  const value = Number(keys.map((key) => record[key]).find((candidate) => candidate != null));
  return Number.isFinite(value) ? value : 0;
}

function readNullableNumber(record: Record<string, unknown>, ...keys: string[]) {
  const value = Number(keys.map((key) => record[key]).find((candidate) => candidate != null));
  return Number.isFinite(value) ? value : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}

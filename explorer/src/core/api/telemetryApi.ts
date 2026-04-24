import { API_ROUTES } from '../config/endpoints';
import type { AirportData, FlightData, ShipData } from '../store/useTelemetryStore';

const TELEMETRY_TIMEOUT_MS = 5_000;

export async function fetchFlightTelemetry(): Promise<FlightData[]> {
  try {
    const payload = await fetchTelemetryPayload(API_ROUTES.LOCAL_FLIGHTS);
    const rawFlights = readArrayPayload(payload, 'flights');

    return rawFlights.map(normalizeFlight).filter((flight) => (
      flight.id && Number.isFinite(flight.lat) && Number.isFinite(flight.lon)
    ));
  } catch (error) {
    console.error('[Telemetry API] Flight telemetry fetch failed:', error);
    return [];
  }
}

export async function fetchMaritimeTelemetry(): Promise<ShipData[]> {
  try {
    const payload = await fetchTelemetryPayload(API_ROUTES.LOCAL_MARITIME);
    const rawShips = readArrayPayload(payload, 'vessels');

    return rawShips.map((ship) => ({
      id:
        readString(ship, 'id') ||
        readString(ship, 'mmsi') ||
        `${readString(ship, 'name')}:${readString(ship, 'timestamp')}`,
      lat: readNumber(ship, 'lat', 'latitude'),
      lon: readNumber(ship, 'lon', 'longitude'),
      heading: readNumber(ship, 'heading', 'heading_deg'),
      speed: readNumber(ship, 'speed', 'speed_knots'),
      type: readString(ship, 'type'),
      name: readString(ship, 'name') || readString(ship, 'id') || 'Unknown vessel',
      timestamp: readString(ship, 'timestamp') || new Date().toISOString(),
      mmsi: readString(ship, 'mmsi') || null,
    })).filter((ship) => ship.id && Number.isFinite(ship.lat) && Number.isFinite(ship.lon));
  } catch (error) {
    console.error('[Telemetry API] Maritime telemetry fetch failed:', error);
    return [];
  }
}

export async function fetchAirports(): Promise<AirportData[]> {
  try {
    const payload = await fetchTelemetryPayload(API_ROUTES.LOCAL_AIRPORTS);
    const airports = Array.isArray(payload) ? payload.filter(isRecord) : [];

    return airports.map((airport) => ({
      id: readString(airport, 'id'),
      ident: readString(airport, 'ident'),
      name: readString(airport, 'name'),
      type: readString(airport, 'type'),
      municipality: readNullableString(airport, 'municipality'),
      isoCountry: readNullableString(airport, 'isoCountry', 'iso_country'),
      iataCode: readNullableString(airport, 'iataCode', 'iata_code'),
      icaoCode: readNullableString(airport, 'icaoCode', 'icao_code'),
      latitude: readNumber(airport, 'latitude', 'lat'),
      longitude: readNumber(airport, 'longitude', 'lon'),
    })).filter((airport) => (
      airport.id && Number.isFinite(airport.latitude) && Number.isFinite(airport.longitude)
    ));
  } catch (error) {
    console.error('[Telemetry API] Airport fetch failed:', error);
    return [];
  }
}

function normalizeFlight(flight: Record<string, unknown>): FlightData {
  const id = readString(flight, 'id_icao') || readString(flight, 'id');
  const altitude = readNumber(flight, 'altitude_baro_m', 'alt');
  const heading = readNumber(flight, 'heading_true_deg', 'heading');
  const timestamp = readNumber(flight, 'timestamp') || Date.now() / 1000;

  return {
    id,
    lat: readNumber(flight, 'latitude', 'lat'),
    lon: readNumber(flight, 'longitude', 'lon'),
    alt: altitude,
    heading,
    callsign: readString(flight, 'callsign'),
    isMilitary: readBoolean(flight, 'is_military', 'isMilitary'),
    registration: readNullableString(flight, 'registration'),
    aircraftType: readNullableString(flight, 'aircraft_type', 'aircraftType'),
    description: readNullableString(flight, 'description'),
    ownerOperator: readNullableString(flight, 'owner_operator', 'ownerOperator'),
    countryOrigin: readNullableString(flight, 'country_origin', 'countryOrigin'),
    altitudeGeomM: readNullableNumber(flight, 'altitude_geom_m', 'altitudeGeomM'),
    velocityMps: readNumber(flight, 'velocity_mps', 'velocityMps'),
    headingMagDeg: readNullableNumber(flight, 'heading_mag_deg', 'headingMagDeg'),
    verticalRateMps: readNumber(flight, 'vertical_rate_mps', 'verticalRateMps'),
    onGround: readBoolean(flight, 'on_ground', 'onGround'),
    isEstimated: readBoolean(flight, 'is_estimated', 'isEstimated'),
    squawk: readNullableString(flight, 'squawk'),
    isInteresting: readBoolean(flight, 'is_interesting', 'isInteresting'),
    isPia: readBoolean(flight, 'is_pia', 'isPia'),
    isLadd: readBoolean(flight, 'is_ladd', 'isLadd'),
    dataSource: readString(flight, 'data_source', 'dataSource') || 'unknown',
    timestamp,
  };
}

async function fetchTelemetryPayload(url: string): Promise<unknown> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), TELEMETRY_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Telemetry endpoint returned ${response.status}`);
    }

    return await response.json();
  } finally {
    window.clearTimeout(timeoutId);
  }
}

function readArrayPayload(payload: unknown, key: string): Record<string, unknown>[] {
  if (Array.isArray(payload)) {
    return payload.filter(isRecord);
  }

  if (isRecord(payload) && Array.isArray(payload[key])) {
    return payload[key].filter(isRecord);
  }

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

function readBoolean(record: Record<string, unknown>, ...keys: string[]) {
  return keys.some((key) => record[key] === true);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}

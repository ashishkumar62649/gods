import { API_ROUTES } from '../config/endpoints';
import type { FlightData, ShipData } from '../store/useTelemetryStore';

const TELEMETRY_TIMEOUT_MS = 5_000;

export async function fetchFlightTelemetry(): Promise<FlightData[]> {
  try {
    const rawFlights = await fetchTelemetryArray(`${API_ROUTES.LOCAL_TELEMETRY}/flights`);

    return rawFlights.map((flight) => ({
      id: readString(flight, 'id'),
      lat: readNumber(flight, 'lat'),
      lon: readNumber(flight, 'lon'),
      alt: readNumber(flight, 'alt'),
      heading: readNumber(flight, 'heading'),
      callsign: readString(flight, 'callsign'),
      isMilitary: readBoolean(flight, 'isMilitary'),
    }));
  } catch (error) {
    console.error('[Telemetry API] Flight telemetry fetch failed:', error);
    return [];
  }
}

export async function fetchMaritimeTelemetry(): Promise<ShipData[]> {
  try {
    const rawShips = await fetchTelemetryArray(`${API_ROUTES.LOCAL_TELEMETRY}/ships`);

    return rawShips.map((ship) => ({
      id: readString(ship, 'id'),
      lat: readNumber(ship, 'lat'),
      lon: readNumber(ship, 'lon'),
      heading: readNumber(ship, 'heading'),
      speed: readNumber(ship, 'speed'),
      type: readString(ship, 'type'),
    }));
  } catch (error) {
    console.error('[Telemetry API] Maritime telemetry fetch failed:', error);
    return [];
  }
}

async function fetchTelemetryArray(url: string): Promise<Record<string, unknown>[]> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), TELEMETRY_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Telemetry endpoint returned ${response.status}`);
    }

    const payload = await response.json();
    return Array.isArray(payload) ? payload.filter(isRecord) : [];
  } finally {
    window.clearTimeout(timeoutId);
  }
}

function readString(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return typeof value === 'string' ? value : String(value ?? '');
}

function readNumber(record: Record<string, unknown>, key: string) {
  const value = Number(record[key]);
  return Number.isFinite(value) ? value : 0;
}

function readBoolean(record: Record<string, unknown>, key: string) {
  return record[key] === true;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}

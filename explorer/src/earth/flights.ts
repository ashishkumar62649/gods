export interface FlightTrailPoint {
  latitude: number;
  longitude: number;
  altitudeMeters: number;
}

export interface FlightRecord {
  id: string;
  callsign: string | null;
  latitude: number;
  longitude: number;
  altitudeMeters: number;
  headingDegrees: number;
  speedMetersPerSecond: number;
  timestamp: number;
  originCountry?: string | null;
  trail: FlightTrailPoint[];
}

export interface AirportRecord {
  id: string;
  ident: string;
  name: string;
  type: string;
  municipality: string | null;
  isoCountry: string | null;
  iataCode: string | null;
  icaoCode: string | null;
  latitude: number;
  longitude: number;
}

export interface FlightRouteSnapshot {
  callsign: string | null;
  found: boolean;
  fetchedAt?: string;
  origin: AirportRecord | null;
  destination: AirportRecord | null;
  error?: string;
}

export interface FlightFeedSnapshot {
  source: 'opensky' | 'mock';
  authMode: 'oauth' | 'anonymous' | 'fallback';
  fetchedAt: string;
  totalAvailable: number;
  flights: FlightRecord[];
  error?: string;
}

export type FlightFeedStatus = 'idle' | 'loading' | 'live' | 'fallback' | 'error';
export type FlightRenderMode = 'dot' | 'icon';

export interface FlightFeedState {
  status: FlightFeedStatus;
  sourceLabel: string;
  message: string;
  fetchedAt: string | null;
  flightCount: number;
  totalAvailable: number;
}

const FLIGHT_API_BASE = import.meta.env.VITE_FLIGHT_API_BASE?.trim() ?? '';

export const FLIGHT_API_URL = `${FLIGHT_API_BASE}/api/flights`;
export const FLIGHT_ROUTE_API_BASE_URL = `${FLIGHT_API_BASE}/api/route`;
export const AIRPORTS_API_URL = `${FLIGHT_API_BASE}/api/airports`;
export const FLIGHT_POLL_INTERVAL_MS = 15_000;
export const FLIGHT_ICON_ALTITUDE_THRESHOLD = 3_500_000;
export const FLIGHT_PREDICTION_SECONDS = 12;

const PLANE_ICON_SVG = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
    <path fill="white" d="M32 5 38.2 21.5 49 25.7 49 30.4 38.8 29.1 35.5 34.8 40.8 51.2 37.3 53 32 41.4 26.7 53 23.2 51.2 28.5 34.8 25.2 29.1 15 30.4 15 25.7 25.8 21.5Z"/>
  </svg>
`;

const SELECTED_FLIGHT_ICON_SVG = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 88 88">
    <g fill="none" stroke="#5cf2b5" stroke-width="4.4" stroke-linecap="round" stroke-linejoin="round">
      <path d="M16 30 V16 H30" />
      <path d="M58 16 H72 V30" />
      <path d="M72 58 V72 H58" />
      <path d="M30 72 H16 V58" />
    </g>
    <path
      fill="#79ffd0"
      d="M44 12 49.6 27.2 59.2 31 59.2 35.2 50.2 34.1 47.3 39.1 52 54.5 48.8 56.2 44 45.3 39.2 56.2 36 54.5 40.7 39.1 37.8 34.1 28.8 35.2 28.8 31 38.4 27.2Z"
    />
  </svg>
`;

const AIRPORT_ICON_SVG = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 72 72">
    <circle cx="36" cy="36" r="26" fill="#122038" stroke="#89d8ff" stroke-width="4" />
    <path fill="#f4fbff" d="M35.7 15 40.3 26.9 49 30.3 49 34.6 40.9 33.8 38.4 38.3 42.2 50.4 39.3 52 35.7 43.3 32.2 52 29.3 50.4 33.1 38.3 30.5 33.8 22.4 34.6 22.4 30.3 31.1 26.9Z"/>
  </svg>
`;

const ORIGIN_AIRPORT_ICON_SVG = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 84 84">
    <circle cx="42" cy="42" r="32" fill="#11251a" stroke="#75f6b8" stroke-width="5" />
    <path fill="#d8fff0" d="M42 22 46.9 34.8 57.1 38.9 57.1 43.3 47.6 42.3 44.6 47.4 49.2 61.8 45.9 63.6 42 53.4 38.1 63.6 34.8 61.8 39.4 47.4 36.4 42.3 26.9 43.3 26.9 38.9 37.1 34.8Z"/>
  </svg>
`;

const DESTINATION_AIRPORT_ICON_SVG = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 84 84">
    <circle cx="42" cy="42" r="32" fill="#291914" stroke="#ffb089" stroke-width="5" />
    <path fill="#fff1e8" d="M42 22 46.9 34.8 57.1 38.9 57.1 43.3 47.6 42.3 44.6 47.4 49.2 61.8 45.9 63.6 42 53.4 38.1 63.6 34.8 61.8 39.4 47.4 36.4 42.3 26.9 43.3 26.9 38.9 37.1 34.8Z"/>
  </svg>
`;

export const FLIGHT_ICON_IMAGE = `data:image/svg+xml;utf8,${encodeURIComponent(
  PLANE_ICON_SVG,
)}`;

export const SELECTED_FLIGHT_ICON_IMAGE = `data:image/svg+xml;utf8,${encodeURIComponent(
  SELECTED_FLIGHT_ICON_SVG,
)}`;

export const AIRPORT_ICON_IMAGE = `data:image/svg+xml;utf8,${encodeURIComponent(
  AIRPORT_ICON_SVG,
)}`;

export const ORIGIN_AIRPORT_ICON_IMAGE = `data:image/svg+xml;utf8,${encodeURIComponent(
  ORIGIN_AIRPORT_ICON_SVG,
)}`;

export const DESTINATION_AIRPORT_ICON_IMAGE = `data:image/svg+xml;utf8,${encodeURIComponent(
  DESTINATION_AIRPORT_ICON_SVG,
)}`;

export function getFlightDisplayName(flight: FlightRecord) {
  const callsign = flight.callsign?.trim();
  return callsign && callsign.length > 0 ? callsign : flight.id.toUpperCase();
}

export function getAirportDisplayCode(airport: AirportRecord) {
  return airport.iataCode || airport.icaoCode || airport.ident;
}

export function getFlightRenderMode(cameraHeightMeters: number): FlightRenderMode {
  return cameraHeightMeters > FLIGHT_ICON_ALTITUDE_THRESHOLD ? 'dot' : 'icon';
}

export async function fetchFlightSnapshot(signal?: AbortSignal) {
  const response = await fetch(FLIGHT_API_URL, { signal });
  if (!response.ok) {
    throw new Error(`Flight feed returned ${response.status}`);
  }

  return (await response.json()) as FlightFeedSnapshot;
}

export async function fetchFlightRoute(callsign: string, signal?: AbortSignal) {
  const response = await fetch(
    `${FLIGHT_ROUTE_API_BASE_URL}/${encodeURIComponent(callsign.trim())}`,
    { signal },
  );

  if (response.status === 404) {
    return (await response.json()) as FlightRouteSnapshot;
  }

  if (!response.ok) {
    throw new Error(`Route lookup returned ${response.status}`);
  }

  return (await response.json()) as FlightRouteSnapshot;
}

export async function fetchAirports(signal?: AbortSignal) {
  const response = await fetch(AIRPORTS_API_URL, { signal });
  if (!response.ok) {
    throw new Error(`Airport feed returned ${response.status}`);
  }

  return (await response.json()) as AirportRecord[];
}

export function formatAltitudeMeters(altitudeMeters: number) {
  if (!Number.isFinite(altitudeMeters) || altitudeMeters <= 0) return 'Unknown';
  if (altitudeMeters >= 1000) return `${(altitudeMeters / 1000).toFixed(1)} km`;
  return `${Math.round(altitudeMeters)} m`;
}

export function formatSpeed(speedMetersPerSecond: number) {
  if (!Number.isFinite(speedMetersPerSecond) || speedMetersPerSecond <= 0) {
    return 'Unknown';
  }

  return `${Math.round(speedMetersPerSecond * 3.6)} km/h`;
}

export function formatHeading(headingDegrees: number) {
  if (!Number.isFinite(headingDegrees)) return 'Unknown';
  return `${Math.round(((headingDegrees % 360) + 360) % 360)} deg`;
}

export function formatLastUpdated(timestampSeconds: number) {
  if (!Number.isFinite(timestampSeconds) || timestampSeconds <= 0) {
    return 'Unknown';
  }

  const ageSeconds = Math.max(0, Math.round(Date.now() / 1000 - timestampSeconds));
  if (ageSeconds < 5) return 'Just now';
  if (ageSeconds < 60) return `${ageSeconds}s ago`;
  const ageMinutes = Math.round(ageSeconds / 60);
  return `${ageMinutes}m ago`;
}

export function predictFlightPosition(
  flight: FlightRecord,
  secondsAhead: number,
) {
  if (
    !Number.isFinite(flight.speedMetersPerSecond) ||
    flight.speedMetersPerSecond <= 0 ||
    !Number.isFinite(flight.headingDegrees)
  ) {
    return {
      latitude: flight.latitude,
      longitude: flight.longitude,
      altitudeMeters: flight.altitudeMeters,
    };
  }

  const earthRadiusMeters = 6_371_000;
  const distanceMeters = Math.max(0, secondsAhead) * flight.speedMetersPerSecond;
  const angularDistance = distanceMeters / earthRadiusMeters;
  const headingRadians = (flight.headingDegrees * Math.PI) / 180;
  const lat1 = (flight.latitude * Math.PI) / 180;
  const lon1 = (flight.longitude * Math.PI) / 180;

  const sinLat1 = Math.sin(lat1);
  const cosLat1 = Math.cos(lat1);
  const sinAngular = Math.sin(angularDistance);
  const cosAngular = Math.cos(angularDistance);

  const lat2 = Math.asin(
    sinLat1 * cosAngular +
    cosLat1 * sinAngular * Math.cos(headingRadians),
  );

  const lon2 =
    lon1 +
    Math.atan2(
      Math.sin(headingRadians) * sinAngular * cosLat1,
      cosAngular - sinLat1 * Math.sin(lat2),
    );

  return {
    latitude: (lat2 * 180) / Math.PI,
    longitude: ((((lon2 * 180) / Math.PI) + 540) % 360) - 180,
    altitudeMeters: flight.altitudeMeters,
  };
}

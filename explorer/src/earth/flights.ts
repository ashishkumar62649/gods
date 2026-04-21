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
  source?: 'opensky' | 'estimated';
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

// Top-down aircraft silhouette.
// Nose points UP (toward +Y in SVG = top of viewBox).
// Long fuselage, swept wings, small tail — appears thin from oblique angles.
const PLANE_ICON_SVG = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 64">
    <!-- fuselage -->
    <ellipse cx="16" cy="32" rx="3.5" ry="24" fill="white"/>
    <!-- main wings: swept back from mid-fuselage -->
    <polygon points="16,22 1,38 4,40 16,29 28,40 31,38" fill="white"/>
    <!-- tail fins -->
    <polygon points="16,54 6,62 8,64 16,59 24,64 26,62" fill="white"/>
  </svg>
`;

// Selected version — same silhouette, cyan, with bracket corners.
const SELECTED_FLIGHT_ICON_SVG = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 88">
    <!-- bracket corners -->
    <g fill="none" stroke="#5cf2b5" stroke-width="4" stroke-linecap="round">
      <path d="M4 22 V4 H22"/><path d="M42 4 H60 V22"/>
      <path d="M60 66 V84 H42"/><path d="M22 84 H4 V66"/>
    </g>
    <!-- fuselage -->
    <ellipse cx="32" cy="44" rx="4.5" ry="28" fill="#79ffd0"/>
    <!-- main wings -->
    <polygon points="32,32 6,52 10,55 32,44 54,55 58,52" fill="#79ffd0"/>
    <!-- tail fins -->
    <polygon points="32,68 18,80 21,82 32,75 43,82 46,80" fill="#79ffd0"/>
  </svg>
`;

const AIRPORT_ICON_SVG = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 72 72">
    <circle cx="36" cy="36" r="26" fill="#122038" stroke="#89d8ff" stroke-width="4" />
    <path fill="#f4fbff" d="M35.7 15 40.3 26.9 49 30.3 49 34.6 40.9 33.8 38.4 38.3 42.2 50.4 39.3 52 35.7 43.3 32.2 52 29.3 50.4 33.1 38.3 30.5 33.8 22.4 34.6 22.4 30.3 31.1 26.9Z"/>
  </svg>
`;

const MEDIUM_AIRPORT_ICON_SVG = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 72 72">
    <path fill="#132033" stroke="#80c7ff" stroke-width="4" d="M36 10 58 36 36 62 14 36Z" />
    <path fill="#f4fbff" d="M35.8 20 40 31 48 34.2 48 38.1 40.6 37.4 38.2 41.5 41.6 52.7 38.8 54.2 35.8 46 32.8 54.2 30 52.7 33.4 41.5 31 37.4 23.6 38.1 23.6 34.2 31.6 31Z"/>
  </svg>
`;

const SMALL_AIRPORT_ICON_SVG = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 72 72">
    <circle cx="36" cy="36" r="12" fill="#d9f3ff" />
    <circle cx="36" cy="36" r="20" fill="none" stroke="#6ebcff" stroke-width="4" stroke-dasharray="7 6" />
  </svg>
`;

const AUX_AIRPORT_ICON_SVG = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 72 72">
    <circle cx="36" cy="36" r="16" fill="#dceeff" />
    <path stroke="#88b6ff" stroke-width="5" stroke-linecap="round" d="M36 16v40M16 36h40" />
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

export const MEDIUM_AIRPORT_ICON_IMAGE = `data:image/svg+xml;utf8,${encodeURIComponent(
  MEDIUM_AIRPORT_ICON_SVG,
)}`;

export const SMALL_AIRPORT_ICON_IMAGE = `data:image/svg+xml;utf8,${encodeURIComponent(
  SMALL_AIRPORT_ICON_SVG,
)}`;

export const AUX_AIRPORT_ICON_IMAGE = `data:image/svg+xml;utf8,${encodeURIComponent(
  AUX_AIRPORT_ICON_SVG,
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
    throw new Error(await readErrorMessage(response, 'Route lookup'));
  }

  return (await response.json()) as FlightRouteSnapshot;
}

export async function fetchAirports(signal?: AbortSignal) {
  const response = await fetch(AIRPORTS_API_URL, { signal });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, 'Airport feed'));
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

async function readErrorMessage(response: Response, label: string) {
  try {
    const payload = (await response.clone().json()) as {
      error?: string;
      path?: string;
    };

    if (payload?.error) {
      return payload.path
        ? `${payload.error} (${payload.path})`
        : payload.error;
    }
  } catch {
    // Ignore JSON parse failures and fall back to the status text.
  }

  return `${label} returned ${response.status}`;
}

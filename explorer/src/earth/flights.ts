import largeAirportIconPng from '../assets/map-icons/generated/airport-large-blue.png?inline';
import mediumAirportIconPng from '../assets/map-icons/generated/airport-medium-yellow.png?inline';
import smallAirportIconPng from '../assets/map-icons/generated/airport-small-green.png?inline';
import helipadIconPng from '../assets/map-icons/generated/helipad-gold.png?inline';
import seaplaneIconPng from '../assets/map-icons/generated/seaplane-teal.png?inline';
import closedFacilityIconPng from '../assets/map-icons/generated/closed-facility.png?inline';
import commsTowerIconPng from '../assets/map-icons/generated/tower-comms-blue.png?inline';
import hfdlTowerIconPng from '../assets/map-icons/generated/tower-hfdl-red.png?inline';

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
  categoryCode?: number | null;
  aircraftTypeCode?: string | null;
  aircraftModel?: string | null;
  aircraftManufacturer?: string | null;
  aircraftRegistration?: string | null;
  aircraftOperator?: string | null;
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

export interface FlightTracePoint {
  time: number;
  latitude: number;
  longitude: number;
  baroAltitudeMeters: number;
  trueTrack: number | null;
  onGround: boolean;
}

export interface FlightTraceSnapshot {
  icao24: string;
  found: boolean;
  startTime?: number | null;
  endTime?: number | null;
  callsign?: string | null;
  path: FlightTracePoint[];
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
export const FLIGHT_TRACE_API_BASE_URL = `${FLIGHT_API_BASE}/api/trace`;
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
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80">
    <defs>
      <filter id="cyanLockGlow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="4" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    </defs>
    <g filter="url(#cyanLockGlow)">
      <path d="M 20 10 L 10 10 L 10 20 M 60 10 L 70 10 L 70 20 M 10 60 L 10 70 L 20 70 M 70 60 L 70 70 L 60 70" fill="none" stroke="#22d3ee" stroke-width="3" />
      <path d="M 40 15 L 40 25 M 40 55 L 40 65 M 15 40 L 25 40 M 55 40 L 65 40" fill="none" stroke="#67e8f9" stroke-width="2" opacity="0.8" />
      <circle cx="40" cy="40" r="18" fill="none" stroke="#a5f3fc" stroke-width="1" stroke-dasharray="4 4" opacity="0.6"/>
    </g>
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

export const SELECTED_FLIGHT_MODEL_GLTF = {
  asset: { version: '2.0' },
  extensionsUsed: ['KHR_materials_unlit'],
  extensionsRequired: ['KHR_materials_unlit'],
  scene: 0,
  scenes: [{ nodes: [0] }],
  nodes: [{ mesh: 0 }],
  meshes: [{
    primitives: [{
      attributes: { POSITION: 0 },
      indices: 1,
      material: 0,
    }],
  }],
  materials: [{
    pbrMetallicRoughness: {
      baseColorFactor: [0.49, 1.0, 0.82, 1.0],
      metallicFactor: 0.0,
      roughnessFactor: 1.0,
    },
    doubleSided: true,
    extensions: {
      KHR_materials_unlit: {},
    },
  }],
  buffers: [
    {
      uri: 'data:application/octet-stream;base64,AAAAAM3MDEAAAAAAAAAAAM3MzD7sUTg+AAAAAM3MzD7sUTi+AAAAADMz87/NzMw9zczMvwAAAAAAAAAAzczMPwAAAAAAAAAAzcwMv5qZmb8AAAAAzcwMP5qZmb8AAAAAAAAAAAAAoL8AAEA/',
      byteLength: 108,
    },
    {
      uri: 'data:application/octet-stream;base64,AAABAAQAAAAEAAIAAAAFAAEAAAACAAUABAAFAAEABAACAAUAAQAGAAMAAgADAAYAAQADAAcAAgAHAAMAAwAIAAEAAwACAAgA',
      byteLength: 72,
    },
  ],
  bufferViews: [
    {
      buffer: 0,
      byteOffset: 0,
      byteLength: 108,
      target: 34962,
    },
    {
      buffer: 1,
      byteOffset: 0,
      byteLength: 72,
      target: 34963,
    },
  ],
  accessors: [
    {
      bufferView: 0,
      byteOffset: 0,
      componentType: 5126,
      count: 9,
      type: 'VEC3',
      min: [-1.6, -1.9, -0.18],
      max: [1.6, 2.2, 0.75],
    },
    {
      bufferView: 1,
      byteOffset: 0,
      componentType: 5123,
      count: 36,
      type: 'SCALAR',
    },
  ],
} as const;

export const SELECTED_FLIGHT_MODEL_URL =
  `data:model/gltf+json,${encodeURIComponent(
    JSON.stringify(SELECTED_FLIGHT_MODEL_GLTF),
  )}`;

export const FLIGHT_ICON_IMAGE = `data:image/svg+xml;utf8,${encodeURIComponent(
  PLANE_ICON_SVG,
)}`;

export const SELECTED_FLIGHT_ICON_IMAGE = `data:image/svg+xml;utf8,${encodeURIComponent(
  SELECTED_FLIGHT_ICON_SVG,
)}`;

export const LARGE_AIRPORT_ICON_IMAGE = largeAirportIconPng;

export const MEDIUM_AIRPORT_ICON_IMAGE = mediumAirportIconPng;

export const SMALL_AIRPORT_ICON_IMAGE = smallAirportIconPng;

export const AIRPORT_ICON_IMAGE = LARGE_AIRPORT_ICON_IMAGE;

export const HELIPAD_ICON_IMAGE = helipadIconPng;

export const SEAPLANE_ICON_IMAGE = seaplaneIconPng;

export const CLOSED_AIRPORT_ICON_IMAGE = closedFacilityIconPng;

export const COMMS_TOWER_ICON_IMAGE = commsTowerIconPng;

export const HFDL_TOWER_ICON_IMAGE = hfdlTowerIconPng;

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

export async function fetchFlightTrace(icao24: string, signal?: AbortSignal) {
  const response = await fetch(
    `${FLIGHT_TRACE_API_BASE_URL}/${encodeURIComponent(icao24.trim().toLowerCase())}`,
    { signal },
  );

  if (response.status === 404) {
    return (await response.json()) as FlightTraceSnapshot;
  }

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, 'Trace lookup'));
  }

  return (await response.json()) as FlightTraceSnapshot;
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

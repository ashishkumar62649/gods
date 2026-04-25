import { airportIndex } from './airportIndex.mjs';
import { getAllFlights } from '../store/flightCache.mjs';

const OPENSKY_API_BASE = 'https://opensky-network.org/api';
const OPENSKY_TOKEN_URL = 'https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token';

const tokenState = {
  accessToken: null,
  expiresAtMs: 0,
};

function normalizeCallsign(callsign) {
  return String(callsign || '')
    .trim()
    .replace(/\s+/g, '')
    .toUpperCase();
}

function normalizeTextField(value) {
  const text = typeof value === 'string' ? value.trim() : '';
  return text || null;
}

function toFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function normalizeHeading(value) {
  const heading = toFiniteNumber(value) ?? 0;
  return ((heading % 360) + 360) % 360;
}

function estimateSurfaceDistanceMeters(lat1, lon1, lat2, lon2) {
  const earthRadiusMeters = 6_371_000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const startLat = (lat1 * Math.PI) / 180;
  const endLat = (lat2 * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(startLat) * Math.cos(endLat) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusMeters * c;
}

function bearingDegrees(lat1, lon1, lat2, lon2) {
  const startLat = (lat1 * Math.PI) / 180;
  const endLat = (lat2 * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const y = Math.sin(dLon) * Math.cos(endLat);
  const x =
    Math.cos(startLat) * Math.sin(endLat) -
    Math.sin(startLat) * Math.cos(endLat) * Math.cos(dLon);

  return normalizeHeading((Math.atan2(y, x) * 180) / Math.PI);
}

function headingDifferenceDegrees(a, b) {
  const delta = Math.abs(normalizeHeading(a) - normalizeHeading(b));
  return Math.min(delta, 360 - delta);
}

function serializeAirport(airport) {
  return {
    id: airport.id,
    ident: airport.ident,
    name: airport.name,
    type: airport.type,
    municipality: airport.municipality,
    isoCountry: airport.isoCountry,
    iataCode: airport.iataCode,
    icaoCode: airport.icaoCode,
    latitude: airport.latitude,
    longitude: airport.longitude,
  };
}

function extractRouteCodes(routePayload) {
  if (!routePayload || typeof routePayload !== 'object' || !routePayload.route) {
    return [null, null];
  }

  const parts = String(routePayload.route).split('-');
  if (parts.length < 2) {
    return [null, null];
  }

  return [parts[0].trim(), parts[parts.length - 1].trim()];
}

function estimateRouteFromLiveFlight(callsign) {
  if (!airportIndex.available || airportIndex.routeAirports.length === 0) {
    return null;
  }

  const liveFlights = getAllFlights();
  const activeFlight = liveFlights.find(
    (f) => normalizeCallsign(f.callsign) === callsign && Number.isFinite(f.latitude) && Number.isFinite(f.longitude),
  );

  if (!activeFlight) {
    return null;
  }

  const flightLat = activeFlight.latitude;
  const flightLon = activeFlight.longitude;
  const flightHeading = activeFlight.heading_true_deg;

  let bestDestination = null;
  let bestScore = Number.POSITIVE_INFINITY;

  for (const candidate of airportIndex.routeAirports) {
    const dMeters = estimateSurfaceDistanceMeters(flightLat, flightLon, candidate.latitude, candidate.longitude);
    if (dMeters < 1000 || dMeters > 15_000_000) {
      continue;
    }

    const requiredBearing = bearingDegrees(flightLat, flightLon, candidate.latitude, candidate.longitude);
    const headingDiff = headingDifferenceDegrees(flightHeading, requiredBearing);

    const baseScore = dMeters + headingDiff * 200_000;
    const typeBonus = airportTypePriorityBonus(candidate.type);
    const score = baseScore - typeBonus;

    if (score < bestScore) {
      bestScore = score;
      bestDestination = candidate;
    }
  }

  if (!bestDestination) {
    return null;
  }

  return {
    callsign,
    found: true,
    fetchedAt: new Date().toISOString(),
    source: 'estimated',
    origin: null,
    destination: serializeAirport(bestDestination),
  };
}

function airportTypePriorityBonus(type) {
  if (type === 'large_airport') return 350_000;
  if (type === 'medium_airport') return 180_000;
  if (type === 'small_airport') return 50_000;
  return 0;
}

function normalizeOpenSkyTrackPoint(point) {
  if (!Array.isArray(point) || point.length < 3) {
    return null;
  }

  const ts = toFiniteNumber(point[0]);
  const lat = toFiniteNumber(point[1]);
  const lon = toFiniteNumber(point[2]);

  if (ts == null || lat == null || lon == null) {
    return null;
  }

  return [
    ts,
    lat,
    lon,
    toFiniteNumber(point[3]),
    toFiniteNumber(point[4]),
    Boolean(point[5]),
  ];
}

async function getOpenSkyHeaders() {
  const clientId = process.env.OPENSKY_CLIENT_ID?.trim();
  const clientSecret = process.env.OPENSKY_CLIENT_SECRET?.trim();

  if (!clientId || !clientSecret) {
    return {};
  }

  const now = Date.now();
  if (tokenState.accessToken && now < tokenState.expiresAtMs - 30_000) {
    return { Authorization: `Bearer ${tokenState.accessToken}` };
  }

  const tokenResponse = await fetch(OPENSKY_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!tokenResponse.ok) {
    throw new Error(`OpenSky token request returned ${tokenResponse.status}`);
  }

  const tokenPayload = await tokenResponse.json();
  tokenState.accessToken = tokenPayload.access_token;
  tokenState.expiresAtMs = now + Number(tokenPayload.expires_in || 1800) * 1000;

  return { Authorization: `Bearer ${tokenState.accessToken}` };
}

export async function fetchRouteForCallsign(callsign) {
  const normalizedCallsign = normalizeCallsign(callsign);
  const authHeaders = await getOpenSkyHeaders();
  const response = await fetch(
    `${OPENSKY_API_BASE}/routes?callsign=${encodeURIComponent(normalizedCallsign)}`,
    { headers: authHeaders },
  );

  if (response.status === 404) {
    return (
      estimateRouteFromLiveFlight(normalizedCallsign) ??
      {
        callsign: normalizedCallsign,
        found: false,
        origin: null,
        destination: null,
        error: 'No route was found for this callsign.',
      }
    );
  }

  if (!response.ok) {
    throw new Error(`OpenSky route lookup returned ${response.status}`);
  }

  const payload = await response.json();
  const [originCode, destinationCode] = extractRouteCodes(payload);

  if (!originCode || !destinationCode) {
    return (
      estimateRouteFromLiveFlight(normalizedCallsign) ??
      {
        callsign: normalizedCallsign,
        found: false,
        origin: null,
        destination: null,
        error: 'OpenSky did not return usable origin and destination airport codes.',
      }
    );
  }

  const origin = airportIndex.airportsByCode.get(originCode);
  const destination = airportIndex.airportsByCode.get(destinationCode);

  if (!origin || !destination) {
    const missingCodes = [origin ? null : originCode, destination ? null : destinationCode]
      .filter(Boolean)
      .join(', ');

    return (
      estimateRouteFromLiveFlight(normalizedCallsign) ??
      {
        callsign: normalizedCallsign,
        found: false,
        origin: origin ? serializeAirport(origin) : null,
        destination: destination ? serializeAirport(destination) : null,
        error: `Airport lookup failed for ${missingCodes}.`,
      }
    );
  }

  return {
    callsign: normalizedCallsign,
    found: true,
    fetchedAt: new Date().toISOString(),
    source: 'opensky',
    origin: serializeAirport(origin),
    destination: serializeAirport(destination),
  };
}

export async function fetchTraceForIcao24(icao24) {
  const authHeaders = await getOpenSkyHeaders();
  const response = await fetch(
    `${OPENSKY_API_BASE}/tracks/all?icao24=${encodeURIComponent(icao24)}&time=0`,
    { headers: authHeaders },
  );

  if (response.status === 404) {
    return {
      icao24,
      found: false,
      path: [],
      error: 'No OpenSky track history was found for this aircraft.',
    };
  }

  if (!response.ok) {
    throw new Error(`OpenSky track lookup returned ${response.status}`);
  }

  const payload = await response.json();
  const rawPath = Array.isArray(payload?.path) ? payload.path : [];
  const path = rawPath
    .map(normalizeOpenSkyTrackPoint)
    .filter(Boolean);

  if (path.length === 0) {
    return {
      icao24,
      found: false,
      startTime: toFiniteNumber(payload?.startTime),
      endTime: toFiniteNumber(payload?.endTime),
      callsign: normalizeTextField(payload?.callsign),
      path: [],
      error: 'OpenSky returned no usable path points for this aircraft.',
    };
  }

  return {
    icao24,
    found: true,
    startTime: toFiniteNumber(payload?.startTime),
    endTime: toFiniteNumber(payload?.endTime),
    callsign: normalizeTextField(payload?.callsign),
    path,
  };
}

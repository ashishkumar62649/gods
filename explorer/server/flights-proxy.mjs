import { createServer } from 'node:http';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'csv-parse/sync';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

loadDotEnv(path.join(projectRoot, '.env'));

const PORT = Number(process.env.FLIGHT_PROXY_PORT || 8788);
const OPENSKY_API_BASE = 'https://opensky-network.org/api';
const OPENSKY_TOKEN_URL =
  'https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token';
const SNAPSHOT_TTL_MS = 12_000;
const MISSING_FLIGHT_RETENTION_MS = 45_000;
const ABSOLUTE_STALE_CONTACT_SECONDS = 150;
const MAX_TRAIL_POINTS = 15;
const AIRPORTS_CSV_PATH = resolveAirportCsvPath();

const cache = {
  snapshot: null,
  lastUpdatedMs: 0,
  refreshing: null,
};

const flightStore = new Map();

const tokenState = {
  accessToken: null,
  expiresAtMs: 0,
};

const airportIndex = loadAirportIndex(AIRPORTS_CSV_PATH);

createServer(async (req, res) => {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const requestUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const { pathname, searchParams } = requestUrl;

  if (pathname === '/api/flights' && req.method === 'GET') {
    try {
      const snapshot = await getFlightSnapshot();
      sendJson(res, 200, snapshot);
    } catch (error) {
      console.error('[flights-proxy] Failed to build flight snapshot:', error);
      sendJson(res, 500, {
        source: 'mock',
        authMode: 'fallback',
        fetchedAt: new Date().toISOString(),
        totalAvailable: 0,
        flights: [],
        error: error instanceof Error ? error.message : 'Unknown flight feed error',
      });
    }
    return;
  }

  if (pathname === '/api/flights/health' && req.method === 'GET') {
    sendJson(res, 200, {
      ok: true,
      cached: Boolean(cache.snapshot),
      lastUpdatedMs: cache.lastUpdatedMs,
      airportsCsvAvailable: airportIndex.available,
      airportsCsvPath: airportIndex.sourcePath,
      airportCount: airportIndex.airportsByCode.size,
      featuredAirportCount: airportIndex.featuredAirports.length,
      airportsError: airportIndex.loadError,
    });
    return;
  }

  if (pathname === '/api/airports' && req.method === 'GET') {
    if (!airportIndex.available) {
      sendJson(res, 503, {
        error: 'airports.csv is unavailable. Add the OurAirports CSV to enable airport layers.',
        path: airportIndex.sourcePath,
      });
      return;
    }

    const includeMedium = searchParams.get('includeMedium') === '1';
    const airports = includeMedium
      ? buildAirportLayerPayload(airportIndex)
      : airportIndex.featuredAirports.filter((airport) => airport.type === 'large_airport');

    sendJson(res, 200, airports);
    return;
  }

  if (pathname.startsWith('/api/route/') && req.method === 'GET') {
    if (!airportIndex.available) {
      sendJson(res, 503, {
        callsign: null,
        found: false,
        origin: null,
        destination: null,
        error: `airports.csv is unavailable at ${airportIndex.sourcePath}`,
      });
      return;
    }

    const callsign = decodeURIComponent(pathname.slice('/api/route/'.length)).trim();
    if (!callsign) {
      sendJson(res, 400, {
        callsign: null,
        found: false,
        origin: null,
        destination: null,
        error: 'A callsign is required.',
      });
      return;
    }

    try {
      const route = await fetchRouteForCallsign(callsign);
      if (!route.found) {
        sendJson(res, 404, route);
        return;
      }

      sendJson(res, 200, route);
    } catch (error) {
      console.error(`[flights-proxy] Failed to resolve route for ${callsign}:`, error);
      sendJson(res, 502, {
        callsign: normalizeCallsign(callsign),
        found: false,
        origin: null,
        destination: null,
        error: error instanceof Error ? error.message : 'Unknown route lookup error',
      });
    }
    return;
  }

  sendJson(res, 404, { error: 'Not found' });
}).listen(PORT, () => {
  console.log(`[flights-proxy] Listening on http://localhost:${PORT}`);
  if (airportIndex.available) {
    console.log(
      `[flights-proxy] Loaded ${airportIndex.airportsByCode.size} airport codes from ${airportIndex.sourcePath}`,
    );
  } else {
    console.warn(
      `[flights-proxy] airports.csv not loaded from ${airportIndex.sourcePath}: ${airportIndex.loadError}`,
    );
  }
});

async function getFlightSnapshot() {
  const now = Date.now();
  if (cache.snapshot && now - cache.lastUpdatedMs < SNAPSHOT_TTL_MS) {
    return cache.snapshot;
  }

  if (!cache.refreshing) {
    cache.refreshing = refreshSnapshot().finally(() => {
      cache.refreshing = null;
    });
  }

  return cache.refreshing;
}

async function refreshSnapshot() {
  try {
    const liveSnapshot = await fetchOpenSkySnapshot();
    cache.snapshot = liveSnapshot;
    cache.lastUpdatedMs = Date.now();
    return liveSnapshot;
  } catch (error) {
    console.warn('[flights-proxy] OpenSky fetch failed:', error);

    if (cache.snapshot?.flights?.length) {
      console.warn('[flights-proxy] Keeping the last good snapshot instead of dropping live traffic.');
      cache.lastUpdatedMs = Date.now();
      return cache.snapshot;
    }

    console.warn('[flights-proxy] No cached live snapshot available, falling back to mock data.');
    const fallback = buildMockSnapshot(
      error instanceof Error ? error.message : 'Unknown OpenSky error',
    );
    cache.snapshot = fallback;
    cache.lastUpdatedMs = Date.now();
    return fallback;
  }
}

async function fetchOpenSkySnapshot() {
  const authHeaders = await getOpenSkyHeaders();
  const response = await fetch(`${OPENSKY_API_BASE}/states/all`, {
    headers: authHeaders,
  });

  if (!response.ok) {
    throw new Error(`OpenSky returned ${response.status}`);
  }

  const payload = await response.json();
  const snapshotTime = Number(payload?.time) || Math.floor(Date.now() / 1000);
  const rows = Array.isArray(payload?.states) ? payload.states : [];

  const liveFlights = rows
    .map((row) => normalizeOpenSkyState(row, snapshotTime))
    .filter(Boolean);
  const flights = stabilizeFlights(liveFlights, snapshotTime);

  return {
    source: 'opensky',
    authMode: authHeaders.Authorization ? 'oauth' : 'anonymous',
    fetchedAt: new Date().toISOString(),
    totalAvailable: Math.max(rows.length, flights.length),
    flights,
  };
}

function stabilizeFlights(currentFlights, snapshotTime) {
  const nowMs = Date.now();
  const seenIds = new Set();

  for (const flight of currentFlights) {
    seenIds.add(flight.id);

    const existingEntry = flightStore.get(flight.id);
    const nextTrail = appendTrailPoint(existingEntry?.trail ?? [], flight);
    const stabilizedFlight = {
      ...flight,
      trail: nextTrail,
    };

    flightStore.set(flight.id, {
      flight: stabilizedFlight,
      trail: nextTrail,
      lastSeenMs: nowMs,
    });
  }

  for (const [flightId, entry] of flightStore.entries()) {
    if (seenIds.has(flightId)) continue;

    const missingTooLong = nowMs - entry.lastSeenMs > MISSING_FLIGHT_RETENTION_MS;
    const contactTooOld =
      snapshotTime - entry.flight.timestamp > ABSOLUTE_STALE_CONTACT_SECONDS;

    if (missingTooLong || contactTooOld) {
      flightStore.delete(flightId);
    }
  }

  return Array.from(flightStore.values())
    .map((entry) => entry.flight)
    .sort((a, b) => b.timestamp - a.timestamp);
}

async function fetchRouteForCallsign(callsign) {
  const normalizedCallsign = normalizeCallsign(callsign);
  const authHeaders = await getOpenSkyHeaders();
  const response = await fetch(
    `${OPENSKY_API_BASE}/routes?callsign=${encodeURIComponent(normalizedCallsign)}`,
    { headers: authHeaders },
  );

  if (response.status === 404) {
    return {
      callsign: normalizedCallsign,
      found: false,
      origin: null,
      destination: null,
      error: 'No route was found for this callsign.',
    };
  }

  if (!response.ok) {
    throw new Error(`OpenSky route lookup returned ${response.status}`);
  }

  const payload = await response.json();
  const [originCode, destinationCode] = extractRouteCodes(payload);

  if (!originCode || !destinationCode) {
    return {
      callsign: normalizedCallsign,
      found: false,
      origin: null,
      destination: null,
      error: 'OpenSky did not return usable origin and destination airport codes.',
    };
  }

  const origin = airportIndex.airportsByCode.get(originCode);
  const destination = airportIndex.airportsByCode.get(destinationCode);

  if (!origin || !destination) {
    const missingCodes = [origin ? null : originCode, destination ? null : destinationCode]
      .filter(Boolean)
      .join(', ');

    return {
      callsign: normalizedCallsign,
      found: false,
      origin: origin ? serializeAirport(origin) : null,
      destination: destination ? serializeAirport(destination) : null,
      error: `Airport lookup failed for ${missingCodes}.`,
    };
  }

  return {
    callsign: normalizedCallsign,
    found: true,
    fetchedAt: new Date().toISOString(),
    origin: serializeAirport(origin),
    destination: serializeAirport(destination),
  };
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

function normalizeOpenSkyState(row, snapshotTime) {
  if (!Array.isArray(row)) return null;

  const longitude = toFiniteNumber(row[5]);
  const latitude = toFiniteNumber(row[6]);
  const onGround = Boolean(row[8]);
  const speed = Math.max(0, toFiniteNumber(row[9]) ?? 0);
  const heading = normalizeHeading(row[10]);
  const geoAltitude = toFiniteNumber(row[13]);
  const baroAltitude = toFiniteNumber(row[7]);
  const altitudeMeters = Math.max(0, geoAltitude ?? baroAltitude ?? 0);
  const lastContact = Math.floor(toFiniteNumber(row[4]) ?? snapshotTime);

  if (
    longitude === null ||
    latitude === null ||
    onGround ||
    lastContact < snapshotTime - 90
  ) {
    return null;
  }

  return {
    id: String(row[0] || '').trim().toLowerCase(),
    callsign: typeof row[1] === 'string' ? row[1].trim() || null : null,
    originCountry: typeof row[2] === 'string' ? row[2] : null,
    latitude,
    longitude,
    altitudeMeters,
    headingDegrees: heading,
    speedMetersPerSecond: speed,
    timestamp: lastContact,
  };
}

function buildMockSnapshot(errorMessage) {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const flights = buildMockFlights(nowSeconds);

  return {
    source: 'mock',
    authMode: 'fallback',
    fetchedAt: new Date().toISOString(),
    totalAvailable: flights.length,
    flights,
    error: errorMessage,
  };
}

function buildMockFlights(nowSeconds) {
  const seeds = [
    ['ai101', 19.0896, 72.8656, 45, 250],
    ['ba257', 51.47, -0.4543, 95, 240],
    ['ek512', 25.2532, 55.3657, 105, 255],
    ['ua890', 40.6413, -73.7781, 75, 235],
    ['sq406', 1.3644, 103.9915, 60, 245],
    ['af226', 49.0097, 2.5479, 120, 238],
  ];

  return seeds.map(([id, baseLat, baseLon, heading, speed], index) => {
    const phase = nowSeconds / 180 + index;
    const latitude = Number(baseLat) + Math.sin(phase) * 2.8;
    const longitude = Number(baseLon) + Math.cos(phase) * 4.2;
    const altitudeMeters = 9500 + index * 700;

    return {
      id,
      callsign: String(id).toUpperCase(),
      originCountry: 'Mock Feed',
      latitude,
      longitude,
      altitudeMeters,
      headingDegrees: normalizeHeading(Number(heading) + phase * 20),
      speedMetersPerSecond: Number(speed),
      timestamp: nowSeconds,
      trail: buildMockTrail(latitude, longitude, altitudeMeters, Number(heading), Number(speed)),
    };
  });
}

function buildMockTrail(latitude, longitude, altitudeMeters, headingDegrees, speedMetersPerSecond) {
  const trail = [];
  const headingRadians = (headingDegrees * Math.PI) / 180;
  const metersPerStep = speedMetersPerSecond * 8;

  for (let index = MAX_TRAIL_POINTS - 1; index >= 0; index -= 1) {
    const distanceMeters = metersPerStep * index;
    const latOffset = (Math.cos(headingRadians) * distanceMeters) / 111_320;
    const lonOffset =
      (Math.sin(headingRadians) * distanceMeters) /
      Math.max(1, 111_320 * Math.cos((latitude * Math.PI) / 180));

    trail.push({
      latitude: latitude - latOffset,
      longitude: longitude - lonOffset,
      altitudeMeters,
    });
  }

  return trail;
}

function appendTrailPoint(existingTrail, flight) {
  const trailPoint = {
    latitude: flight.latitude,
    longitude: flight.longitude,
    altitudeMeters: flight.altitudeMeters,
  };

  const lastPoint = existingTrail[existingTrail.length - 1];
  if (
    lastPoint &&
    Math.abs(lastPoint.latitude - trailPoint.latitude) < 0.00005 &&
    Math.abs(lastPoint.longitude - trailPoint.longitude) < 0.00005 &&
    Math.abs(lastPoint.altitudeMeters - trailPoint.altitudeMeters) < 25
  ) {
    return existingTrail;
  }

  return [...existingTrail, trailPoint].slice(-MAX_TRAIL_POINTS);
}

function loadAirportIndex(csvPath) {
  if (!existsSync(csvPath)) {
    return {
      available: false,
      sourcePath: csvPath,
      loadError: 'File not found',
      airportsByCode: new Map(),
      featuredAirports: [],
    };
  }

  try {
    const source = readFileSync(csvPath, 'utf8');
    const rows = parse(source, {
      columns: true,
      skip_empty_lines: true,
      bom: true,
      relax_column_count: true,
      trim: true,
    });

    const airportsByCode = new Map();
    const featuredAirports = [];

    for (const row of rows) {
      const airport = normalizeAirportRow(row);
      if (!airport) continue;

      for (const code of buildAirportCodes(airport)) {
        airportsByCode.set(code, airport);
      }

      if (airport.type === 'large_airport' || airport.type === 'medium_airport') {
        featuredAirports.push(serializeAirport(airport));
      }
    }

    featuredAirports.sort((a, b) => a.name.localeCompare(b.name));

    return {
      available: true,
      sourcePath: csvPath,
      loadError: null,
      airportsByCode,
      featuredAirports,
    };
  } catch (error) {
    return {
      available: false,
      sourcePath: csvPath,
      loadError: error instanceof Error ? error.message : 'Unknown CSV parse error',
      airportsByCode: new Map(),
      featuredAirports: [],
    };
  }
}

function buildAirportLayerPayload(index) {
  const combined = [];
  const seenIds = new Set();

  for (const airport of index.featuredAirports) {
    if (airport.type !== 'large_airport' && airport.type !== 'medium_airport') {
      continue;
    }

    if (seenIds.has(airport.id)) continue;
    seenIds.add(airport.id);
    combined.push(airport);
  }

  return combined.length <= 5000
    ? combined
    : combined.filter((airport) => airport.type === 'large_airport');
}

function normalizeAirportRow(row) {
  const latitude = toFiniteNumber(
    Number(row.latitude_deg ?? row.latitude ?? row.lat ?? NaN),
  );
  const longitude = toFiniteNumber(
    Number(row.longitude_deg ?? row.longitude ?? row.lon ?? NaN),
  );
  const type = String(row.type || '').trim();
  const ident = normalizeAirportCode(row.ident);

  if (latitude === null || longitude === null || !type || !ident) {
    return null;
  }

  return {
    id: String(row.id || ident).trim(),
    ident,
    type,
    name: String(row.name || ident).trim(),
    municipality: typeof row.municipality === 'string' ? row.municipality.trim() || null : null,
    isoCountry: typeof row.iso_country === 'string' ? row.iso_country.trim() || null : null,
    iataCode: normalizeAirportCode(row.iata_code),
    icaoCode: normalizeAirportCode(row.gps_code) || ident,
    localCode: normalizeAirportCode(row.local_code),
    latitude,
    longitude,
  };
}

function buildAirportCodes(airport) {
  const codes = new Set([
    airport.ident,
    airport.icaoCode,
    airport.iataCode,
    airport.localCode,
  ]);

  return Array.from(codes).filter(Boolean);
}

function extractRouteCodes(payload) {
  if (Array.isArray(payload)) {
    if (payload.length >= 2 && payload.every((entry) => typeof entry === 'string')) {
      return [
        normalizeAirportCode(payload[0]),
        normalizeAirportCode(payload[payload.length - 1]),
      ];
    }

    if (payload.length >= 2) {
      const originCode = normalizeAirportCode(payload[0]?.airport || payload[0]?.icao || payload[0]?.iata);
      const destinationCode = normalizeAirportCode(
        payload[payload.length - 1]?.airport ||
        payload[payload.length - 1]?.icao ||
        payload[payload.length - 1]?.iata,
      );
      return [originCode, destinationCode];
    }
  }

  const route = Array.isArray(payload?.route) ? payload.route : null;
  if (route?.length >= 2) {
    return [
      normalizeAirportCode(route[0]),
      normalizeAirportCode(route[route.length - 1]),
    ];
  }

  return [
    normalizeAirportCode(payload?.estDepartureAirport || payload?.origin || payload?.departure),
    normalizeAirportCode(payload?.estArrivalAirport || payload?.destination || payload?.arrival),
  ];
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

function resolveAirportCsvPath() {
  const configuredPath = process.env.AIRPORTS_CSV_PATH?.trim();
  if (!configuredPath) {
    return path.join(projectRoot, 'server', 'data', 'airports.csv');
  }

  return path.isAbsolute(configuredPath)
    ? configuredPath
    : path.resolve(projectRoot, configuredPath);
}

function normalizeCallsign(callsign) {
  return String(callsign || '')
    .trim()
    .replace(/\s+/g, '')
    .toUpperCase();
}

function normalizeAirportCode(value) {
  const code = typeof value === 'string' ? value.trim().toUpperCase() : '';
  return code || null;
}

function toFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function normalizeHeading(value) {
  const heading = toFiniteNumber(value) ?? 0;
  return ((heading % 360) + 360) % 360;
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
}

function loadDotEnv(envPath) {
  if (!existsSync(envPath)) return;

  const source = readFileSync(envPath, 'utf8');
  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const separatorIndex = line.indexOf('=');
    if (separatorIndex === -1) continue;

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();
    if (!key || process.env[key] !== undefined) continue;

    process.env[key] = value.replace(/^['"]|['"]$/g, '');
  }
}

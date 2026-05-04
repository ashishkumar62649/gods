// ============================================================
// God Eyes — Data Fusion Engine
// server/index.mjs
//
// Two-layer architecture:
//   Layer 1 — Position Feed   : airplanes.live CDN (every 5s)
//   Layer 2 — Intel Feed      : adsb.lol /mil /pia /ladd /sqk (every 10s)
//
// At serve time, /api/flights merges both layers per-flight
// so the frontend receives a fully enriched GodsEyeFlight object.
//
// Run:
//   node server/index.mjs
//   npm run dev:flights
// ============================================================

import express from 'express';
import { PORT, RADAR_SWEEP_INTERVAL_MS } from './config/constants.mjs';
import { getAllFlights, removeStaleFlights } from './store/flightCache.mjs';
import { fetchPrimaryRadar, fetchCustomRadar, getSweeepStats } from './services/fetchers.mjs';
import { getAircraftStats, initAircraftIndex } from './services/aircraftIndex.mjs';
import { startIntelLoop, mergeIntel, getIntelStats, rawIntelStore } from './services/intelFetcher.mjs';
import { airportIndex, getAirportStats } from './services/airportIndex.mjs';
import { getAllSatellites, getSatelliteStats } from './store/satelliteCache.mjs';
import { startSatelliteTleRefreshLoop } from './services/satelliteFetcher.mjs';
import { startOrbitPropagationLoop } from './services/orbitPropagator.mjs';
import { getGfwTradeSnapshot, primeGfwTradeSnapshot } from './services/gfwService.mjs';
import {
  getClimateEngineStats,
  startClimateRefreshLoop,
} from './services/ClimateEngine.mjs';
import {
  getAllCables,
  getAllInfrastructureNodes,
  getAllShips,
  getInfrastructureStats,
} from './store/infrastructureStore.mjs';
import {
  LIVE_BINARY_CONTENT_TYPE,
  encodeFlightsLiveBinary,
  encodeHazardsLiveBinary,
  encodeMaritimeLiveBinary,
  encodeSatellitesLiveBinary,
  encodeWeatherLiveBinary,
} from './core/binaryTransport.mjs';
import { startInfrastructureRefreshLoop } from './services/infrastructureFetcher.mjs';
import { startShipStream } from './services/shipFetcher.mjs';
import { handleClimateStateRoute } from './routes/climate.mjs';
import { handleAssistantRoute } from './routes/assistant.mjs';
import { handleWeatherIntelRoute } from './routes/weatherIntel.mjs';
import { fetchRouteForCallsign, fetchTraceForIcao24 } from './services/opensky.mjs';
import {
  queryCableMvt,
  queryHazardsMvt,
  queryWeatherMvt,
} from './services/vectorTileDb.mjs';
import {
  hasTimelineQuery,
  queryFlightSnapshots,
  queryInfrastructureSnapshot,
  queryMaritimeSnapshots,
  querySatelliteSnapshots,
  timelineOptionsFromUrl,
} from './services/liveDomainDbReader.mjs';
import { parseTilePath } from './core/tilePaths.mjs';
import {
  queryActiveHazards,
  queryBestCurrentValues,
  parseLimit as parseWeatherIntelLimit,
} from './services/weatherIntelDb.mjs';
import {
  beginEmergencySweep,
  endEmergencySweep,
  getEmergencySnapshots,
  getEmergencyStats,
} from './services/emergencyTripwire.mjs';

// ─── CORS + JSON helpers ──────────────────────────────────────
function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function sendJson(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type':   'application/json',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

function sendMvt(res, tile) {
  res.writeHead(200, {
    'Content-Type': 'application/vnd.mapbox-vector-tile',
    'Content-Length': tile.byteLength,
    'Cache-Control': 'public, max-age=30',
  });
  res.end(tile);
}

function normalizeApiUrl(url) {
  const v2Aliases = new Map([
    ['/api/v2/aviation', '/api/flights'],
    ['/api/v2/aviation/flights', '/api/flights'],
    ['/api/v2/aviation/flights/live', '/api/flights'],
    ['/api/v2/aviation/airports', '/api/airports'],
    ['/api/v2/weather', '/api/intel/weather/current'],
    ['/api/v2/weather/current', '/api/intel/weather/current'],
    ['/api/v2/weather/best-current', '/api/intel/best-current'],
    ['/api/v2/weather/nearby', '/api/intel/nearby'],
    ['/api/v2/source-health', '/api/intel/source-health'],
    ['/api/v2/hazards', '/api/intel/hazards/active'],
    ['/api/v2/hazards/active', '/api/intel/hazards/active'],
    ['/api/v2/satellites', '/api/satellites'],
    ['/api/v2/satellites/live', '/api/satellites'],
    ['/api/v2/maritime', '/api/maritime'],
    ['/api/v2/maritime/live', '/api/maritime'],
    ['/api/v2/infrastructure', '/api/infrastructure'],
    ['/api/v2/locations', '/api/intel/nearby'],
    ['/api/v2/assistant/chat', '/api/assistant/chat'],
    ['/api/v2/assistant/context', '/api/assistant/context'],
    ['/api/v2/health', '/api/health'],
  ]);

  if (v2Aliases.has(url.pathname)) {
    const normalized = new URL(url);
    normalized.pathname = v2Aliases.get(url.pathname);
    return normalized;
  }

  if (url.pathname === '/api/v2') {
    const normalized = new URL(url);
    normalized.pathname = '/api';
    return normalized;
  }

  if (url.pathname.startsWith('/api/v2/')) {
    const normalized = new URL(url);
    normalized.pathname = `/api/${url.pathname.slice('/api/v2/'.length)}`;
    return normalized;
  }

  return url;
}

// ─── Sweep counter ────────────────────────────────────────────
let sweepCount  = 0;
let lastSweepAt = null;

async function runSweep() {
  beginEmergencySweep();
  try {
    await fetchPrimaryRadar();
    await fetchCustomRadar();   // no-op if CUSTOM_API_URL not set
  } finally {
    endEmergencySweep();
  }

  sweepCount++;
  lastSweepAt = new Date().toISOString();

  const { lastCount } = getSweeepStats();
  const total = getAllFlights().length;
  const intelSize = rawIntelStore.size;

  console.log(
    `[Sweep #${sweepCount}] Store: ${total.toLocaleString()} flights` +
    ` | Ingested: ${lastCount.toLocaleString()}` +
    ` | Intel: ${intelSize.toLocaleString()} records`,
  );
}

// Express API server. Existing copied v1 route handlers are kept compatible
// while v2 routes move toward explicit Express routers.
const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '2mb' }));

app.use(async (req, res) => {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const requestUrl = new URL(req.url, `http://localhost:${PORT}`);
  const url = normalizeApiUrl(requestUrl);

  if (await handleAssistantRoute(req, res, sendJson, url)) {
    return;
  }

  if (req.method === 'GET' && (requestUrl.pathname === '/api/v2/weather/current.bin' || url.pathname === '/api/weather/current.bin')) {
    try {
      const rows = await queryBestCurrentValues({
        limit: parseWeatherIntelLimit(url.searchParams.get('limit'), 600),
        parameter: url.searchParams.get('parameter') || null,
        source: url.searchParams.get('source') || null,
        time: url.searchParams.get('time') || null,
      });
      const buffer = encodeWeatherLiveBinary(rows);
      res.writeHead(200, {
        'Content-Type': LIVE_BINARY_CONTENT_TYPE,
        'Content-Length': buffer.byteLength,
        'Cache-Control': 'no-store',
      });
      res.end(buffer);
    } catch (error) {
      console.error('[Binary] weather current failed:', error);
      sendJson(res, 503, {
        error: 'Weather binary feed failed.',
        detail: error instanceof Error ? error.message : String(error),
      });
    }
    return;
  }

  if (req.method === 'GET' && (requestUrl.pathname === '/api/v2/hazards/live.bin' || url.pathname === '/api/hazards/live.bin')) {
    try {
      const rows = await queryActiveHazards({
        limit: parseWeatherIntelLimit(url.searchParams.get('limit'), 800),
        eventType: url.searchParams.get('eventType') || null,
        source: url.searchParams.get('source') || null,
        time: url.searchParams.get('time') || null,
        activeOnly: url.searchParams.get('activeOnly') !== 'false',
      });
      const buffer = encodeHazardsLiveBinary(rows);
      res.writeHead(200, {
        'Content-Type': LIVE_BINARY_CONTENT_TYPE,
        'Content-Length': buffer.byteLength,
        'Cache-Control': 'no-store',
      });
      res.end(buffer);
    } catch (error) {
      console.error('[Binary] hazards live failed:', error);
      sendJson(res, 503, {
        error: 'Hazards binary feed failed.',
        detail: error instanceof Error ? error.message : String(error),
      });
    }
    return;
  }

  if (await handleWeatherIntelRoute(req, res, sendJson, url)) {
    return;
  }

  const weatherTile = parseTilePath(requestUrl.pathname, '/api/v2/weather/tiles');
  if (req.method === 'GET' && weatherTile) {
    try {
      sendMvt(res, await queryWeatherMvt({
        ...weatherTile,
        parameter: url.searchParams.get('parameter'),
      }));
    } catch (error) {
      console.error('[MVT] weather tile failed:', error);
      sendMvt(res, Buffer.alloc(0));
    }
    return;
  }

  const hazardTile = parseTilePath(requestUrl.pathname, '/api/v2/hazards/tiles');
  if (req.method === 'GET' && hazardTile) {
    try {
      sendMvt(res, await queryHazardsMvt({
        ...hazardTile,
        eventType: url.searchParams.get('eventType'),
      }));
    } catch (error) {
      console.error('[MVT] hazard tile failed:', error);
      sendMvt(res, Buffer.alloc(0));
    }
    return;
  }

  const cableTile = parseTilePath(requestUrl.pathname, '/api/v2/infrastructure/cables/tiles');
  if (req.method === 'GET' && cableTile) {
    try {
      sendMvt(res, await queryCableMvt(cableTile));
    } catch (error) {
      console.error('[MVT] cable tile failed:', error);
      sendMvt(res, Buffer.alloc(0));
    }
    return;
  }

  if (req.method === 'GET' && (url.pathname === '/api/flights/live.bin' || requestUrl.pathname === '/api/v2/aviation/flights/live.bin')) {
    const buffer = encodeFlightsLiveBinary(getAllFlights().map(mergeIntel));
    res.writeHead(200, {
      'Content-Type': LIVE_BINARY_CONTENT_TYPE,
      'Content-Length': buffer.byteLength,
      'Cache-Control': 'no-store',
    });
    res.end(buffer);
    return;
  }

  if (req.method === 'GET' && (url.pathname === '/api/satellites/live.bin' || requestUrl.pathname === '/api/v2/satellites/live.bin')) {
    const buffer = encodeSatellitesLiveBinary(getAllSatellites());
    res.writeHead(200, {
      'Content-Type': LIVE_BINARY_CONTENT_TYPE,
      'Content-Length': buffer.byteLength,
      'Cache-Control': 'no-store',
    });
    res.end(buffer);
    return;
  }

  if (req.method === 'GET' && (url.pathname === '/api/maritime/live.bin' || requestUrl.pathname === '/api/v2/maritime/live.bin')) {
    const buffer = encodeMaritimeLiveBinary(getAllShips());
    res.writeHead(200, {
      'Content-Type': LIVE_BINARY_CONTENT_TYPE,
      'Content-Length': buffer.byteLength,
      'Cache-Control': 'no-store',
    });
    res.end(buffer);
    return;
  }

  // ── GET /api/flights ──────────────────────────────────────
  // Returns position-feed flights enriched with intel attributes.
  if (req.method === 'GET' && url.pathname === '/api/flights') {
    if (hasTimelineQuery(url)) {
      try {
        const flights = await queryFlightSnapshots(timelineOptionsFromUrl(url, 10_000));
        sendJson(res, 200, {
          flights,
          meta: {
            count: flights.length,
            timestamp: Date.now(),
            source: 'postgres:aviation.live_flight_snapshots',
            query: Object.fromEntries(url.searchParams.entries()),
          },
        });
      } catch (error) {
        console.error('[Flights DB] Timeline query failed:', error);
        sendJson(res, 503, {
          flights: [],
          error: 'Flight timeline database query failed.',
          detail: error instanceof Error ? error.message : String(error),
        });
      }
      return;
    }

    const rawFlights = getAllFlights();

    // Merge intel attributes into each flight at query time.
    // Only flights that appear in rawIntelStore are mutated;
    // others are passed through as-is (zero overhead).
    const flights = rawFlights.map(mergeIntel);

    const { source, lastCount } = getSweeepStats();
    const intel = getIntelStats();

    sendJson(res, 200, {
      flights,
      meta: {
        count:               flights.length,
        timestamp:           Date.now(),
        lastSweepAt,
        lastOpenSkyCount:    0,
        lastDarkFleetCount:  lastCount,
        lastDarkFleetSource: source,
        // Intel layer stats
        intelRecords:        intel.recordCount,
        intelMil:            intel.mil,
        intelPia:            intel.pia,
        intelLadd:           intel.ladd,
        intelEmerg:          intel.emerg,
        intelSweepAt:        intel.lastSweepAt,
        emergencyCount:      getEmergencyStats().cached,
      },
    });
    return;
  }

  // ── GET /api/health ───────────────────────────────────────
  if (req.method === 'GET' && url.pathname === '/api/flights/emergencies') {
    const emergencies = getEmergencySnapshots();
    sendJson(res, 200, {
      emergencies,
      meta: {
        count: emergencies.length,
        timestamp: Date.now(),
        ...getEmergencyStats(),
      },
    });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/airports') {
    if (!airportIndex.available) {
      sendJson(res, 503, {
        error: 'airports.csv is unavailable. Add the OurAirports CSV to enable airport layers.',
        path: airportIndex.sourcePath,
      });
      return;
    }

    sendJson(res, 200, airportIndex.airports);
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/satellites') {
    if (hasTimelineQuery(url)) {
      try {
        const satellites = await querySatelliteSnapshots(timelineOptionsFromUrl(url, 2000));
        sendJson(res, 200, {
          satellites,
          meta: {
            count: satellites.length,
            timestamp: Date.now(),
            source: 'postgres:satellites.state_snapshots',
            query: Object.fromEntries(url.searchParams.entries()),
          },
        });
      } catch (error) {
        console.error('[Satellites DB] Timeline query failed:', error);
        sendJson(res, 503, {
          satellites: [],
          error: 'Satellite timeline database query failed.',
          detail: error instanceof Error ? error.message : String(error),
        });
      }
      return;
    }

    const satellites = getAllSatellites();
    sendJson(res, 200, {
      satellites,
      meta: {
        count: satellites.length,
        timestamp: Date.now(),
        ...getSatelliteStats(),
      },
    });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/infrastructure') {
    if (hasTimelineQuery(url)) {
      try {
        const snapshot = await queryInfrastructureSnapshot(timelineOptionsFromUrl(url, 2000));
        sendJson(res, 200, {
          ...snapshot,
          meta: {
            count: snapshot.cables.length + snapshot.ships.length + snapshot.nodes.length,
            timestamp: Date.now(),
            source: 'postgres:infrastructure+maritime',
            query: Object.fromEntries(url.searchParams.entries()),
          },
        });
      } catch (error) {
        console.error('[Infrastructure DB] Timeline query failed:', error);
        sendJson(res, 503, {
          cables: [],
          ships: [],
          nodes: [],
          error: 'Infrastructure timeline database query failed.',
          detail: error instanceof Error ? error.message : String(error),
        });
      }
      return;
    }

    const cables = getAllCables();
    const ships = getAllShips();
    const nodes = getAllInfrastructureNodes();

    sendJson(res, 200, {
      cables,
      ships,
      nodes,
      meta: {
        count: cables.length,
        timestamp: Date.now(),
        ...getInfrastructureStats(),
      },
    });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/maritime') {
    if (hasTimelineQuery(url)) {
      try {
        const options = {
          ...timelineOptionsFromUrl(url, 10_000),
          sourceKey: url.searchParams.get('sourceKey') || url.searchParams.get('source') || null,
        };
        const vessels = await queryMaritimeSnapshots(options);
        sendJson(res, 200, {
          vessels,
          meta: {
            count: vessels.length,
            fetchedAt: new Date().toISOString(),
            source: options.sourceKey ? `postgres:maritime:${options.sourceKey}` : 'postgres:maritime',
            error: null,
            query: Object.fromEntries(url.searchParams.entries()),
          },
        });
      } catch (error) {
        console.error('[Maritime DB] Timeline query failed:', error);
        sendJson(res, 503, {
          vessels: [],
          meta: {
            count: 0,
            fetchedAt: null,
            source: 'postgres:maritime',
            error: error instanceof Error ? error.message : 'Maritime timeline database query failed.',
          },
        });
      }
      return;
    }

    try {
      const snapshot = await getGfwTradeSnapshot();
      sendJson(res, 200, snapshot);
    } catch (error) {
      console.error('[GFW] Maritime route failed:', error);
      sendJson(res, 502, {
        vessels: [],
        meta: {
          count: 0,
          fetchedAt: null,
          source: 'Global Fishing Watch',
          error: error instanceof Error ? error.message : 'Maritime feed unavailable.',
        },
      });
    }
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/climate/state') {
    await handleClimateStateRoute(req, res, sendJson);
    return;
  }

  // ── GET /api/trace/:icao24 ────────────────────────────────
  if (req.method === 'GET' && url.pathname.startsWith('/api/trace/')) {
    const icao24 = url.pathname.split('/').pop()?.trim().toLowerCase();
    if (!icao24) {
      sendJson(res, 400, { error: 'Missing or invalid icao24 parameter' });
      return;
    }

    try {
      const trace = await fetchTraceForIcao24(icao24);
      sendJson(res, 200, trace);
    } catch (error) {
      console.error(`[OpenSky] Trace failed for ${icao24}:`, error);
      sendJson(res, 502, {
        icao24,
        found: false,
        path: [],
        error: error instanceof Error ? error.message : 'OpenSky trace failed.',
      });
    }
    return;
  }

  // ── GET /api/route/:callsign ──────────────────────────────
  if (req.method === 'GET' && url.pathname.startsWith('/api/route/')) {
    const callsign = url.pathname.split('/').pop()?.trim().toUpperCase();
    if (!callsign) {
      sendJson(res, 400, { error: 'Missing or invalid callsign parameter' });
      return;
    }

    try {
      const route = await fetchRouteForCallsign(callsign);
      sendJson(res, 200, route);
    } catch (error) {
      console.error(`[OpenSky] Route lookup failed for ${callsign}:`, error);
      sendJson(res, 502, {
        callsign,
        found: false,
        origin: null,
        destination: null,
        error: error instanceof Error ? error.message : 'OpenSky route failed.',
      });
    }
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/health') {
    const { source, lastCount } = getSweeepStats();
    const intel = getIntelStats();
    sendJson(res, 200, {
      status:       'OK',
      uptime:       process.uptime(),
      storeSize:    getAllFlights().length,
      sweepCount,
      lastSweepAt,
      activeSource: source,
      lastCount,
      aircraft:      getAircraftStats(),
      airports:      getAirportStats(),
      satellites:    getSatelliteStats(),
      infrastructure: getInfrastructureStats(),
      climate:       getClimateEngineStats(),
      emergencies:   getEmergencyStats(),
      intel,
    });
    return;
  }

  sendJson(res, 404, { error: 'Not found' });
});

// ─── Bootstrap ───────────────────────────────────────────────
const server = app.listen(PORT, async () => {
  console.log('');
  console.log('🛰️  GOD\'S EYE — Multi-Layer Radar Online');
  console.log(`   Port    : ${PORT}`);
  console.log(`   Layer 1 : airplanes.live CDN  (every ${RADAR_SWEEP_INTERVAL_MS / 1000}s)`);
  console.log(`   Layer 2 : adsb.lol intel feed (every 10s)`);
  console.log('');

  // Aircraft identities are loaded once into RAM before live polling starts.
  // Normalizers then use synchronous Map lookups during every radar sweep.
  await initAircraftIndex();

  // ── Layer 1: Position feed ────────────────────────────────
  console.log('[Boot] Running initial position sweep…');
  await runSweep();

  setInterval(() => runSweep().catch(console.error), RADAR_SWEEP_INTERVAL_MS);
  setInterval(() => removeStaleFlights(), 5_000);

  // ── Layer 2: Intelligence feed ────────────────────────────
  startIntelLoop();
  startSatelliteTleRefreshLoop();
  startOrbitPropagationLoop();
  startInfrastructureRefreshLoop();
  startShipStream();
  startClimateRefreshLoop();
  void primeGfwTradeSnapshot().catch((error) => {
    console.error('[GFW] Maritime snapshot warmup failed:', error);
  });

  console.log('[Boot] Both layers active. Ready.');
});

server.on('error', (err) => {
  console.error('[Server] Fatal:', err.message);
  process.exit(1);
});

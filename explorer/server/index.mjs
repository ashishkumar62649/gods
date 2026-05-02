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

import http from 'node:http';
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
import { startInfrastructureRefreshLoop } from './services/infrastructureFetcher.mjs';
import { startShipStream } from './services/shipFetcher.mjs';
import { handleClimateStateRoute } from './routes/climate.mjs';
import { handleWeatherIntelRoute } from './routes/weatherIntel.mjs';
import { fetchRouteForCallsign, fetchTraceForIcao24 } from './services/opensky.mjs';
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

// ─── HTTP Server ──────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (await handleWeatherIntelRoute(req, res, sendJson, url)) {
    return;
  }

  // ── GET /api/flights ──────────────────────────────────────
  // Returns position-feed flights enriched with intel attributes.
  if (req.method === 'GET' && url.pathname === '/api/flights') {
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
server.listen(PORT, async () => {
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

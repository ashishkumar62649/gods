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
import { startIntelLoop, mergeIntel, getIntelStats, rawIntelStore } from './services/intelFetcher.mjs';

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
  await fetchPrimaryRadar();
  await fetchCustomRadar();   // no-op if CUSTOM_API_URL not set

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
const server = http.createServer((req, res) => {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);

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
      },
    });
    return;
  }

  // ── GET /api/health ───────────────────────────────────────
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

  // ── Layer 1: Position feed ────────────────────────────────
  console.log('[Boot] Running initial position sweep…');
  await runSweep();

  setInterval(() => runSweep().catch(console.error), RADAR_SWEEP_INTERVAL_MS);
  setInterval(() => removeStaleFlights(), 5_000);

  // ── Layer 2: Intelligence feed ────────────────────────────
  startIntelLoop();

  console.log('[Boot] Both layers active. Ready.');
});

server.on('error', (err) => {
  console.error('[Server] Fatal:', err.message);
  process.exit(1);
});

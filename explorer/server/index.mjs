// ============================================================
// God Eyes — Data Fusion Engine
// server/index.mjs
//
// Entry point for the multi-source aviation intelligence backend.
//
// Run with:
//   node server/index.mjs
//
// Or via npm:
//   npm run dev:flights  (if script is updated in package.json)
// ============================================================

import http from 'node:http';
import { PORT, UPDATE_INTERVAL_MS } from './config/constants.mjs';
import { getAllFlights, removeStaleFlights } from './store/flightCache.mjs';
import { fetchOpenSky, fetchDarkFleet } from './services/fetchers.mjs';

// ─── Minimal CORS + JSON helper (no external dependencies) ───
/**
 * Write CORS headers that allow our local Vite dev server to
 * call this backend from any localhost port.
 */
function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

/**
 * Send a JSON response.
 * @param {http.ServerResponse} res
 * @param {number} status
 * @param {unknown} data
 */
function sendJson(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type':  'application/json',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

// ─── Sweep state ─────────────────────────────────────────────
const sweepStats = {
  sweepCount:         0,
  lastSweepAt:        null,
  lastOpenSkyCount:   0,
  lastDarkFleetCount: 0,
  lastDarkFleetSource: null,
  openSkyErrors:      0,
  darkFleetErrors:    0,
};

// ─── Radar Sweep ─────────────────────────────────────────────
/**
 * The core fusion loop.
 *
 * Fires both fetchers concurrently using Promise.allSettled so that
 * a failure in one source never blocks the other.
 * Stale records are pruned at the end of each sweep.
 */
async function radarSweep() {
  sweepStats.sweepCount++;
  sweepStats.lastSweepAt = new Date().toISOString();

  const [openSkyResult, darkFleetResult] = await Promise.allSettled([
    fetchOpenSky(),
    fetchDarkFleet(),
  ]);

  // ── OpenSky outcome ───────────────────────────────────────
  if (openSkyResult.status === 'fulfilled') {
    sweepStats.lastOpenSkyCount = openSkyResult.value.count;
  } else {
    sweepStats.openSkyErrors++;
    console.error('[Sweep] OpenSky failed:', openSkyResult.reason?.message ?? openSkyResult.reason);
  }

  // ── DarkFleet outcome ─────────────────────────────────────
  if (darkFleetResult.status === 'fulfilled') {
    sweepStats.lastDarkFleetCount  = darkFleetResult.value.count;
    sweepStats.lastDarkFleetSource = darkFleetResult.value.url;
  } else {
    sweepStats.darkFleetErrors++;
    console.error('[Sweep] DarkFleet failed:', darkFleetResult.reason?.message ?? darkFleetResult.reason);
  }

  // ── Stale record pruning ──────────────────────────────────
  removeStaleFlights();

  const total = getAllFlights().length;
  console.log(
    `[Sweep #${sweepStats.sweepCount}] Store: ${total} active flights` +
    ` | OpenSky: ${sweepStats.lastOpenSkyCount}` +
    ` | DarkFleet: ${sweepStats.lastDarkFleetCount}`
  );
}

// ─── HTTP Server ──────────────────────────────────────────────
const server = http.createServer((req, res) => {
  setCorsHeaders(res);

  // Pre-flight OPTIONS pass-through
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);

  // ── GET /api/flights ──────────────────────────────────────
  if (req.method === 'GET' && url.pathname === '/api/flights') {
    const flights = getAllFlights();
    sendJson(res, 200, {
      flights,
      meta: {
        count:              flights.length,
        timestamp:          Date.now(),
        sweepCount:         sweepStats.sweepCount,
        lastSweepAt:        sweepStats.lastSweepAt,
        lastOpenSkyCount:   sweepStats.lastOpenSkyCount,
        lastDarkFleetCount: sweepStats.lastDarkFleetCount,
        lastDarkFleetSource: sweepStats.lastDarkFleetSource,
      },
    });
    return;
  }

  // ── GET /api/health ───────────────────────────────────────
  if (req.method === 'GET' && url.pathname === '/api/health') {
    sendJson(res, 200, {
      status:    'OK',
      uptime:    process.uptime(),
      ...sweepStats,
      storeSize: getAllFlights().length,
    });
    return;
  }

  // ── 404 fallthrough ───────────────────────────────────────
  sendJson(res, 404, { error: 'Not found' });
});

// ─── Bootstrap ───────────────────────────────────────────────
server.listen(PORT, async () => {
  console.log('');
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║   God Eyes — Data Fusion Engine              ║');
  console.log(`║   Listening on http://localhost:${PORT}        ║`);
  console.log('╚══════════════════════════════════════════════╝');
  console.log('');
  console.log(`  Update interval : ${UPDATE_INTERVAL_MS / 1000}s`);
  console.log(`  OpenSky auth    : ${process.env.OPENSKY_CLIENT_ID ? 'OAuth' : 'Anonymous'}`);
  console.log('');

  // Run the first sweep immediately so the store is populated before
  // the first client request arrives.
  console.log('[Boot] Running initial radar sweep…');
  await radarSweep();

  // Then schedule regular sweeps.
  setInterval(radarSweep, UPDATE_INTERVAL_MS);
  console.log(`[Boot] Radar sweep scheduled every ${UPDATE_INTERVAL_MS / 1000}s`);
});

server.on('error', (err) => {
  console.error('[Server] Fatal error:', err.message);
  process.exit(1);
});

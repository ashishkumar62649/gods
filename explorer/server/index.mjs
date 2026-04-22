// ============================================================
// God Eyes — Data Fusion Engine
// server/index.mjs
//
// Single-source architecture: airplanes.live CDN .gz snapshot.
// Optional Expansion Port via CUSTOM_API_URL/.env.
//
// Run:
//   node server/index.mjs
//   npm run dev:flights
// ============================================================

import http from 'node:http';
import { PORT, RADAR_SWEEP_INTERVAL_MS } from './config/constants.mjs';
import { getAllFlights, removeStaleFlights } from './store/flightCache.mjs';
import { fetchPrimaryRadar, fetchCustomRadar, getSweeepStats } from './services/fetchers.mjs';

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
  console.log(
    `[Sweep #${sweepCount}] Store: ${total.toLocaleString()} active` +
    ` | Ingested: ${lastCount.toLocaleString()}`,
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
  if (req.method === 'GET' && url.pathname === '/api/flights') {
    const flights = getAllFlights();
    const { source, lastCount } = getSweeepStats();
    sendJson(res, 200, {
      flights,
      meta: {
        count:               flights.length,
        timestamp:           Date.now(),
        lastSweepAt,
        lastOpenSkyCount:    0,
        lastDarkFleetCount:  lastCount,
        lastDarkFleetSource: source,
      },
    });
    return;
  }

  // ── GET /api/health ───────────────────────────────────────
  if (req.method === 'GET' && url.pathname === '/api/health') {
    const { source, lastCount } = getSweeepStats();
    sendJson(res, 200, {
      status:      'OK',
      uptime:      process.uptime(),
      storeSize:   getAllFlights().length,
      sweepCount,
      lastSweepAt,
      activeSource: source,
      lastCount,
    });
    return;
  }

  sendJson(res, 404, { error: 'Not found' });
});

// ─── Bootstrap ───────────────────────────────────────────────
server.listen(PORT, async () => {
  console.log('');
  console.log('🛰️  GOD\'S EYE — Global Radar Online');
  console.log(`   Port    : ${PORT}`);
  console.log(`   Primary : airplanes.live CDN (GZIP snapshot)`);
  console.log(`   Sweep   : every ${RADAR_SWEEP_INTERVAL_MS / 1000}s`);
  console.log('');

  // Warm the store before first client hit
  console.log('[Boot] Running initial sweep…');
  await runSweep();

  // Decoupled radar + cleanup intervals
  setInterval(() => runSweep().catch(console.error),          RADAR_SWEEP_INTERVAL_MS);
  setInterval(() => removeStaleFlights(), 5_000);

  console.log('[Boot] Radar active. Ready.');
});

server.on('error', (err) => {
  console.error('[Server] Fatal:', err.message);
  process.exit(1);
});

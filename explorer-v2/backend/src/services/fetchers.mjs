// ============================================================
// God Eyes — Data Fusion Engine
// server/services/fetchers.mjs
//
// fetchPrimaryRadar — pulls the static GZIP snapshot from
//   airplanes.live CDN (~25 000 aircraft, updated every ~8s).
//   Uses a magic-byte check to handle both compressed and
//   plain-JSON responses safely.
//
// fetchCustomRadar — Expansion Port. Silently no-ops if
//   CUSTOM_API_URL is not set in .env.
// ============================================================

import { gunzipSync } from 'node:zlib';
import {
  PRIMARY_FEED_URL,
  CUSTOM_API_URL,
  CUSTOM_API_KEY,
  FETCH_TIMEOUT_MS,
} from '../config/constants.mjs';
import { normalizeReadsb, normalizeCustomApi } from '../domain/normalizers/normalizer.mjs';
import { upsertFlight } from '../store/flightCache.mjs';

// ─── Request headers ─────────────────────────────────────────
const requestHeaders = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
    '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept':          'application/json, application/octet-stream, */*',
  'Accept-Encoding': 'gzip, deflate, br',
  'Accept-Language': 'en-US,en;q=0.9',
  'Referer':         'https://globe.airplanes.live/',
  'Origin':          'https://globe.airplanes.live',
  'Cache-Control':   'no-cache',
  'Pragma':          'no-cache',
};

// ─── Timeout-aware fetch ─────────────────────────────────────
function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  return fetch(url, { cache: 'no-store', ...options, signal: controller.signal })
    .finally(() => clearTimeout(timer));
}

function buildFreshSnapshotUrl(sourceUrl) {
  const url = new URL(sourceUrl);
  url.searchParams.set('_', String(Date.now()));
  return url.toString();
}

// ─── Sweep stats (read by index.mjs for /api/health) ─────────
let _lastSource    = 'airplanes.live CDN';
let _lastCount     = 0;
export function getSweeepStats() {
  return { source: _lastSource, lastCount: _lastCount };
}

// ─── Primary Radar ────────────────────────────────────────────
/**
 * Downloads the airplanes.live GZIP aircraft snapshot.
 * Decompresses with a magic-byte check (0x1f 0x8b = GZIP header)
 * so it gracefully handles both .gz and plain JSON responses.
 */
export async function fetchPrimaryRadar() {
  try {
    const snapshotUrl = buildFreshSnapshotUrl(PRIMARY_FEED_URL);
    const response = await fetchWithTimeout(snapshotUrl, {
      headers: requestHeaders,
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    // Read raw bytes — we need to handle GZIP ourselves because
    // Node's fetch may or may not auto-decompress CDN .gz files.
    const arrayBuffer = await response.arrayBuffer();
    const buffer      = Buffer.from(arrayBuffer);

    // Magic byte check: GZIP starts with 0x1f 0x8b
    const isGzip =
      buffer.length >= 2 &&
      buffer[0] === 0x1f &&
      buffer[1] === 0x8b;

    const jsonString = isGzip
      ? gunzipSync(buffer).toString('utf-8')
      : buffer.toString('utf-8');

    const data    = JSON.parse(jsonString);
    const targets = data.ac ?? data.aircraft ?? [];

    if (!Array.isArray(targets)) throw new Error('No aircraft array in payload');

    // Use LOCAL ingest time as the timestamp.
    // The CDN's data.now can be minutes old (cached response), which would
    // make every record appear stale and get purged immediately.
    const ingestNowSec = Math.floor(Date.now() / 1000);
    const feedNowSec = Number(data.now);
    const feedAgeSec = Number.isFinite(feedNowSec)
      ? Math.max(0, ingestNowSec - feedNowSec)
      : null;
    let processed = 0;

    for (const target of targets) {
      // Always stamp with local time — overrides any stale feed timestamp.
      target.now = ingestNowSec;
      const flight = normalizeReadsb(target, 'airplanes.live');
      if (flight) { upsertFlight(flight); processed++; }
    }

    _lastCount  = processed;
    _lastSource = 'airplanes.live CDN';
    console.log(`[Primary Radar] ✓ ${processed.toLocaleString()} targets ingested`);
    if (feedAgeSec != null && feedAgeSec > 30) {
      console.warn(`[Primary Radar] airplanes.live snapshot is ${feedAgeSec}s behind local ingest time`);
    }

  } catch (err) {
    console.error(`[Primary Radar] ✗ Failed: ${err.message}`);
  }
}

// ─── Expansion Port ───────────────────────────────────────────
/**
 * Fetches from a custom user-defined API endpoint.
 * Silently aborts if CUSTOM_API_URL is not set in .env.
 *
 * Expected response shapes (tried in order):
 *   { states: [...] }   — OpenSky-style
 *   { ac: [...] }       — readsb/tar1090-style
 *   [...]               — bare array
 */
export async function fetchCustomRadar() {
  if (!CUSTOM_API_URL) return; // Expansion Port not configured

  try {
    const headers = {
      ...requestHeaders,
      ...(CUSTOM_API_KEY ? { Authorization: `Bearer ${CUSTOM_API_KEY}` } : {}),
    };

    const response = await fetchWithTimeout(CUSTOM_API_URL, { headers });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data    = await response.json();
    const targets = data.states ?? data.ac ?? data.aircraft ?? (Array.isArray(data) ? data : []);

    let processed = 0;
    for (const target of targets) {
      const flight = normalizeCustomApi(target, CUSTOM_API_URL);
      if (flight) { upsertFlight(flight); processed++; }
    }

    console.log(`[Expansion Port] ✓ ${processed.toLocaleString()} targets ingested`);

  } catch (err) {
    console.error(`[Expansion Port] ✗ Failed: ${err.message}`);
  }
}

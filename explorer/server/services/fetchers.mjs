// ============================================================
// God Eyes — Data Fusion Engine
// server/services/fetchers.mjs
//
// Responsible for pulling raw data from all sources and
// pushing normalized records into the flight cache.
//
// Strategy:
//   fetchOpenSky()   — OpenSky REST API (OAuth or anonymous)
//   fetchDarkFleet() — Cascading fallback across DARK_FLEET_URLS
//                      (adsb.lol → airplanes.live → adsbfi)
// ============================================================

import {
  OPENSKY_URL,
  OPENSKY_TOKEN_URL,
  DARK_FLEET_URLS,
  FETCH_TIMEOUT_MS,
} from '../config/constants.mjs';

import { normalizeOpenSky, normalizeReadsb } from './normalizer.mjs';
import { upsertFlight } from '../store/flightCache.mjs';

// ─── Auth token cache (OpenSky OAuth) ────────────────────────
let _openSkyToken    = null;
let _tokenExpiresAt  = 0;   // Unix ms

/**
 * Fetch (or return a cached) OpenSky OAuth access token.
 * Falls back to anonymous if credentials are not configured.
 */
async function getOpenSkyToken() {
  const clientId     = process.env.OPENSKY_CLIENT_ID;
  const clientSecret = process.env.OPENSKY_CLIENT_SECRET;

  if (!clientId || !clientSecret) return null;          // anonymous mode

  const now = Date.now();
  if (_openSkyToken && now < _tokenExpiresAt - 30_000) {
    return _openSkyToken;                               // cached & fresh
  }

  try {
    const body = new URLSearchParams({
      grant_type:    'client_credentials',
      client_id:     clientId,
      client_secret: clientSecret,
    });

    const resp = await fetchWithTimeout(OPENSKY_TOKEN_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });

    if (!resp.ok) throw new Error(`Token HTTP ${resp.status}`);

    const json = await resp.json();
    _openSkyToken   = json.access_token;
    _tokenExpiresAt = now + (json.expires_in ?? 3600) * 1000;
    return _openSkyToken;

  } catch (err) {
    console.warn('[OpenSky] Token fetch failed, falling back to anonymous:', err.message);
    return null;
  }
}

// ─── Timeout-aware fetch ──────────────────────────────────────
function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  return fetch(url, { ...options, signal: controller.signal }).finally(() =>
    clearTimeout(timer)
  );
}

// ─── OpenSky Fetcher ──────────────────────────────────────────
/**
 * Fetch current ADS-B state vectors from OpenSky Network.
 * Uses OAuth if credentials are available, otherwise anonymous.
 * Normalizes each state vector and upserts into the flight cache.
 *
 * @returns {Promise<{ source: string, count: number }>}
 */
export async function fetchOpenSky() {
  const token   = await getOpenSkyToken();
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  let resp;
  try {
    resp = await fetchWithTimeout(OPENSKY_URL, { headers });
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('[OpenSky] Fetch timed out');
    }
    throw err;
  }

  if (resp.status === 429) {
    throw new Error('[OpenSky] Rate-limited (429) — skipping this sweep');
  }
  if (!resp.ok) {
    throw new Error(`[OpenSky] HTTP ${resp.status}`);
  }

  const json = await resp.json();
  const states = json?.states;

  if (!Array.isArray(states)) {
    throw new Error('[OpenSky] Response missing states array');
  }

  let count = 0;
  for (const sv of states) {
    const flight = normalizeOpenSky(sv);
    if (flight) {
      upsertFlight(flight);
      count++;
    }
  }

  const authMode = token ? 'oauth' : 'anonymous';
  console.log(`[OpenSky] ✓ ${count} flights ingested (${authMode})`);
  return { source: 'OPENSKY', count };
}

// ─── Dark Fleet (Community Rebel Networks) Fetcher ───────────
/**
 * Fetch from community ADS-B networks using a cascading fallback strategy.
 *
 * Attempts DARK_FLEET_URLS in order. On any error or timeout, moves to
 * the next URL. Stops at the first successful response so we don't
 * hammer all three networks simultaneously.
 *
 * These networks share the readsb/tar1090 JSON format:
 *   { ac: [ { hex, flight, lat, lon, alt_baro, gs, track, dbFlags, ... } ] }
 *
 * @returns {Promise<{ source: string, url: string, count: number }>}
 */
export async function fetchDarkFleet() {
  let lastError = null;

  for (const url of DARK_FLEET_URLS) {
    try {
      const resp = await fetchWithTimeout(url);

      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status}`);
      }

      const json = await resp.json();

      // The readsb /v2/all endpoint wraps aircraft in an `ac` array.
      // Some implementations also nest it under `aircraft`.
      const aircraft = json?.ac ?? json?.aircraft ?? [];

      if (!Array.isArray(aircraft)) {
        throw new Error('Response missing ac/aircraft array');
      }

      // Feed-level timestamp (seconds) injected into each record via normalizer
      const feedNow = json?.now ?? Math.floor(Date.now() / 1000);

      let count = 0;
      for (const ac of aircraft) {
        // Propagate feed-level timestamp if individual records lack it
        if (ac.now == null) ac.now = feedNow;

        const flight = normalizeReadsb(ac, url);
        if (flight) {
          upsertFlight(flight);
          count++;
        }
      }

      const label = url.split('/')[2]; // e.g. "api.adsb.lol"
      console.log(`[DarkFleet] ✓ ${count} flights ingested from ${label}`);
      return { source: 'DARK_FLEET', url, count };

    } catch (err) {
      const label = url.split('/')[2];
      const reason = err.name === 'AbortError' ? 'timeout' : err.message;
      console.warn(`[DarkFleet] ✗ ${label} failed (${reason}) — trying next…`);
      lastError = err;
    }
  }

  // All URLs failed
  throw new Error(
    `[DarkFleet] All community sources failed. Last error: ${lastError?.message}`
  );
}

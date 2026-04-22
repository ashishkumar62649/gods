// ============================================================
// God Eyes — Data Fusion Engine
// server/config/constants.mjs
//
// Single source of truth for all configuration values.
// ============================================================

export const PORT = process.env.PORT || 8788;

/** How often the radar sweep runs (ms). */
export const UPDATE_INTERVAL_MS = 5000;

/** A flight record older than this (ms) is considered stale and purged. */
export const STALE_FLIGHT_TIMEOUT_MS = 30_000;

/** Fetch timeout per individual source (ms). */
export const FETCH_TIMEOUT_MS = 8_000;

// ─── OpenSky Network ────────────────────────────────────────
export const OPENSKY_URL = 'https://opensky-network.org/api/states/all';

/** OpenSky OAuth token endpoint (client-credentials flow). */
export const OPENSKY_TOKEN_URL = 'https://opensky-network.org/api/auth/token';

// ─── Rebel / Community Networks ─────────────────────────────
// These all expose the tar1090 / readsb JSON format at /v2/all.
// The fetcher will try them in order and stop at the first success,
// guaranteeing near-100% uptime through cascading fallback.
export const DARK_FLEET_URLS = [
  'https://api.adsb.lol/v2/all',
  'https://api.airplanes.live/v2/all',
  'https://opendata.adsbfi.com/api/v2/all',
];

// ─── dbFlags bitmask constants (readsb) ─────────────────────
// See: https://www.adsbexchange.com/datafields/
export const DBFLAG_MILITARY    = 1 << 0;  // bit 0
export const DBFLAG_INTERESTING = 1 << 1;  // bit 1
export const DBFLAG_PIA         = 1 << 2;  // bit 2 (Privacy ICAO Address)
export const DBFLAG_LADD        = 1 << 3;  // bit 3 (Limiting Aircraft Data Displayed)

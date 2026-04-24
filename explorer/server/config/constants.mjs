// ============================================================
// God Eyes — Data Fusion Engine
// server/config/constants.mjs
// ============================================================

import './env.mjs';

export const PORT = process.env.PORT || 8788;

/** Main radar sweep cadence (ms). */
export const RADAR_SWEEP_INTERVAL_MS = 5_000;

/** Flight records older than this are purged (ms). */
export const STALE_FLIGHT_TIMEOUT_MS = 30_000;

/** Per-request fetch timeout (ms). */
export const FETCH_TIMEOUT_MS = 20_000;

/** Satellite TLE refresh cadence (ms). Space-Track data is cached locally. */
export const SATELLITE_TLE_REFRESH_INTERVAL_MS = 6 * 60 * 60 * 1000;

/** Satellite position propagation cadence (ms). */
export const SATELLITE_PROPAGATION_INTERVAL_MS = 1_000;

/** Public subsea cable map and maritime intelligence configuration. */
export const SUBMARINE_CABLE_GEOJSON_URL =
  'https://submarinecablemap.com/api/v3/cable/cable-geo.json';
export const INFRASTRUCTURE_REFRESH_INTERVAL_MS = 24 * 60 * 60 * 1000;
export const AISSTREAM_API_KEY = process.env.AISSTREAM_API_KEY || null;
export const AISSTREAM_URL = 'wss://stream.aisstream.io/v0/stream';
export const SHIP_STALE_TIMEOUT_MS = 3 * 60 * 1000;
export const CABLE_RISK_DISTANCE_M = 500;
export const CABLE_RISK_SPEED_KNOTS = 3;
export const GFW_API_KEY =
  process.env.GFW_API_KEY ||
  process.env.GLOBAL_FISHING_WATCH_API_KEY ||
  null;
export const GFW_API_BASE_URL = 'https://gateway.api.globalfishingwatch.org/v3';
export const GFW_VESSEL_DATASET = 'public-global-vessel-identity:latest';
export const GFW_MARITIME_REFRESH_INTERVAL_MS = 15 * 60 * 1000;
export const OWM_API_KEY =
  process.env.VITE_OWM_API_KEY ||
  process.env.OWM_API_KEY ||
  null;

/** Space-Track credentials. Required to fetch live GP/TLE catalog data. */
export const SPACETRACK_EMAIL = process.env.SPACETRACK_EMAIL || null;
export const SPACETRACK_PASSWORD = process.env.SPACETRACK_PASSWORD || null;
export const SPACETRACK_LOGIN_URL = 'https://www.space-track.org/ajaxauth/login';
export const SPACETRACK_GP_ACTIVE_URL =
  'https://www.space-track.org/basicspacedata/query/class/gp/DECAY_DATE/null-val/orderby/NORAD_CAT_ID/format/json';

// ─── Primary Feed ─────────────────────────────────────────────
// Static GZIP snapshot from airplanes.live CDN.
// Updated every ~8 seconds server-side. ~2–4 MB compressed.
export const PRIMARY_FEED_URL = 'https://globe.airplanes.live/data/aircraft.json.gz';

// ─── Expansion Port ───────────────────────────────────────────
// Drop CUSTOM_API_URL and CUSTOM_API_KEY into your .env to enable
// a supplemental data source (e.g. your own ADS-B receiver, a
// paid flight data API, or a government feed).
// Remains null and silently no-ops if not configured.
export const CUSTOM_API_URL = process.env.CUSTOM_API_URL || null;
export const CUSTOM_API_KEY = process.env.CUSTOM_API_KEY || null;

// ─── dbFlags bitmask constants (readsb) ──────────────────────
export const DBFLAG_MILITARY    = 1 << 0;
export const DBFLAG_INTERESTING = 1 << 1;
export const DBFLAG_PIA         = 1 << 2;
export const DBFLAG_LADD        = 1 << 3;

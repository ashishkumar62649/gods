// ============================================================
// God Eyes — Data Fusion Engine
// server/services/normalizer.mjs
//
// Transforms raw API payloads from any source into the
// canonical GodsEyeFlight schema.
//
// GodsEyeFlight Schema:
//   Identity:    id_icao, callsign, registration, aircraft_type,
//                description, owner_operator, country_origin
//   Telemetry:   latitude, longitude, altitude_baro_m, altitude_geom_m,
//                velocity_mps, heading_true_deg, heading_mag_deg,
//                vertical_rate_mps, on_ground
//   Avionics:    squawk, nav_target_alt_m, nav_target_heading,
//                emergency_status
//   Intelligence: is_military, is_interesting, is_pia, is_ladd
//   System:      data_source, timestamp
// ============================================================

import {
  DBFLAG_MILITARY,
  DBFLAG_INTERESTING,
  DBFLAG_PIA,
  DBFLAG_LADD,
} from '../config/constants.mjs';

// ─── Unit conversion helpers ─────────────────────────────────
const FT_TO_M   = 0.3048;
const KNOT_TO_MPS = 0.51444;

const ftToM   = (ft)   => (ft   != null && ft   !== '' && !isNaN(ft))   ? +ft   * FT_TO_M   : null;
const knotToMps = (kts) => (kts  != null && kts  !== '' && !isNaN(kts))  ? +kts  * KNOT_TO_MPS : null;
const safeNum = (v)    => (v    != null && v    !== '' && !isNaN(v))    ? +v    : null;
const safeStr = (v)    => (v    != null && String(v).trim() !== '') ? String(v).trim() : null;

// ─── Emergency code lookup (OpenSky) ─────────────────────────
const OPENSKY_EMERGENCY = {
  0: null,           // no special condition
  1: 'GENERAL',      // 7700
  2: 'LIFEGUARD',    // medical
  3: 'MINFUEL',      // minimum fuel
  4: 'NORDO',        // no radio
  5: 'UNLAWFUL',     // hijacking
  6: 'DOWNED',       // downed aircraft
  7: 'RESERVED',
};

// ─── Emergency squawk detection (readsb) ─────────────────────
function squawkToEmergency(squawk) {
  if (!squawk) return null;
  if (squawk === '7700') return 'GENERAL';
  if (squawk === '7600') return 'NORDO';
  if (squawk === '7500') return 'UNLAWFUL';
  return null;
}

// ─────────────────────────────────────────────────────────────
// normalizeOpenSky
// Converts a raw OpenSky state vector array into GodsEyeFlight.
//
// OpenSky state vector indices:
//  0  icao24 (string)
//  1  callsign (string|null)
//  2  origin_country (string)
//  3  time_position (int|null)
//  4  last_contact (int)
//  5  longitude (float|null)
//  6  latitude (float|null)
//  7  baro_altitude (float|null) — meters
//  8  on_ground (bool)
//  9  velocity (float|null) — m/s
//  10 true_track (float|null) — degrees, clockwise from north
//  11 vertical_rate (float|null) — m/s
//  12 sensors (int[]|null)
//  13 geo_altitude (float|null) — meters
//  14 squawk (string|null)
//  15 spi (bool)
//  16 position_source (int)  0=ADS-B, 1=ASTERIX, 2=MLAT, 3=FLARM
//  17 category (int|null)
// ─────────────────────────────────────────────────────────────
export function normalizeOpenSky(sv) {
  if (!sv || !sv[0]) return null;

  const icao    = String(sv[0]).toLowerCase();
  const callsign = safeStr(sv[1]);
  const lat     = safeNum(sv[6]);
  const lon     = safeNum(sv[5]);

  // Skip records with no position — they can't be rendered on the globe.
  if (lat == null || lon == null) return null;

  return {
    // ── Identity ──────────────────────────────────────────
    id_icao:        icao,
    callsign:       callsign,
    registration:   null,          // OpenSky free-tier does not include reg
    aircraft_type:  null,          // not in state vector
    description:    null,
    owner_operator: null,
    country_origin: safeStr(sv[2]),

    // ── Telemetry ─────────────────────────────────────────
    latitude:         lat,
    longitude:        lon,
    altitude_baro_m:  safeNum(sv[7]),  // OpenSky already in meters
    altitude_geom_m:  safeNum(sv[13]), // OpenSky already in meters
    velocity_mps:     safeNum(sv[9]),  // OpenSky already in m/s
    heading_true_deg: safeNum(sv[10]),
    heading_mag_deg:  null,            // not provided by OpenSky
    vertical_rate_mps: safeNum(sv[11]),
    on_ground:        Boolean(sv[8]),

    // ── Avionics ──────────────────────────────────────────
    squawk:            safeStr(sv[14]),
    nav_target_alt_m:  null,  // not in OpenSky state vector
    nav_target_heading: null,
    emergency_status:  OPENSKY_EMERGENCY[safeNum(sv[15])] ?? null,

    // ── Intelligence ──────────────────────────────────────
    // OpenSky free-tier has no dbFlags — we fall back to squawk analysis
    is_military:    false,
    is_interesting: false,
    is_pia:         false,
    is_ladd:        false,

    // ── System ────────────────────────────────────────────
    data_source: 'OPENSKY',
    timestamp:   safeNum(sv[4]) ?? Math.floor(Date.now() / 1000),
  };
}

// ─────────────────────────────────────────────────────────────
// normalizeReadsb
// Converts a single aircraft object from the readsb/tar1090 JSON
// API format (used by adsb.lol, airplanes.live, adsbfi) into
// GodsEyeFlight.
//
// Key readsb fields:
//   hex, flight, r (registration), t (type code), desc,
//   ownOp, lat, lon,
//   alt_baro (ft or "ground"), alt_geom (ft),
//   gs (knots), track, mag_heading,
//   baro_rate (ft/min), geom_rate (ft/min),
//   squawk, emergency,
//   nav_altitude_fms (ft), nav_heading,
//   dbFlags (bitmask: bit0=military, bit1=interesting, bit2=pia, bit3=ladd),
//   pia (bool), ladd (bool),
//   seen_pos (seconds since last position), now (unix timestamp)
// ─────────────────────────────────────────────────────────────
export function normalizeReadsb(ac, sourceUrl) {
  if (!ac || !ac.hex) return null;

  const icao = String(ac.hex).toLowerCase().replace('~', ''); // some feeds prefix ghost ICAOs with ~

  const lat = safeNum(ac.lat);
  const lon = safeNum(ac.lon);

  // Skip records without a valid position fix.
  if (lat == null || lon == null) return null;

  // ── altitude_baro: "ground" string => 0, otherwise ft->m ──
  let alt_baro_m = null;
  if (ac.alt_baro === 'ground' || ac.on_ground) {
    alt_baro_m = 0;
  } else {
    alt_baro_m = ftToM(ac.alt_baro);
  }

  // ── vertical rate: ft/min -> m/s ──────────────────────────
  // readsb provides baro_rate in ft/min; convert to m/s
  const FT_PER_MIN_TO_MPS = FT_TO_M / 60;
  const vert_rate_mps =
    ac.baro_rate != null ? safeNum(ac.baro_rate) * FT_PER_MIN_TO_MPS :
    ac.geom_rate != null ? safeNum(ac.geom_rate) * FT_PER_MIN_TO_MPS :
    null;

  // ── dbFlags bitmask ───────────────────────────────────────
  const flags = safeNum(ac.dbFlags) ?? 0;
  const is_military    = (flags & DBFLAG_MILITARY)    !== 0;
  const is_interesting = (flags & DBFLAG_INTERESTING) !== 0;
  const is_pia         = Boolean(ac.pia)  || (flags & DBFLAG_PIA)  !== 0;
  const is_ladd        = Boolean(ac.ladd) || (flags & DBFLAG_LADD) !== 0;

  // ── emergency: prefer explicit field, fall back to squawk ──
  const emerg =
    safeStr(ac.emergency) && ac.emergency !== 'none'
      ? String(ac.emergency).toUpperCase()
      : squawkToEmergency(safeStr(ac.squawk));

  // ── Source label from URL ─────────────────────────────────
  let source = 'READSB';
  if (sourceUrl) {
    if (sourceUrl.includes('adsb.lol'))       source = 'ADSB.LOL';
    else if (sourceUrl.includes('airplanes.live')) source = 'AIRPLANES.LIVE';
    else if (sourceUrl.includes('adsbfi'))    source = 'ADSBFI';
  }

  // ── timestamp: prefer feed-level 'now', else last_seen ────
  const ts =
    safeNum(ac.now) ??
    safeNum(ac.seen_pos != null ? Date.now() / 1000 - ac.seen_pos : null) ??
    Math.floor(Date.now() / 1000);

  return {
    // ── Identity ──────────────────────────────────────────
    id_icao:        icao,
    callsign:       safeStr(ac.flight),
    registration:   safeStr(ac.r),
    aircraft_type:  safeStr(ac.t),
    description:    safeStr(ac.desc),
    owner_operator: safeStr(ac.ownOp),
    country_origin: null,  // not in readsb per-aircraft object

    // ── Telemetry ─────────────────────────────────────────
    latitude:          lat,
    longitude:         lon,
    altitude_baro_m:   alt_baro_m,
    altitude_geom_m:   ftToM(ac.alt_geom),
    velocity_mps:      knotToMps(ac.gs),
    heading_true_deg:  safeNum(ac.track),
    heading_mag_deg:   safeNum(ac.mag_heading),
    vertical_rate_mps: vert_rate_mps,
    on_ground:         ac.alt_baro === 'ground' || Boolean(ac.on_ground),

    // ── Avionics ──────────────────────────────────────────
    squawk:             safeStr(ac.squawk),
    nav_target_alt_m:   ftToM(ac.nav_altitude_fms ?? ac.nav_altitude_mcp),
    nav_target_heading: safeNum(ac.nav_heading),
    emergency_status:   emerg,

    // ── Intelligence ──────────────────────────────────────
    is_military,
    is_interesting,
    is_pia,
    is_ladd,

    // ── System ────────────────────────────────────────────
    data_source: source,
    timestamp:   ts,
  };
}
// ─────────────────────────────────────────────────────────────
// normalizeCustomApi  (Expansion Port stub)
//
// Flexible normalizer for the user-defined CUSTOM_API_URL feed.
// Auto-detects common response shapes:
//   • readsb/tar1090 objects  → delegates to normalizeReadsb
//   • OpenSky state vectors   → delegates to normalizeOpenSky
//   • Unknown shape           → returns null (record skipped)
//
// Extend this function to support proprietary API schemas.
// ─────────────────────────────────────────────────────────────
export function normalizeCustomApi(record, sourceUrl) {
  if (!record) return null;

  // Readsb-style: has `hex` field
  if (record.hex != null) {
    return normalizeReadsb(record, sourceUrl ?? 'CUSTOM');
  }

  // OpenSky-style: is an array (state vector)
  if (Array.isArray(record)) {
    return normalizeOpenSky(record);
  }

  // Unknown — skip
  return null;
}

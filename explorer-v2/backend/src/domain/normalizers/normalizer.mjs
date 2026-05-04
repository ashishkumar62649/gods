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
} from '../../config/constants.mjs';
import { getAircraftIdentity } from '../../services/aircraftIndex.mjs';

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
function normalizeSquawk(squawk) {
  const value = safeStr(squawk);
  return value && /^[0-7]{4}$/.test(value) ? value : null;
}

// ─── Classification Engine ─────────────────────────────────────
function deriveFlightTaxonomy(record) {
  const typeCode = String(record.aircraft_type || '').toUpperCase();
  const desc = String(record.description || '').toUpperCase();
  const owner = String(record.owner_operator || '').toUpperCase();
  const isMil = Boolean(record.is_military);

  let vehicle_type = 'Airplane';
  let vehicle_subtype = 'General';
  let operation_type = 'Private';
  let operation_subtype = 'General Aviation';

  // 1. Vehicle Classification
  if (
    typeCode.startsWith('H') || 
    typeCode === 'R44' || 
    typeCode === 'R66' || 
    typeCode === 'AS50' ||
    desc.includes('ROTORCRAFT') || 
    desc.includes('HELICOPTER')
  ) {
    vehicle_type = 'Helicopter';
    vehicle_subtype = 'Rotorcraft';
  } else if (
    typeCode === 'Q4' || 
    typeCode === 'M9' || 
    desc.includes('UAV') || 
    desc.includes('UNMANNED') || 
    desc.includes('DRONE')
  ) {
    vehicle_type = 'Drone';
    vehicle_subtype = 'UAV';
  } else if (typeCode === 'BALL') {
    vehicle_type = 'Other';
    vehicle_subtype = 'Balloon';
  } else if (typeCode === 'GLID') {
    vehicle_type = 'Other';
    vehicle_subtype = 'Glider';
  } else if (typeCode === 'SHIP') {
    vehicle_type = 'Other';
    vehicle_subtype = 'Airship';
  } else {
    if (desc.includes('JET') || typeCode.startsWith('B7') || typeCode.startsWith('A3') || typeCode.startsWith('E1') || typeCode.startsWith('CRJ')) {
      vehicle_subtype = 'Jet';
    } else if (desc.includes('TURBOPROP') || desc.includes('PROP') || typeCode.startsWith('C') || typeCode.startsWith('P')) {
      vehicle_subtype = 'Propeller';
    } else {
      vehicle_subtype = 'Fixed-Wing';
    }
  }

  const callsign = String(record.callsign || '').toUpperCase();
  const c3 = callsign.slice(0, 3);

  // 2. Operational Classification
  if (isMil || owner.includes('AIR FORCE') || owner.includes('NAVY') || owner.includes('ARMY') || owner.includes('RAF') || owner.includes('MILITARY') || owner.includes('COAST GUARD') || c3 === 'RCH' || c3 === 'RRR' || c3 === 'CFC' || c3 === 'ASY') {
    operation_type = 'Military';
    if (owner.includes('AIR FORCE') || owner.includes('USAF') || c3 === 'RCH') operation_subtype = 'Air Force';
    else if (owner.includes('NAVY') || owner.includes('USN')) operation_subtype = 'Navy';
    else if (owner.includes('ARMY')) operation_subtype = 'Army';
    else if (owner.includes('COAST GUARD') || owner.includes('USCG')) operation_subtype = 'Coast Guard';
    else operation_subtype = 'General Military';
  } else if (
    owner.includes('FEDEX') || 
    owner.includes('UPS') || 
    owner.includes('AMAZON') || 
    owner.includes('DHL') || 
    owner.includes('ATLAS AIR') ||
    owner.includes('KALITTA') ||
    typeCode.endsWith('F') || 
    desc.includes('FREIGHTER') ||
    c3 === 'FDX' || c3 === 'UPS' || c3 === 'ATI' || c3 === 'PAC' || c3 === 'GTI' || c3 === 'ABX'
  ) {
    operation_type = 'Cargo';
    if (owner.includes('FEDEX') || c3 === 'FDX') operation_subtype = 'FedEx';
    else if (owner.includes('UPS') || c3 === 'UPS') operation_subtype = 'UPS';
    else if (owner.includes('AMAZON') || c3 === 'ATI') operation_subtype = 'Amazon Air';
    else if (owner.includes('DHL') || c3 === 'ABX') operation_subtype = 'DHL';
    else operation_subtype = 'Freight Carrier';
  } else if (
    owner.includes('AIRLINES') || 
    owner.includes('AIRWAYS') || 
    owner.includes('DELTA') || 
    owner.includes('UNITED') || 
    owner.includes('AMERICAN') || 
    owner.includes('SOUTHWEST') ||
    owner.includes('RYANAIR') ||
    owner.includes('EASYJET') ||
    owner.includes('EMIRATES') ||
    owner.includes('QATAR') ||
    owner.includes('ALASKA') ||
    owner.includes('FRONTIER') ||
    owner.includes('SPIRIT') ||
    c3 === 'DAL' || c3 === 'UAL' || c3 === 'AAL' || c3 === 'SWA' || c3 === 'RYR' || c3 === 'EZY' || c3 === 'BAW' || c3 === 'AFR' || c3 === 'DLH' || c3 === 'UAE' || c3 === 'QFA' || c3 === 'ASA' || c3 === 'JBU' || c3 === 'NKS' || c3 === 'FFT' || c3 === 'ACA'
  ) {
    operation_type = 'Passenger';
    if (owner.includes('DELTA') || c3 === 'DAL') operation_subtype = 'Delta';
    else if (owner.includes('UNITED') || c3 === 'UAL') operation_subtype = 'United';
    else if (owner.includes('AMERICAN') || c3 === 'AAL') operation_subtype = 'American';
    else if (owner.includes('SOUTHWEST') || c3 === 'SWA') operation_subtype = 'Southwest';
    else if (owner.includes('RYANAIR') || c3 === 'RYR') operation_subtype = 'Ryanair';
    else operation_subtype = 'Commercial Airline';
  } else {
    operation_type = 'Private';
    if (owner.includes('NETJETS') || owner.includes('FLEXJET')) {
      operation_subtype = 'Fractional Ownership';
    } else if (owner.includes('BANK') || owner.includes('TRUST')) {
      operation_subtype = 'Corporate Trust';
    } else if (owner.includes('LLC') || owner.includes('INC') || owner.includes('CORP')) {
      operation_subtype = 'Corporate / LLC';
    } else {
      operation_subtype = 'General Aviation';
    }
  }

  return { vehicle_type, vehicle_subtype, operation_type, operation_subtype };
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

  const dbRecord = getAircraftIdentity(icao);

  const record = {
    // ── Identity ──────────────────────────────────────────
    id_icao:        icao,
    callsign:       callsign,
    registration:   dbRecord?.reg || null,          // OpenSky free-tier does not include reg
    aircraft_type:  dbRecord?.type || null,         // not in state vector
    description:    dbRecord?.type || null,
    owner_operator: dbRecord?.op || null,
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
    squawk:            normalizeSquawk(sv[14]),
    nav_target_alt_m:  null,  // not in OpenSky state vector
    nav_target_heading: null,
    emergency_status:  'NONE',

    // ── Intelligence ──────────────────────────────────────
    // OpenSky free-tier has no dbFlags — we fall back to squawk analysis
    is_military:    Boolean(dbRecord?.isMilitary),
    is_interesting: false,
    is_pia:         false,
    is_ladd:        false,
    is_active_emergency: false,

    // ── System ────────────────────────────────────────────
    data_source: 'OPENSKY',
    timestamp:   safeNum(sv[4]) ?? Math.floor(Date.now() / 1000),
  };

  const taxonomy = deriveFlightTaxonomy(record);
  return { ...record, ...taxonomy };
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
  const dbRecord = getAircraftIdentity(icao);

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
  const is_military    = (flags & DBFLAG_MILITARY)    !== 0 || Boolean(dbRecord?.isMilitary);
  const is_interesting = (flags & DBFLAG_INTERESTING) !== 0;
  const is_pia         = Boolean(ac.pia)  || (flags & DBFLAG_PIA)  !== 0;
  const is_ladd        = Boolean(ac.ladd) || (flags & DBFLAG_LADD) !== 0;

  // ── emergency: prefer explicit field, fall back to squawk ──
  const squawk = normalizeSquawk(ac.squawk);

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

  const record = {
    // ── Identity ──────────────────────────────────────────
    id_icao:        icao,
    callsign:       safeStr(ac.flight) || null,
    registration:   safeStr(ac.r) || dbRecord?.reg || null,
    aircraft_type:  safeStr(ac.t) || dbRecord?.type || null,
    description:    safeStr(ac.desc) || dbRecord?.type || null,
    owner_operator: safeStr(ac.ownOp) || dbRecord?.op || null,
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
    squawk,
    nav_target_alt_m:   ftToM(ac.nav_altitude_fms ?? ac.nav_altitude_mcp),
    nav_target_heading: safeNum(ac.nav_heading),
    emergency_status:   'NONE',

    // ── Intelligence ──────────────────────────────────────
    is_military,
    is_interesting,
    is_pia,
    is_ladd,
    is_active_emergency: false,

    // ── System ────────────────────────────────────────────
    data_source: source,
    timestamp:   ts,
  };

  const taxonomy = deriveFlightTaxonomy(record);
  return { ...record, ...taxonomy };
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

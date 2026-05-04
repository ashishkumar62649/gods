// ============================================================
// God Eyes — Intelligence Acquisition Service
// server/services/intelFetcher.mjs
//
// Polls ADSB.lol categorical endpoints every 10 seconds to harvest
// intelligence attributes (Military, PIA, LADD, Emergency) and
// enriches the main flight store at query time via mergeIntel().
//
// Architecture:
//   rawIntelStore  — Map<icao_hex, IntelRecord>
//   startIntelLoop()    — begins the 10s polling cycle
//   mergeIntel(flight)  — enriches a GodsEyeFlight at serve time
//   fetchByHex/Reg/Callsign/AirportInfo — lazy one-shot lookups
// ============================================================

import { FETCH_TIMEOUT_MS } from '../config/constants.mjs';

// ─── Intel sweep interval (ms) ───────────────────────────────
const INTEL_INTERVAL_MS = 10_000;

// ─── ADSB.lol base ───────────────────────────────────────────
const ADSBLOL_BASE = 'https://api.adsb.lol';

// ─── Categorical sweep endpoints ─────────────────────────────
const INTEL_ENDPOINTS = [
  { url: `${ADSBLOL_BASE}/v2/mil`,      tag: 'MILITARY'  },
  { url: `${ADSBLOL_BASE}/v2/pia`,      tag: 'PIA'       },
  { url: `${ADSBLOL_BASE}/v2/ladd`,     tag: 'LADD'      },
  { url: `${ADSBLOL_BASE}/v2/sqk/7700`, tag: 'EMERGENCY' },
];

// ─── Browser-spoof headers ───────────────────────────────────
const SPOOF_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
    '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept':          'application/json',
  'Accept-Language': 'en-US,en;q=0.9',
  'Referer':         'https://globe.adsb.lol/',
  'Origin':          'https://globe.adsb.lol',
};

// ─── Raw Intel Store ─────────────────────────────────────────
// Map<icao_hex (lowercase), IntelRecord>
// IntelRecord = { intel_source, is_military, is_pia, is_ladd,
//                 is_emergency, squawk, callsign, registration,
//                 aircraft_type, description, owner_operator }
export const rawIntelStore = new Map();

// ─── Stats ───────────────────────────────────────────────────
const stats = {
  lastSweepAt:   null,
  sweepCount:    0,
  errors:        0,
  recordCount:   0,
  mil:  0,
  pia:  0,
  ladd: 0,
  emerg: 0,
};
export function getIntelStats() { return { ...stats }; }

// ─── Timeout-aware fetch ─────────────────────────────────────
function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  return fetch(url, { ...options, signal: controller.signal })
    .finally(() => clearTimeout(timer));
}

// ─── Single endpoint ingest ───────────────────────────────────
async function ingestEndpoint({ url, tag }) {
  const resp = await fetchWithTimeout(url, { headers: SPOOF_HEADERS });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

  const data    = await resp.json();
  const targets = data.ac ?? data.aircraft ?? [];
  if (!Array.isArray(targets)) throw new Error('No aircraft array');

  let count = 0;
  for (const ac of targets) {
    const hex = String(ac.hex ?? '').toLowerCase().replace('~', '');
    if (!hex) continue;

    const existing = rawIntelStore.get(hex) ?? {};

    rawIntelStore.set(hex, {
      ...existing,
      // Tag from which feed this record came (last write wins if multiple)
      intel_source:  tag,
      // Boolean flags
      is_military:   tag === 'MILITARY' ? true  : (existing.is_military  ?? false),
      is_pia:        tag === 'PIA'      ? true  : (existing.is_pia       ?? false),
      is_ladd:       tag === 'LADD'     ? true  : (existing.is_ladd      ?? false),
      is_emergency:  tag === 'EMERGENCY'? true  : (existing.is_emergency ?? false),
      // Raw attributes (enrich if feed provides them)
      squawk:        ac.squawk        ?? existing.squawk        ?? null,
      callsign:      (ac.flight ?? '').trim() || existing.callsign      || null,
      registration:  ac.r            ?? existing.registration  ?? null,
      aircraft_type: ac.t            ?? existing.aircraft_type ?? null,
      description:   ac.desc         ?? existing.description   ?? null,
      owner_operator:ac.ownOp        ?? existing.owner_operator?? null,
    });

    count++;
  }
  return { tag, count };
}

// ─── Full intel sweep ─────────────────────────────────────────
async function runIntelSweep() {
  const results = await Promise.allSettled(
    INTEL_ENDPOINTS.map((ep) => ingestEndpoint(ep)),
  );

  let mil = 0, pia = 0, ladd = 0, emerg = 0;

  for (const r of results) {
    if (r.status === 'fulfilled') {
      const { tag, count } = r.value;
      if (tag === 'MILITARY')  mil   = count;
      if (tag === 'PIA')       pia   = count;
      if (tag === 'LADD')      ladd  = count;
      if (tag === 'EMERGENCY') emerg = count;
    } else {
      stats.errors++;
      console.warn(`[Intel] ✗ endpoint failed: ${r.reason?.message ?? r.reason}`);
    }
  }

  stats.sweepCount++;
  stats.lastSweepAt = new Date().toISOString();
  stats.mil   = mil;
  stats.pia   = pia;
  stats.ladd  = ladd;
  stats.emerg = emerg;
  stats.recordCount = rawIntelStore.size;

  console.log(
    `[Intel #${stats.sweepCount}] Store: ${rawIntelStore.size} records` +
    ` | MIL: ${mil} | PIA: ${pia} | LADD: ${ladd} | EMERG: ${emerg}`,
  );
}

// ─── Start the intel loop ────────────────────────────────────
export function startIntelLoop() {
  // Fire immediately, then on interval
  runIntelSweep().catch(console.error);
  setInterval(() => runIntelSweep().catch(console.error), INTEL_INTERVAL_MS);
  console.log(`[Intel] Intelligence loop started (every ${INTEL_INTERVAL_MS / 1000}s)`);
}

// ─── Merge intel into a flight at query time ─────────────────
/**
 * Returns a copy of the flight object enriched with any intelligence
 * attributes found in rawIntelStore. Called per-flight in /api/flights.
 *
 * @param {object} flight - GodsEyeFlight from the main cache
 * @returns {object} enriched flight (new object, original untouched)
 */
export function mergeIntel(flight) {
  const intel = rawIntelStore.get(flight.id_icao);
  if (!intel) return flight;

  return {
    ...flight,
    // Upgrade boolean flags — once flagged as military/PIA/LADD, stays true
    is_military:   intel.is_military   || flight.is_military,
    is_pia:        intel.is_pia        || flight.is_pia,
    is_ladd:       intel.is_ladd       || flight.is_ladd,
    is_interesting:intel.is_ladd || intel.is_military || flight.is_interesting,
    // Add emergency flag (new field not in base schema, backwards-compatible)
    is_emergency:  intel.is_emergency ?? false,
    intel_source:  intel.intel_source  ?? flight.data_source,
    // Enrich identity fields if the position feed left them null
    callsign:      flight.callsign      ?? intel.callsign,
    registration:  flight.registration  ?? intel.registration,
    aircraft_type: flight.aircraft_type ?? intel.aircraft_type,
    description:   flight.description   ?? intel.description,
    owner_operator:flight.owner_operator?? intel.owner_operator,
  };
}

// ─────────────────────────────────────────────────────────────
// Lazy One-Shot Lookup Helpers
// These hit the API only when explicitly called (not in the loop).
// Use for user-triggered detail lookups (click on a flight, etc).
// ─────────────────────────────────────────────────────────────

/**
 * Fetch full details for a single aircraft by ICAO hex.
 * @param {string} hex - e.g. "a1b2c3"
 */
export async function fetchByHex(hex) {
  const resp = await fetchWithTimeout(
    `${ADSBLOL_BASE}/v2/hex/${encodeURIComponent(hex)}`,
    { headers: SPOOF_HEADERS },
  );
  if (!resp.ok) throw new Error(`fetchByHex HTTP ${resp.status}`);
  return resp.json();
}

/**
 * Fetch aircraft details by registration number.
 * @param {string} reg - e.g. "N12345"
 */
export async function fetchByRegistration(reg) {
  const resp = await fetchWithTimeout(
    `${ADSBLOL_BASE}/v2/registration/${encodeURIComponent(reg)}`,
    { headers: SPOOF_HEADERS },
  );
  if (!resp.ok) throw new Error(`fetchByRegistration HTTP ${resp.status}`);
  return resp.json();
}

/**
 * Fetch aircraft details by callsign.
 * @param {string} callsign - e.g. "UAL123"
 */
export async function fetchByCallsign(callsign) {
  const resp = await fetchWithTimeout(
    `${ADSBLOL_BASE}/v2/callsign/${encodeURIComponent(callsign)}`,
    { headers: SPOOF_HEADERS },
  );
  if (!resp.ok) throw new Error(`fetchByCallsign HTTP ${resp.status}`);
  return resp.json();
}

/**
 * Fetch airport metadata by ICAO code.
 * @param {string} icao - e.g. "EGLL"
 */
export async function fetchAirportInfo(icao) {
  const resp = await fetchWithTimeout(
    `${ADSBLOL_BASE}/api/0/airport/${encodeURIComponent(icao)}`,
    { headers: SPOOF_HEADERS },
  );
  if (!resp.ok) throw new Error(`fetchAirportInfo HTTP ${resp.status}`);
  return resp.json();
}

/**
 * Fetch route information for a callsign.
 * @param {string} callsign
 */
export async function fetchRouteSet(callsign) {
  const resp = await fetchWithTimeout(
    `${ADSBLOL_BASE}/api/0/routeset`,
    {
      method:  'POST',
      headers: { ...SPOOF_HEADERS, 'Content-Type': 'application/json' },
      body:    JSON.stringify({ callsign }),
    },
  );
  if (!resp.ok) throw new Error(`fetchRouteSet HTTP ${resp.status}`);
  return resp.json();
}

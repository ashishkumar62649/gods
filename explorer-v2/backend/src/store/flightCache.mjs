// ============================================================
// God Eyes — Data Fusion Engine
// server/store/flightCache.mjs
//
// In-memory store for fused flight records.
// Keyed by ICAO hex (id_icao) for O(1) lookups.
// ============================================================

import { STALE_FLIGHT_TIMEOUT_MS } from '../config/constants.mjs';
import { applyEmergencyTripwire } from '../services/emergencyTripwire.mjs';

/**
 * The primary in-memory flight store.
 * Map<string (id_icao), GodsEyeFlight>
 */
export const flightStore = new Map();

/**
 * Upsert a normalized GodsEyeFlight record into the store.
 *
 * CRITICAL RULE — Temporal Integrity:
 *   Only write the incoming record if its timestamp is >= the timestamp
 *   of the record already in the store for that ICAO.
 *   This prevents a slow/delayed source from overwriting a fresher record
 *   that arrived from a faster source moments earlier.
 *
 * @param {object} flight - A fully-normalized GodsEyeFlight object.
 */
export function upsertFlight(flight) {
  if (!flight || !flight.id_icao) return;

  const existing = flightStore.get(flight.id_icao);

  if (existing && existing.timestamp > flight.timestamp) {
    // The stored record is newer — silently discard the stale incoming data.
    return;
  }

  flightStore.set(flight.id_icao, applyEmergencyTripwire(flight));
}

/**
 * Return all currently stored flight records as a flat array.
 * @returns {GodsEyeFlight[]}
 */
export function getAllFlights() {
  return Array.from(flightStore.values());
}

/**
 * Purge any flight record whose timestamp is older than STALE_FLIGHT_TIMEOUT_MS.
 * Called at the end of every radar sweep so the cache stays clean without
 * requiring a separate GC loop.
 */
export function removeStaleFlights() {
  const cutoffSec = (Date.now() - STALE_FLIGHT_TIMEOUT_MS) / 1000;

  for (const [icao, flight] of flightStore) {
    if (flight.timestamp < cutoffSec) {
      flightStore.delete(icao);
    }
  }
}

import * as satellite from 'satellite.js';
import { SATELLITE_PROPAGATION_INTERVAL_MS } from '../config/constants.mjs';
import {
  getAllTles,
  replaceSatellites,
  setSatelliteLoopActive,
} from '../store/satelliteCache.mjs';

let propagationTimer = null;
let satrecCacheVersion = '';
let satrecCache = [];

export function startOrbitPropagationLoop() {
  if (propagationTimer) return;

  setSatelliteLoopActive(true);
  propagationTimer = setInterval(propagateNow, SATELLITE_PROPAGATION_INTERVAL_MS);
  propagateNow();
}

export function stopOrbitPropagationLoop() {
  if (!propagationTimer) return;

  clearInterval(propagationTimer);
  propagationTimer = null;
  setSatelliteLoopActive(false);
}

export function propagateNow(date = new Date()) {
  const tleRecords = getAllTles();
  const satrecs = getSatrecCache(tleRecords);
  const gmst = satellite.gstime(date);
  const satellites = [];
  let errorCount = 0;
  let skippedCount = 0;

  for (const entry of satrecs) {
    try {
      const propagated = satellite.propagate(entry.satrec, date);
      const positionEci = propagated?.position;
      const velocityEci = propagated?.velocity;

      if (!positionEci || typeof positionEci === 'boolean') {
        skippedCount++;
        continue;
      }

      const geodetic = satellite.eciToGeodetic(positionEci, gmst);
      const velocityKps = velocityEci && typeof velocityEci !== 'boolean'
        ? Math.hypot(velocityEci.x, velocityEci.y, velocityEci.z)
        : null;

      const record = normalizeSatellite(entry, geodetic, velocityKps, date);
      if (record) {
        satellites.push(record);
      } else {
        skippedCount++;
      }
    } catch {
      errorCount++;
    }
  }

  replaceSatellites(satellites, {
    errorCount,
    skippedCount,
    loopActive: Boolean(propagationTimer),
  });

  return satellites;
}

function getSatrecCache(tleRecords) {
  const nextVersion = tleRecords
    .map((tle) => `${tle.id_norad}:${tle.line1}:${tle.line2}`)
    .join('|');

  if (nextVersion === satrecCacheVersion) {
    return satrecCache;
  }

  const nextCache = [];
  for (const tle of tleRecords) {
    try {
      const satrec = satellite.twoline2satrec(tle.line1, tle.line2);
      if (satrec?.error) continue;
      nextCache.push({
        tle,
        satrec,
        orbitMeta: buildOrbitMeta(satrec),
      });
    } catch {
      // Bad TLEs are skipped; the next Space-Track refresh may repair them.
    }
  }

  satrecCacheVersion = nextVersion;
  satrecCache = nextCache;
  console.log(`[Orbit] Parsed ${satrecCache.length.toLocaleString()} satellite records for propagation`);
  return satrecCache;
}

function normalizeSatellite(entry, geodetic, velocityKps, date) {
  const { tle, orbitMeta } = entry;
  const latitude = satellite.degreesLat(geodetic.latitude);
  const longitude = satellite.degreesLong(geodetic.longitude);
  const altitudeKm = geodetic.height;

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    !Number.isFinite(altitudeKm)
  ) {
    return null;
  }

  return {
    // Identity
    id_norad: tle.id_norad,
    object_name: tle.object_name,
    object_type: tle.object_type,
    country_origin: tle.country_origin,
    launch_date: tle.launch_date,

    // Telemetry
    latitude,
    longitude,
    altitude_km: altitudeKm,
    velocity_kps: Number.isFinite(velocityKps) ? velocityKps : null,

    // Orbit
    tle_epoch: tle.epoch,
    inclination_deg: orbitMeta.inclination_deg,
    period_minutes: orbitMeta.period_minutes,
    mean_motion_rev_per_day: orbitMeta.mean_motion_rev_per_day,
    line1: tle.line1,
    line2: tle.line2,

    // System
    data_source: 'SPACETRACK_GP_SGP4',
    tle_source: tle.tle_source,
    timestamp: Math.floor(date.getTime() / 1000),
  };
}

function buildOrbitMeta(satrec) {
  const meanMotionRevPerDay = Number.isFinite(satrec.no)
    ? (satrec.no * 1440) / (2 * Math.PI)
    : null;

  return {
    inclination_deg: Number.isFinite(satrec.inclo)
      ? satellite.degreesLat(satrec.inclo)
      : null,
    mean_motion_rev_per_day: meanMotionRevPerDay,
    period_minutes:
      meanMotionRevPerDay && meanMotionRevPerDay > 0
        ? 1440 / meanMotionRevPerDay
        : null,
  };
}

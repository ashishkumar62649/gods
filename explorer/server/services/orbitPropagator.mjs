import * as satellite from 'satellite.js';
import { SATELLITE_PROPAGATION_INTERVAL_MS } from '../config/constants.mjs';
import {
  getAllTles,
  replaceSatellites,
  setSatelliteLoopActive,
} from '../store/satelliteCache.mjs';

const EARTH_RADIUS_KM = 6378.137;

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
        intelligenceMeta: buildIntelligenceMeta(tle, satrec),
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
  const { tle, orbitMeta, intelligenceMeta } = entry;
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
    perigee_km: orbitMeta.perigee_km,
    apogee_km: orbitMeta.apogee_km,
    line1: tle.line1,
    line2: tle.line2,

    // Intelligence
    constellation_id: intelligenceMeta.constellation_id,
    mission_category: intelligenceMeta.mission_category,
    decay_status: intelligenceMeta.decay_status,

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
    perigee_km: Number.isFinite(satrec.altp)
      ? satrec.altp * EARTH_RADIUS_KM
      : null,
    apogee_km: Number.isFinite(satrec.alta)
      ? satrec.alta * EARTH_RADIUS_KM
      : null,
  };
}

function buildIntelligenceMeta(tle, satrec) {
  const missionCategory = classifyMission(tle);
  const constellationId = classifyConstellation(tle, missionCategory);
  const perigeeKm = Number.isFinite(satrec.altp)
    ? satrec.altp * EARTH_RADIUS_KM
    : null;

  return {
    constellation_id: constellationId,
    mission_category: missionCategory,
    decay_status:
      Number.isFinite(perigeeKm) && perigeeKm < 200
        ? 'DECAYING'
        : 'STABLE',
  };
}

function classifyMission(tle) {
  const name = (tle.object_name ?? '').toUpperCase();
  const type = (tle.object_type ?? '').toUpperCase();

  if (/\b(NROL|USA |LACROSSE|KEYHOLE|KH-|MENTOR|TRUMPET|ORION|MERIDIAN|YAOGAN|OFQ|SAR-LUPE|TOPAZ|COSMO-SKYMED)\b/.test(name)) {
    return 'SIGINT';
  }

  if (/\b(GPS|NAVSTAR|GLONASS|GALILEO|BEIDOU|QZSS|IRNSS|NAVIC)\b/.test(name)) {
    return 'NAV';
  }

  if (/\b(STARLINK|ONEWEB|IRIDIUM|GLOBALSTAR|INTELSAT|INMARSAT|SES-|EUTELSAT|VIASAT|TDRS|ORBCOMM|SKYNET)\b/.test(name)) {
    return 'COMMS';
  }

  if (/\b(GOES|NOAA|METEOSAT|HIMAWARI|FENGYUN|FY-|METOP|DMSP|AQUA|TERRA|SUOMI|JPSS|LANDSAT|SENTINEL)\b/.test(name)) {
    return 'WEATHER';
  }

  if (type.includes('PAYLOAD')) {
    return 'OTHER';
  }

  return 'OTHER';
}

function classifyConstellation(tle, missionCategory) {
  const name = (tle.object_name ?? '').toUpperCase();

  if (name.includes('STARLINK')) return 'starlink';
  if (name.includes('ONEWEB')) return 'oneweb';
  if (name.includes('IRIDIUM')) return 'iridium';
  if (name.includes('GPS') || name.includes('NAVSTAR')) return 'gps';
  if (name.includes('GLONASS')) return 'glonass';
  if (name.includes('GALILEO')) return 'galileo';
  if (name.includes('BEIDOU')) return 'beidou';
  if (name.includes('GOES')) return 'goes';
  if (name.includes('NOAA')) return 'noaa';

  return missionCategory === 'OTHER' ? null : missionCategory.toLowerCase();
}

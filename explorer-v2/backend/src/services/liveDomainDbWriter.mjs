import { getWeatherIntelPool } from './weatherIntelDb.mjs';

const FLUSH_DELAY_MS = 1_000;
const FLIGHT_SNAPSHOT_INTERVAL_MS = Number(process.env.LIVE_DB_FLIGHT_INTERVAL_MS || 60_000);
const SHIP_SNAPSHOT_INTERVAL_MS = Number(process.env.LIVE_DB_SHIP_INTERVAL_MS || 60_000);
const SATELLITE_STATE_INTERVAL_MS = Number(process.env.LIVE_DB_SATELLITE_INTERVAL_MS || 60_000);
const CHUNK_SIZE = Number(process.env.LIVE_DB_CHUNK_SIZE || 500);

const flightQueue = new Map();
const shipQueue = new Map();
let tleQueue = [];
let satelliteStateQueue = [];
let cableQueue = [];

const flightBuckets = new Map();
const shipBuckets = new Map();
let lastSatelliteStateEnqueueMs = 0;
let flushTimer = null;
let flushing = false;
let lastErrorLogAt = 0;
let lastErrorMessage = '';

export function enqueueFlightSnapshot(flight) {
  if (!flight?.id_icao || !isFiniteCoordinate(flight.latitude, flight.longitude)) return;

  const observedMs = timestampToMs(flight.timestamp);
  const bucket = Math.floor(observedMs / FLIGHT_SNAPSHOT_INTERVAL_MS);
  if (flightBuckets.get(flight.id_icao) === bucket) return;

  flightBuckets.set(flight.id_icao, bucket);
  flightQueue.set(`${flight.id_icao}:${bucket}`, {
    icao24: String(flight.id_icao).toLowerCase(),
    observedAt: new Date(observedMs),
    callsign: nullableText(flight.callsign),
    registration: nullableText(flight.registration),
    aircraftType: nullableText(flight.aircraft_type),
    latitude: Number(flight.latitude),
    longitude: Number(flight.longitude),
    altitudeBaroM: finiteOrNull(flight.altitude_baro_m),
    altitudeGeomM: finiteOrNull(flight.altitude_geom_m),
    velocityMps: finiteOrNull(flight.velocity_mps),
    headingTrueDeg: finiteOrNull(flight.heading_true_deg),
    verticalRateMps: finiteOrNull(flight.vertical_rate_mps),
    onGround: Boolean(flight.on_ground),
    squawk: nullableText(flight.squawk),
    emergencyStatus: nullableText(flight.emergency_status),
    isMilitary: Boolean(flight.is_military),
    isInteresting: Boolean(flight.is_interesting || flight.is_pia || flight.is_ladd || flight.is_active_emergency),
    sourceKey: sourceKeyForFlight(flight),
    payload: toJson({
      data_source: flight.data_source,
      description: flight.description,
      owner_operator: flight.owner_operator,
      country_origin: flight.country_origin,
      heading_mag_deg: flight.heading_mag_deg,
      nav_target_alt_m: flight.nav_target_alt_m,
      nav_target_heading: flight.nav_target_heading,
      is_pia: flight.is_pia,
      is_ladd: flight.is_ladd,
      vehicle_type: flight.vehicle_type,
      vehicle_subtype: flight.vehicle_subtype,
      operation_type: flight.operation_type,
      operation_subtype: flight.operation_subtype,
    }),
  });
  scheduleFlush();
}

export function enqueueSatelliteTleCatalog(tles) {
  const rows = [];
  for (const tle of tles ?? []) {
    const noradId = integerOrNull(tle?.id_norad);
    if (!noradId || !tle?.line1 || !tle?.line2) continue;
    rows.push({
      noradId,
      objectName: nullableText(tle.object_name),
      objectType: nullableText(tle.object_type),
      countryOrigin: nullableText(tle.country_origin),
      launchDate: dateOrNull(tle.launch_date),
      tleEpoch: dateOrNull(tle.epoch),
      line1: String(tle.line1),
      line2: String(tle.line2),
      sourceKey: 'space_track',
      attributes: toJson({
        tle_source: tle.tle_source,
        fetched_at: tle.fetched_at,
      }),
    });
  }
  if (!rows.length) return;
  tleQueue = rows;
  scheduleFlush();
}

export function enqueueSatelliteStateSnapshots(satellites) {
  const nowMs = Date.now();
  if (nowMs - lastSatelliteStateEnqueueMs < SATELLITE_STATE_INTERVAL_MS) return;
  lastSatelliteStateEnqueueMs = nowMs;

  satelliteStateQueue = (satellites ?? [])
    .map((satellite) => {
      const noradId = integerOrNull(satellite?.id_norad);
      if (!noradId || !isFiniteCoordinate(satellite.latitude, satellite.longitude)) return null;
      return {
        noradId,
        observedAt: new Date(timestampToMs(satellite.timestamp)),
        latitude: Number(satellite.latitude),
        longitude: Number(satellite.longitude),
        altitudeKm: finiteOrNull(satellite.altitude_km),
        velocityKps: finiteOrNull(satellite.velocity_kps),
        inclinationDeg: finiteOrNull(satellite.inclination_deg),
        periodMinutes: finiteOrNull(satellite.period_minutes),
        missionCategory: nullableText(satellite.mission_category),
        decayStatus: nullableText(satellite.decay_status),
        sourceKey: 'space_track',
        payload: toJson({
          object_name: satellite.object_name,
          object_type: satellite.object_type,
          country_origin: satellite.country_origin,
          launch_date: satellite.launch_date,
          tle_epoch: satellite.tle_epoch,
          mean_motion_rev_per_day: satellite.mean_motion_rev_per_day,
          perigee_km: satellite.perigee_km,
          apogee_km: satellite.apogee_km,
          constellation_id: satellite.constellation_id,
          data_source: satellite.data_source,
          tle_source: satellite.tle_source,
        }),
      };
    })
    .filter(Boolean);

  if (satelliteStateQueue.length) scheduleFlush();
}

export function enqueueInfrastructureCables(cables) {
  cableQueue = (cables ?? [])
    .map((cable) => {
      if (!cable?.asset_id || !cable?.name || !Array.isArray(cable.segments)) return null;
      return {
        cableId: String(cable.asset_id),
        name: String(cable.name),
        status: nullableText(cable.status),
        ownerOperator: nullableText(cable.operator ?? cable.owner_operator),
        lengthKm: finiteOrNull(cable.length_km),
        geometry: toCableGeoJson(cable.segments),
        sourceKey: 'submarine_cable_map',
        attributes: toJson({
          last_inspected_by: cable.last_inspected_by,
        }),
      };
    })
    .filter(Boolean);

  if (cableQueue.length) scheduleFlush();
}

export function enqueueShipSnapshot(ship) {
  if (!ship?.vessel_id || !isFiniteCoordinate(ship.latitude, ship.longitude)) return;

  const observedMs = timestampToMs(ship.timestamp);
  const bucket = Math.floor(observedMs / SHIP_SNAPSHOT_INTERVAL_MS);
  if (shipBuckets.get(ship.vessel_id) === bucket) return;

  shipBuckets.set(ship.vessel_id, bucket);
  shipQueue.set(`${ship.vessel_id}:${bucket}`, {
    vesselId: String(ship.vessel_id),
    mmsi: nullableText(ship.mmsi),
    name: nullableText(ship.name),
    vesselType: nullableText(ship.vessel_type),
    observedAt: new Date(observedMs),
    latitude: Number(ship.latitude),
    longitude: Number(ship.longitude),
    speedKnots: finiteOrNull(ship.speed_knots),
    headingDeg: finiteOrNull(ship.heading_deg),
    nearestCableId: nullableText(ship.nearest_cable_id),
    nearestCableDistanceM: finiteOrNull(ship.nearest_cable_distance_m),
    riskStatus: nullableText(ship.risk_status),
    sourceKey: 'aisstream',
    payload: toJson({
      trail: ship.trail,
      data_source: ship.data_source,
    }),
  });
  scheduleFlush();
}

export function enqueueMaritimePresenceSnapshots(vessels, options = {}) {
  const observedAtFallback = options.observedAt ? new Date(options.observedAt) : new Date();
  let accepted = 0;

  for (const vessel of vessels ?? []) {
    const vesselId = stableVesselId(vessel);
    const latitude = Number(vessel?.latitude ?? vessel?.lat);
    const longitude = Number(vessel?.longitude ?? vessel?.lon);
    if (!vesselId || !isFiniteCoordinate(latitude, longitude)) continue;

    const observedAt = dateOrNull(vessel.timestamp) ?? observedAtFallback;
    const bucket = Math.floor(observedAt.getTime() / SHIP_SNAPSHOT_INTERVAL_MS);
    const queueKey = `${vesselId}:${bucket}:global_fishing_watch`;
    if (shipQueue.has(queueKey)) continue;

    shipQueue.set(queueKey, {
      vesselId,
      mmsi: nullableText(vessel.mmsi),
      name: nullableText(vessel.name),
      vesselType: nullableText(vessel.vessel_type ?? vessel.type),
      observedAt,
      latitude,
      longitude,
      speedKnots: finiteOrNull(vessel.speed_knots ?? vessel.speedKnots),
      headingDeg: finiteOrNull(vessel.heading_deg ?? vessel.headingDeg),
      nearestCableId: nullableText(vessel.nearest_cable_id),
      nearestCableDistanceM: finiteOrNull(vessel.nearest_cable_distance_m),
      riskStatus: nullableText(vessel.risk_status),
      sourceKey: 'global_fishing_watch',
      payload: toJson({
        data_source: vessel.data_source ?? 'global_fishing_watch',
        presence_type: vessel.type,
        source_label: options.sourceLabel,
      }),
    });
    accepted += 1;
  }

  if (accepted > 0) scheduleFlush();
}

export async function flushLiveDomainWrites() {
  if (flushing) return;
  flushing = true;

  const flights = takeMapValues(flightQueue);
  const ships = takeMapValues(shipQueue);
  const tles = takeArray('tle');
  const satelliteStates = takeArray('satellite');
  const cables = takeArray('cable');

  try {
    const pool = getWeatherIntelPool();
    await insertFlightSnapshots(pool, flights);
    await insertSatelliteTles(pool, tles);
    await insertSatelliteStates(pool, satelliteStates);
    await insertInfrastructureCables(pool, cables);
    await insertShipSnapshots(pool, ships);
  } catch (error) {
    logPersistenceError(error);
  } finally {
    flushing = false;
    if (hasPendingWrites()) scheduleFlush();
  }
}

function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    void flushLiveDomainWrites();
  }, FLUSH_DELAY_MS);
}

async function insertFlightSnapshots(pool, rows) {
  const columns = [
    'icao24',
    'observed_at',
    'callsign',
    'registration',
    'aircraft_type',
    'latitude',
    'longitude',
    'altitude_baro_m',
    'altitude_geom_m',
    'velocity_mps',
    'heading_true_deg',
    'vertical_rate_mps',
    'on_ground',
    'squawk',
    'emergency_status',
    'is_military',
    'is_interesting',
    'source_key',
    'payload',
  ];
  await insertChunked(pool, rows, columns, (row) => [
    row.icao24,
    row.observedAt,
    row.callsign,
    row.registration,
    row.aircraftType,
    row.latitude,
    row.longitude,
    row.altitudeBaroM,
    row.altitudeGeomM,
    row.velocityMps,
    row.headingTrueDeg,
    row.verticalRateMps,
    row.onGround,
    row.squawk,
    row.emergencyStatus,
    row.isMilitary,
    row.isInteresting,
    row.sourceKey,
    row.payload,
  ], (valuesSql) => `
    INSERT INTO aviation.live_flight_snapshots (${columns.join(', ')})
    VALUES ${valuesSql}
    ON CONFLICT (icao24, observed_at) DO NOTHING
  `);
}

async function insertSatelliteTles(pool, rows) {
  const columns = [
    'norad_id',
    'object_name',
    'object_type',
    'country_origin',
    'launch_date',
    'tle_epoch',
    'line1',
    'line2',
    'source_key',
    'attributes',
  ];
  await insertChunked(pool, rows, columns, (row) => [
    row.noradId,
    row.objectName,
    row.objectType,
    row.countryOrigin,
    row.launchDate,
    row.tleEpoch,
    row.line1,
    row.line2,
    row.sourceKey,
    row.attributes,
  ], (valuesSql) => `
    INSERT INTO satellites.tle_catalog (${columns.join(', ')})
    VALUES ${valuesSql}
    ON CONFLICT (norad_id) DO UPDATE SET
      object_name = EXCLUDED.object_name,
      object_type = EXCLUDED.object_type,
      country_origin = EXCLUDED.country_origin,
      launch_date = EXCLUDED.launch_date,
      tle_epoch = EXCLUDED.tle_epoch,
      line1 = EXCLUDED.line1,
      line2 = EXCLUDED.line2,
      source_key = EXCLUDED.source_key,
      updated_at = now(),
      attributes = EXCLUDED.attributes
  `);
}

async function insertSatelliteStates(pool, rows) {
  const columns = [
    'norad_id',
    'observed_at',
    'latitude',
    'longitude',
    'altitude_km',
    'velocity_kps',
    'inclination_deg',
    'period_minutes',
    'mission_category',
    'decay_status',
    'source_key',
    'payload',
  ];
  await insertChunked(pool, rows, columns, (row) => [
    row.noradId,
    row.observedAt,
    row.latitude,
    row.longitude,
    row.altitudeKm,
    row.velocityKps,
    row.inclinationDeg,
    row.periodMinutes,
    row.missionCategory,
    row.decayStatus,
    row.sourceKey,
    row.payload,
  ], (valuesSql) => `
    INSERT INTO satellites.state_snapshots (${columns.join(', ')})
    VALUES ${valuesSql}
    ON CONFLICT (norad_id, observed_at) DO NOTHING
  `);
}

async function insertInfrastructureCables(pool, rows) {
  if (!rows.length) return;
  for (const chunk of chunks(rows, CHUNK_SIZE)) {
    const values = [];
    const tuples = chunk.map((row) => {
      const base = values.length;
      values.push(
        row.cableId,
        row.name,
        row.status,
        row.ownerOperator,
        row.lengthKm,
        row.geometry,
        row.sourceKey,
        row.attributes,
      );
      return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8})`;
    });
    await pool.query(`
      INSERT INTO infrastructure.cables (
        cable_id,
        name,
        status,
        owner_operator,
        length_km,
        geom,
        source_key,
        attributes
      )
      SELECT
        cable_id::text,
        name::text,
        status::text,
        owner_operator::text,
        length_km::double precision,
        CASE
          WHEN geom_geojson IS NULL THEN NULL
          ELSE ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON(geom_geojson::text), 4326))
        END,
        source_key::text,
        attributes::jsonb
      FROM (VALUES ${tuples.join(', ')}) AS v(
        cable_id,
        name,
        status,
        owner_operator,
        length_km,
        geom_geojson,
        source_key,
        attributes
      )
      ON CONFLICT (cable_id) DO UPDATE SET
        name = EXCLUDED.name,
        status = EXCLUDED.status,
        owner_operator = EXCLUDED.owner_operator,
        length_km = EXCLUDED.length_km,
        geom = EXCLUDED.geom,
        source_key = EXCLUDED.source_key,
        updated_at = now(),
        attributes = EXCLUDED.attributes
    `, values);
  }
}

async function insertShipSnapshots(pool, rows) {
  if (!rows.length) return;
  const vessels = new Map();
  for (const row of rows) {
    vessels.set(row.vesselId, row);
  }
  await insertVessels(pool, Array.from(vessels.values()));

  const columns = [
    'vessel_id',
    'observed_at',
    'latitude',
    'longitude',
    'speed_knots',
    'heading_deg',
    'nearest_cable_id',
    'nearest_cable_distance_m',
    'risk_status',
    'source_key',
    'payload',
  ];
  await insertChunked(pool, rows, columns, (row) => [
    row.vesselId,
    row.observedAt,
    row.latitude,
    row.longitude,
    row.speedKnots,
    row.headingDeg,
    row.nearestCableId,
    row.nearestCableDistanceM,
    row.riskStatus,
    row.sourceKey,
    row.payload,
  ], (valuesSql) => `
    INSERT INTO maritime.position_snapshots (${columns.join(', ')})
    VALUES ${valuesSql}
    ON CONFLICT (vessel_id, observed_at) DO NOTHING
  `);
}

async function insertVessels(pool, rows) {
  const columns = ['vessel_id', 'mmsi', 'name', 'vessel_type', 'source_key', 'attributes'];
  await insertChunked(pool, rows, columns, (row) => [
    row.vesselId,
    row.mmsi,
    row.name,
    row.vesselType,
    row.sourceKey,
    toJson({ last_position_at: row.observedAt }),
  ], (valuesSql) => `
    INSERT INTO maritime.vessels (${columns.join(', ')})
    VALUES ${valuesSql}
    ON CONFLICT (vessel_id) DO UPDATE SET
      mmsi = COALESCE(EXCLUDED.mmsi, maritime.vessels.mmsi),
      name = COALESCE(EXCLUDED.name, maritime.vessels.name),
      vessel_type = COALESCE(EXCLUDED.vessel_type, maritime.vessels.vessel_type),
      source_key = EXCLUDED.source_key,
      updated_at = now(),
      attributes = maritime.vessels.attributes || EXCLUDED.attributes
  `);
}

async function insertChunked(pool, rows, columns, valuesForRow, sqlForValues) {
  if (!rows.length) return;
  for (const chunk of chunks(rows, CHUNK_SIZE)) {
    const values = [];
    const tuples = chunk.map((row) => {
      const tuple = valuesForRow(row);
      const placeholders = tuple.map((value) => {
        values.push(value);
        return `$${values.length}`;
      });
      return `(${placeholders.join(', ')})`;
    });
    await pool.query(sqlForValues(tuples.join(', ')), values);
  }
}

function takeMapValues(map) {
  const values = Array.from(map.values());
  map.clear();
  return values;
}

function takeArray(queueName) {
  if (queueName === 'tle') {
    const rows = tleQueue;
    tleQueue = [];
    return rows;
  }
  if (queueName === 'satellite') {
    const rows = satelliteStateQueue;
    satelliteStateQueue = [];
    return rows;
  }
  const rows = cableQueue;
  cableQueue = [];
  return rows;
}

function hasPendingWrites() {
  return flightQueue.size > 0 ||
    shipQueue.size > 0 ||
    tleQueue.length > 0 ||
    satelliteStateQueue.length > 0 ||
    cableQueue.length > 0;
}

function chunks(rows, size) {
  const grouped = [];
  for (let index = 0; index < rows.length; index += size) {
    grouped.push(rows.slice(index, index + size));
  }
  return grouped;
}

function sourceKeyForFlight(flight) {
  const source = String(flight.data_source ?? '').toLowerCase();
  if (source.includes('opensky')) return 'opensky';
  if (source.includes('adsb.lol')) return 'adsb_lol_intel';
  return 'airplanes_live';
}

function timestampToMs(timestamp) {
  const number = Number(timestamp);
  if (Number.isFinite(number) && number > 0) {
    return number > 9_999_999_999 ? number : number * 1000;
  }
  return Date.now();
}

function finiteOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function integerOrNull(value) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}

function isFiniteCoordinate(latitude, longitude) {
  const lat = Number(latitude);
  const lon = Number(longitude);
  return Number.isFinite(lat) &&
    Number.isFinite(lon) &&
    lat >= -90 &&
    lat <= 90 &&
    lon >= -180 &&
    lon <= 180;
}

function nullableText(value) {
  if (value == null) return null;
  const text = String(value).trim();
  return text || null;
}

function dateOrNull(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function stableVesselId(vessel) {
  const raw =
    vessel?.vessel_id ??
    vessel?.vesselId ??
    vessel?.vesselKey ??
    vessel?.mmsi ??
    (vessel?.name && vessel?.timestamp ? `${vessel.name}:${vessel.timestamp}` : null);
  const text = nullableText(raw);
  return text ? text.slice(0, 160) : null;
}

function toJson(value) {
  return JSON.stringify(value ?? {});
}

function toCableGeoJson(segments) {
  const coordinates = segments
    .map((segment) =>
      segment
        .map((point) => [Number(point.lon), Number(point.lat)])
        .filter(([lon, lat]) => Number.isFinite(lon) && Number.isFinite(lat)),
    )
    .filter((segment) => segment.length > 1);

  if (!coordinates.length) return null;
  return JSON.stringify({
    type: 'MultiLineString',
    coordinates,
  });
}

function logPersistenceError(error) {
  const message = error instanceof Error ? error.message : String(error);
  const now = Date.now();
  if (message === lastErrorMessage && now - lastErrorLogAt < 60_000) return;

  lastErrorMessage = message;
  lastErrorLogAt = now;
  console.error(`[Live DB] ${message}`);
}

import { getWeatherIntelPool, parseLimit } from './weatherIntelDb.mjs';

const HISTORY_LOOKBACK_SECONDS = Number(process.env.LIVE_DB_HISTORY_LOOKBACK_SECONDS || 180);

export function hasTimelineQuery(url) {
  return Boolean(url.searchParams.get('time') || url.searchParams.get('timeMode'));
}

export function timelineOptionsFromUrl(url, fallbackLimit = 2000) {
  const selectedTime = parseTimelineTime(url.searchParams.get('time'));
  return {
    selectedTime,
    limit: parseLimit(url.searchParams.get('limit'), fallbackLimit),
    lookbackSeconds: HISTORY_LOOKBACK_SECONDS,
  };
}

export async function queryFlightSnapshots(options = {}) {
  const selectedTime = options.selectedTime ?? new Date();
  const limit = options.limit ?? 10_000;
  const lookbackSeconds = options.lookbackSeconds ?? HISTORY_LOOKBACK_SECONDS;
  const result = await getWeatherIntelPool().query(`
    WITH latest AS (
      SELECT DISTINCT ON (f.icao24)
        f.*
      FROM aviation.live_flight_snapshots f
      WHERE f.observed_at <= $1::timestamptz
        AND f.observed_at >= $1::timestamptz - make_interval(secs => $2::integer)
      ORDER BY f.icao24, f.observed_at DESC
    )
    SELECT
      icao24 AS id_icao,
      callsign,
      registration,
      aircraft_type,
      payload->>'description' AS description,
      payload->>'owner_operator' AS owner_operator,
      payload->>'country_origin' AS country_origin,
      COALESCE(payload->>'vehicle_type', 'Airplane') AS vehicle_type,
      COALESCE(payload->>'vehicle_subtype', 'General') AS vehicle_subtype,
      COALESCE(payload->>'operation_type', 'Unknown') AS operation_type,
      COALESCE(payload->>'operation_subtype', 'Unknown') AS operation_subtype,
      latitude,
      longitude,
      COALESCE(altitude_baro_m, 0) AS altitude_baro_m,
      altitude_geom_m,
      COALESCE(velocity_mps, 0) AS velocity_mps,
      COALESCE(heading_true_deg, 0) AS heading_true_deg,
      CASE
        WHEN payload ? 'heading_mag_deg' THEN NULLIF(payload->>'heading_mag_deg', '')::double precision
        ELSE NULL
      END AS heading_mag_deg,
      COALESCE(vertical_rate_mps, 0) AS vertical_rate_mps,
      on_ground,
      squawk,
      COALESCE(emergency_status, 'NONE') AS emergency_status,
      COALESCE(emergency_status, 'NONE') NOT IN ('NONE', '') AS is_active_emergency,
      is_military,
      is_interesting,
      payload->>'is_pia' = 'true' AS is_pia,
      payload->>'is_ladd' = 'true' AS is_ladd,
      COALESCE(payload->>'data_source', source_key) AS data_source,
      EXTRACT(EPOCH FROM observed_at)::double precision AS timestamp
    FROM latest
    ORDER BY observed_at DESC
    LIMIT $3
  `, [selectedTime, lookbackSeconds, limit]);
  return result.rows;
}

export async function querySatelliteSnapshots(options = {}) {
  const selectedTime = options.selectedTime ?? new Date();
  const limit = options.limit ?? 2000;
  const lookbackSeconds = options.lookbackSeconds ?? HISTORY_LOOKBACK_SECONDS;
  const result = await getWeatherIntelPool().query(`
    WITH latest AS (
      SELECT DISTINCT ON (s.norad_id)
        s.*,
        t.object_name,
        t.object_type,
        t.country_origin,
        t.launch_date,
        t.tle_epoch,
        t.line1,
        t.line2
      FROM satellites.state_snapshots s
      JOIN satellites.tle_catalog t ON t.norad_id = s.norad_id
      WHERE s.observed_at <= $1::timestamptz
        AND s.observed_at >= $1::timestamptz - make_interval(secs => $2::integer)
      ORDER BY s.norad_id, s.observed_at DESC
    )
    SELECT
      norad_id AS id_norad,
      object_name,
      object_type,
      country_origin,
      launch_date,
      latitude,
      longitude,
      altitude_km,
      velocity_kps,
      tle_epoch,
      inclination_deg,
      period_minutes,
      payload->>'mean_motion_rev_per_day' AS mean_motion_rev_per_day,
      payload->>'perigee_km' AS perigee_km,
      payload->>'apogee_km' AS apogee_km,
      line1,
      line2,
      payload->>'constellation_id' AS constellation_id,
      mission_category,
      decay_status,
      COALESCE(payload->>'data_source', source_key) AS data_source,
      payload->>'tle_source' AS tle_source,
      EXTRACT(EPOCH FROM observed_at)::double precision AS timestamp
    FROM latest
    ORDER BY observed_at DESC
    LIMIT $3
  `, [selectedTime, lookbackSeconds, limit]);
  return result.rows;
}

export async function queryInfrastructureSnapshot(options = {}) {
  const selectedTime = options.selectedTime ?? new Date();
  const limit = options.limit ?? 2000;
  const lookbackSeconds = options.lookbackSeconds ?? HISTORY_LOOKBACK_SECONDS;
  const [cablesResult, shipsResult, assetsResult] = await Promise.all([
    getWeatherIntelPool().query(`
      SELECT
        cable_id,
        cable_id AS asset_id,
        name,
        status,
        owner_operator AS operator,
        length_km,
        ST_AsGeoJSON(geom)::jsonb AS geometry,
        attributes
      FROM infrastructure.cables
      WHERE geom IS NOT NULL
      ORDER BY updated_at DESC
      LIMIT $1
    `, [limit]),
    getWeatherIntelPool().query(`
      WITH latest AS (
        SELECT DISTINCT ON (p.vessel_id)
          p.*,
          v.mmsi,
          v.name,
          v.vessel_type,
          v.flag
        FROM maritime.position_snapshots p
        JOIN maritime.vessels v ON v.vessel_id = p.vessel_id
        WHERE p.observed_at <= $1::timestamptz
          AND p.observed_at >= $1::timestamptz - make_interval(secs => $2::integer)
        ORDER BY p.vessel_id, p.observed_at DESC
      )
      SELECT
        vessel_id,
        mmsi,
        name,
        vessel_type,
        flag,
        latitude,
        longitude,
        speed_knots,
        heading_deg,
        nearest_cable_id,
        nearest_cable_distance_m,
        risk_status,
        COALESCE(payload->>'data_source', source_key) AS data_source,
        EXTRACT(EPOCH FROM observed_at)::double precision AS timestamp,
        payload
      FROM latest
      ORDER BY observed_at DESC
      LIMIT $3
    `, [selectedTime, lookbackSeconds, limit]),
    getWeatherIntelPool().query(`
      SELECT
        asset_id,
        asset_type,
        name,
        status,
        latitude,
        longitude,
        EXTRACT(EPOCH FROM updated_at)::double precision AS timestamp,
        attributes AS payload
      FROM infrastructure.assets
      WHERE latitude IS NOT NULL
        AND longitude IS NOT NULL
      ORDER BY updated_at DESC
      LIMIT $1
    `, [limit]),
  ]);

  return {
    cables: cablesResult.rows.map((row) => ({
      ...row,
      segments: segmentsFromGeoJson(row.geometry),
    })),
    ships: shipsResult.rows,
    nodes: assetsResult.rows,
  };
}

export async function queryMaritimeSnapshots(options = {}) {
  const selectedTime = options.selectedTime ?? new Date();
  const limit = options.limit ?? 10_000;
  const lookbackSeconds = options.lookbackSeconds ?? HISTORY_LOOKBACK_SECONDS;
  const sourceKey = options.sourceKey ?? null;
  const result = await getWeatherIntelPool().query(`
    WITH latest AS (
      SELECT DISTINCT ON (p.vessel_id)
        p.*,
        v.mmsi,
        v.name,
        v.vessel_type,
        v.flag
      FROM maritime.position_snapshots p
      JOIN maritime.vessels v ON v.vessel_id = p.vessel_id
      WHERE p.observed_at <= $1::timestamptz
        AND p.observed_at >= $1::timestamptz - make_interval(secs => $2::integer)
        AND ($4::text IS NULL OR p.source_key = $4::text)
      ORDER BY p.vessel_id, p.observed_at DESC
    )
    SELECT
      vessel_id,
      vessel_id AS "vesselId",
      mmsi,
      COALESCE(name, vessel_id) AS name,
      vessel_type,
      CASE
        WHEN lower(COALESCE(vessel_type, '')) LIKE '%tanker%' THEN 'BUNKER_OR_TANKER'
        WHEN lower(COALESCE(vessel_type, '')) LIKE '%bunker%' THEN 'BUNKER_OR_TANKER'
        ELSE 'CARGO'
      END AS type,
      flag,
      latitude,
      longitude,
      latitude AS lat,
      longitude AS lon,
      speed_knots,
      heading_deg,
      nearest_cable_id,
      nearest_cable_distance_m,
      risk_status,
      COALESCE(payload->>'data_source', source_key) AS data_source,
      EXTRACT(EPOCH FROM observed_at)::double precision AS timestamp,
      observed_at AS observed_time,
      payload
    FROM latest
    ORDER BY observed_at DESC
    LIMIT $3
  `, [selectedTime, lookbackSeconds, limit, sourceKey]);
  return result.rows;
}

function parseTimelineTime(value) {
  if (!value) return new Date();
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return new Date();
  return date;
}

function segmentsFromGeoJson(geometry) {
  const coordinates = geometry?.coordinates;
  if (!Array.isArray(coordinates)) return [];

  if (geometry.type === 'LineString') {
    return [coordinates.map(toLatLon).filter(Boolean)];
  }

  if (geometry.type === 'MultiLineString') {
    return coordinates.map((segment) => segment.map(toLatLon).filter(Boolean));
  }

  return [];
}

function toLatLon(coordinate) {
  const lon = Number(coordinate?.[0]);
  const lat = Number(coordinate?.[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return { lat, lon };
}

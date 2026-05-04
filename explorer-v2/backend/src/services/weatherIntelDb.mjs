import pg from 'pg';

const { Pool } = pg;

const DEFAULT_LIMIT = 250;
const MAX_LIMIT = 2000;

let pool;

function dbConfig() {
  return {
    host: process.env.PGHOST || 'localhost',
    port: Number(process.env.PGPORT || process.env.GOD_EYES_DB_PORT || 55432),
    database: process.env.PGDATABASE || 'god_eyes',
    user: process.env.PGUSER || 'god_eyes',
    password: process.env.PGPASSWORD || process.env.GOD_EYES_DB_PASSWORD || 'god_eyes_dev_password',
  };
}

export function getWeatherIntelPool() {
  if (!pool) pool = new Pool(dbConfig());
  return pool;
}

export async function closeWeatherIntelPool() {
  if (!pool) return;
  await pool.end();
  pool = null;
}

export function parseLimit(value, fallback = DEFAULT_LIMIT) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(Math.floor(parsed), MAX_LIMIT);
}

function addOptionalFilter(parts, values, column, value) {
  if (!value) return;
  values.push(value);
  parts.push(`${column} = $${values.length}`);
}

function ageSecondsExpression(timeExpr) {
  return `EXTRACT(EPOCH FROM (now() - ${timeExpr}))::integer`;
}

function sourceLineageSelect(alias = 'r') {
  return `
    jsonb_build_object(
      'raw_file_id', ${alias}.raw_file_id,
      'raw_file_path', ${alias}.raw_file_path,
      'metadata_path', ${alias}.metadata_path,
      'checksum_sha256', ${alias}.checksum_sha256,
      'endpoint', ${alias}.endpoint,
      'fetched_at', ${alias}.fetched_at,
      'content_type', ${alias}.content_type,
      'bytes', ${alias}.bytes
    ) AS source_lineage
  `;
}

export async function queryCurrentWeather(options = {}) {
  const limit = parseLimit(options.limit);
  const where = [];
  const values = [];
  addOptionalFilter(where, values, 'w.parameter_id', options.parameter);
  addOptionalFilter(where, values, 'w.source_id', options.source);
  values.push(limit);
  const sql = `
    SELECT
      w.record_id,
      w.parameter_id,
      COALESCE(p.display_name, w.parameter_id) AS display_name,
      w.source_id,
      s.source_name,
      w.value,
      w.unit,
      w.latitude,
      w.longitude,
      ST_AsGeoJSON(w.geom)::jsonb AS geometry,
      w.h3_res6,
      w.h3_res7,
      w.observed_time,
      w.valid_time,
      w.forecast_time,
      w.time_index,
      w.value_kind,
      w.confidence_score,
      w.quality_flag,
      ${ageSecondsExpression('COALESCE(w.valid_time, w.observed_time, w.time_index)')} AS freshness_age_seconds,
      ${sourceLineageSelect('r')},
      w.payload
    FROM weather_time_series w
    JOIN source_raw_files r ON r.raw_file_id = w.raw_file_id
    LEFT JOIN parameter_registry p ON p.parameter_id = w.parameter_id
    LEFT JOIN sources s ON s.source_id = w.source_id
    ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
    ORDER BY w.time_index DESC
    LIMIT $${values.length}
  `;
  const result = await getWeatherIntelPool().query(sql, values);
  return result.rows;
}

export async function queryBestCurrentValues(options = {}) {
  const limit = parseLimit(options.limit);
  const where = [];
  const values = [];
  addOptionalFilter(where, values, 'b.parameter_id', options.parameter);
  addOptionalFilter(where, values, 'b.source_id', options.source);
  values.push(limit);
  const sql = `
    SELECT
      b.selected_table,
      b.record_id,
      b.parameter_id,
      b.display_name,
      b.category,
      b.data_family,
      b.source_id,
      b.source_name,
      b.source_family,
      b.authority_level,
      b.priority_current,
      b.value,
      b.unit,
      b.latitude,
      b.longitude,
      ST_AsGeoJSON(b.geom)::jsonb AS geometry,
      b.h3_res6,
      b.h3_res7,
      b.h3_res8,
      b.observed_time,
      b.valid_time,
      b.forecast_time,
      b.time_index,
      b.confidence_score,
      b.quality_flag,
      ${ageSecondsExpression('COALESCE(b.valid_time, b.observed_time, b.time_index)')} AS freshness_age_seconds,
      ${sourceLineageSelect('r')},
      b.payload
    FROM best_current_values b
    JOIN source_raw_files r ON r.raw_file_id = b.raw_file_id
    ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
    ORDER BY b.time_index DESC
    LIMIT $${values.length}
  `;
  const result = await getWeatherIntelPool().query(sql, values);
  return result.rows;
}

export async function queryActiveHazards(options = {}) {
  const limit = parseLimit(options.limit);
  const where = [];
  const values = [];
  addOptionalFilter(where, values, 'h.event_type', options.eventType);
  addOptionalFilter(where, values, 'h.source_id', options.source);
  if (options.activeOnly !== false) {
    where.push("(h.expires_time IS NULL OR h.expires_time >= now() - interval '1 hour')");
    where.push("(h.ended_at IS NULL OR h.ended_at >= now() - interval '1 hour')");
  }
  values.push(limit);
  const sql = `
    SELECT
      h.record_id,
      h.parameter_id,
      COALESCE(p.display_name, h.parameter_id) AS display_name,
      h.source_id,
      s.source_name,
      h.event_type,
      h.event_id,
      h.title,
      h.description,
      h.hazard_type,
      h.severity,
      h.severity_score,
      h.magnitude,
      h.category,
      h.status,
      h.started_at,
      h.observed_time,
      h.valid_time,
      h.updated_time,
      h.ended_at,
      h.expires_time,
      h.time_index,
      h.centroid_latitude,
      h.centroid_longitude,
      ST_AsGeoJSON(h.geom)::jsonb AS geometry,
      h.h3_res6,
      h.h3_res7,
      h.value,
      h.unit,
      h.confidence_score,
      h.quality_flag,
      ${ageSecondsExpression('COALESCE(h.valid_time, h.observed_time, h.time_index)')} AS freshness_age_seconds,
      ${sourceLineageSelect('r')},
      h.payload
    FROM hazard_events h
    JOIN source_raw_files r ON r.raw_file_id = h.raw_file_id
    LEFT JOIN parameter_registry p ON p.parameter_id = h.parameter_id
    LEFT JOIN sources s ON s.source_id = h.source_id
    ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
    ORDER BY COALESCE(h.valid_time, h.observed_time, h.time_index) DESC
    LIMIT $${values.length}
  `;
  const result = await getWeatherIntelPool().query(sql, values);
  return result.rows;
}

async function queryPointTimeSeries(table, options = {}) {
  const limit = parseLimit(options.limit);
  const where = [];
  const values = [];
  addOptionalFilter(where, values, 't.parameter_id', options.parameter);
  addOptionalFilter(where, values, 't.source_id', options.source);
  values.push(limit);
  const sql = `
    SELECT
      t.record_id,
      t.parameter_id,
      COALESCE(p.display_name, t.parameter_id) AS display_name,
      t.source_id,
      s.source_name,
      t.station_id,
      t.value,
      t.unit,
      t.original_value,
      t.original_unit,
      t.latitude,
      t.longitude,
      ST_AsGeoJSON(t.geom)::jsonb AS geometry,
      t.h3_res6,
      t.h3_res7,
      t.observed_time,
      t.valid_time,
      t.forecast_time,
      t.time_index,
      t.confidence_score,
      t.quality_flag,
      ${ageSecondsExpression('COALESCE(t.valid_time, t.observed_time, t.time_index)')} AS freshness_age_seconds,
      ${sourceLineageSelect('r')},
      t.payload
    FROM ${table} t
    JOIN source_raw_files r ON r.raw_file_id = t.raw_file_id
    LEFT JOIN parameter_registry p ON p.parameter_id = t.parameter_id
    LEFT JOIN sources s ON s.source_id = t.source_id
    ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
    ORDER BY t.time_index DESC
    LIMIT $${values.length}
  `;
  const result = await getWeatherIntelPool().query(sql, values);
  return result.rows;
}

export function queryLatestAirQuality(options = {}) {
  return queryPointTimeSeries('air_quality_time_series', options);
}

export function queryLatestHydrology(options = {}) {
  return queryPointTimeSeries('hydrology_time_series', options);
}

export async function querySourceHealth(options = {}) {
  const limit = parseLimit(options.limit, 100);
  const sql = `
    SELECT
      r.source_id,
      COALESCE(s.source_name, r.source_id) AS source_name,
      COALESCE(s.source_family, 'unknown') AS source_family,
      count(*)::integer AS raw_file_count,
      count(*) FILTER (WHERE r.status = 'success')::integer AS success_count,
      count(*) FILTER (WHERE r.status = 'duplicate')::integer AS duplicate_count,
      count(*) FILTER (WHERE r.status NOT IN ('success', 'duplicate'))::integer AS failure_count,
      max(r.fetched_at) AS latest_fetched_at,
      ${ageSecondsExpression('max(r.fetched_at)')} AS latest_age_seconds,
      jsonb_agg(
        jsonb_build_object(
          'data_type', r.data_type,
          'status', r.status,
          'fetched_at', r.fetched_at,
          'raw_file_path', r.raw_file_path,
          'checksum_sha256', r.checksum_sha256
        )
        ORDER BY r.fetched_at DESC
      ) FILTER (WHERE r.raw_file_path IS NOT NULL) AS recent_files
    FROM source_raw_files r
    LEFT JOIN sources s ON s.source_id = r.source_id
    GROUP BY r.source_id, s.source_name, s.source_family
    ORDER BY latest_fetched_at DESC NULLS LAST
    LIMIT $1
  `;
  const result = await getWeatherIntelPool().query(sql, [limit]);
  return result.rows;
}

export async function queryNearbyIntel(options = {}) {
  const latitude = Number(options.latitude);
  const longitude = Number(options.longitude);
  const radiusKm = Math.min(Math.max(Number(options.radiusKm) || 100, 1), 2000);
  const limit = parseLimit(options.limit, 50);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new Error('Nearby intelligence requires numeric lat and lon query parameters.');
  }

  const values = [longitude, latitude, radiusKm * 1000, limit];
  const pointSql = `
    ST_SetSRID(ST_MakePoint($1::double precision, $2::double precision), 4326)
  `;
  const weatherSql = `
    SELECT
      b.selected_table,
      b.record_id,
      b.parameter_id,
      b.display_name,
      b.data_family,
      b.source_id,
      b.source_name,
      b.value,
      b.unit,
      b.latitude,
      b.longitude,
      ST_Distance(b.geom::geography, ${pointSql}::geography) AS distance_meters,
      b.observed_time,
      b.valid_time,
      b.time_index,
      b.confidence_score,
      b.quality_flag
    FROM best_current_values b
    WHERE b.geom IS NOT NULL
      AND ST_DWithin(b.geom::geography, ${pointSql}::geography, $3)
    ORDER BY distance_meters ASC, b.time_index DESC
    LIMIT $4
  `;
  const hazardSql = `
    SELECT
      h.record_id,
      h.parameter_id,
      h.display_name,
      h.source_id,
      h.source_name,
      h.event_type,
      h.event_id,
      h.title,
      h.hazard_type,
      h.severity,
      h.severity_score,
      h.magnitude,
      h.status,
      h.centroid_latitude AS latitude,
      h.centroid_longitude AS longitude,
      ST_Distance(h.geom::geography, ${pointSql}::geography) AS distance_meters,
      h.observed_time,
      h.valid_time,
      h.updated_time,
      h.time_index,
      h.confidence_score
    FROM latest_hazard_events h
    WHERE h.geom IS NOT NULL
      AND ST_DWithin(h.geom::geography, ${pointSql}::geography, $3)
    ORDER BY distance_meters ASC, COALESCE(h.valid_time, h.observed_time, h.time_index) DESC
    LIMIT $4
  `;

  const [valuesResult, hazardsResult] = await Promise.all([
    getWeatherIntelPool().query(weatherSql, values),
    getWeatherIntelPool().query(hazardSql, values),
  ]);

  return {
    query: {
      latitude,
      longitude,
      radiusKm,
      limit,
    },
    bestValues: valuesResult.rows,
    hazards: hazardsResult.rows,
  };
}

export async function queryIntelSummary() {
  const result = await getWeatherIntelPool().query(`
    SELECT 'weather_time_series' AS table_name, count(*)::integer AS count FROM weather_time_series
    UNION ALL SELECT 'hazard_events', count(*)::integer FROM hazard_events
    UNION ALL SELECT 'air_quality_time_series', count(*)::integer FROM air_quality_time_series
    UNION ALL SELECT 'hydrology_time_series', count(*)::integer FROM hydrology_time_series
    UNION ALL SELECT 'source_raw_files', count(*)::integer FROM source_raw_files
    UNION ALL SELECT 'best_current_values', count(*)::integer FROM best_current_values
    UNION ALL SELECT 'latest_hazard_events', count(*)::integer FROM latest_hazard_events
  `);
  return {
    generatedAt: new Date().toISOString(),
    counts: Object.fromEntries(result.rows.map((row) => [row.table_name, row.count])),
  };
}

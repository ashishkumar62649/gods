import pg from "pg";

const { Pool } = pg;

const DEFAULT_CONFIG = {
  host: process.env.PGHOST || "localhost",
  port: Number(process.env.PGPORT || process.env.GOD_EYES_DB_PORT || 55432),
  database: process.env.PGDATABASE || "god_eyes",
  user: process.env.PGUSER || "god_eyes",
  password: process.env.PGPASSWORD || process.env.GOD_EYES_DB_PASSWORD || "god_eyes_dev_password",
};

let pool;

function sanitizeJsonValue(value) {
  if (typeof value === "string") {
    return value.replace(/\u0000/g, "");
  }
  if (Array.isArray(value)) {
    return value.map(sanitizeJsonValue);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entryValue]) => [key, sanitizeJsonValue(entryValue)]),
    );
  }
  return value;
}

function jsonParam(value) {
  return JSON.stringify(sanitizeJsonValue(value || {}));
}

export function getPool() {
  if (!pool) {
    pool = new Pool(DEFAULT_CONFIG);
  }
  return pool;
}

export async function closeDb() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

export async function withTransaction(callback) {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function upsertSourceRawFile(client, record) {
  const result = await client.query(
    `
      INSERT INTO source_raw_files (
        source_id,
        source,
        folder,
        data_type,
        endpoint,
        raw_file_path,
        metadata_path,
        checksum_sha256,
        content_type,
        file_extension,
        bytes,
        fetched_at,
        http_status,
        status,
        sample_shape,
        normalization_lane,
        payload
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15::jsonb, $16, $17::jsonb
      )
      ON CONFLICT (raw_file_path) WHERE raw_file_path IS NOT NULL
      DO UPDATE SET
        source_id = EXCLUDED.source_id,
        source = EXCLUDED.source,
        folder = EXCLUDED.folder,
        data_type = EXCLUDED.data_type,
        endpoint = EXCLUDED.endpoint,
        metadata_path = EXCLUDED.metadata_path,
        checksum_sha256 = EXCLUDED.checksum_sha256,
        content_type = EXCLUDED.content_type,
        file_extension = EXCLUDED.file_extension,
        bytes = EXCLUDED.bytes,
        fetched_at = EXCLUDED.fetched_at,
        http_status = EXCLUDED.http_status,
        status = EXCLUDED.status,
        sample_shape = EXCLUDED.sample_shape,
        normalization_lane = EXCLUDED.normalization_lane,
        payload = EXCLUDED.payload,
        updated_at = now()
      RETURNING raw_file_id
    `,
    [
      record.source_id,
      record.source,
      record.folder,
      record.data_type,
      record.endpoint,
      record.raw_file_path,
      record.metadata_path,
      record.checksum_sha256,
      record.content_type,
      record.file_extension,
      record.bytes,
      record.fetched_at,
      record.http_status,
      record.status,
      jsonParam(record.sample_shape),
      record.normalization_lane,
      jsonParam(record.payload),
    ],
  );
  return result.rows[0].raw_file_id;
}

export async function createNormalizationRun(client, run) {
  const result = await client.query(
    `
      INSERT INTO normalization_runs (
        source_id,
        input_raw_file_id,
        status,
        normalizer_version,
        payload
      ) VALUES ($1, $2, 'running', $3, $4::jsonb)
      RETURNING run_id
    `,
    [
      run.source_id,
      run.input_raw_file_id,
      run.normalizer_version || "mvp_open_meteo_v1",
      jsonParam(run.payload),
    ],
  );
  return result.rows[0].run_id;
}

export async function finishNormalizationRun(client, runId, patch) {
  await client.query(
    `
      UPDATE normalization_runs
      SET
        status = $2,
        finished_at = now(),
        records_created = $3,
        records_failed = $4,
        error_message = $5
      WHERE run_id = $1
    `,
    [
      runId,
      patch.status,
      patch.records_created || 0,
      patch.records_failed || 0,
      patch.error_message || null,
    ],
  );
}

export async function insertWeatherTimeSeriesRows(client, rows) {
  let inserted = 0;
  for (const row of rows) {
    const result = await client.query(
      `
        INSERT INTO weather_time_series (
          parameter_id,
          source_id,
          value,
          unit,
          original_value,
          original_unit,
          latitude,
          longitude,
          geom,
          h3_res5,
          h3_res6,
          h3_res7,
          h3_res8,
          observed_time,
          valid_time,
          forecast_time,
          model_run_time,
          time_index,
          ingested_at,
          value_kind,
          raw_file_id,
          normalization_run_id,
          confidence_score,
          quality_flag,
          payload
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8,
          CASE WHEN $7::double precision IS NULL OR $8::double precision IS NULL
            THEN NULL
            ELSE ST_SetSRID(ST_MakePoint($8::double precision, $7::double precision), 4326)
          END,
          $9, $10, $11, $12,
          $13, $14, $15, $16, $17, $18,
          $19, $20, $21, $22, $23, $24::jsonb
        )
        ON CONFLICT DO NOTHING
        RETURNING record_id
      `,
      [
        row.parameter_id,
        row.source_id,
        row.value,
        row.unit,
        row.original_value,
        row.original_unit,
        row.latitude,
        row.longitude,
        row.h3_res5,
        row.h3_res6,
        row.h3_res7,
        row.h3_res8,
        row.observed_time,
        row.valid_time,
        row.forecast_time,
        row.model_run_time,
        row.time_index,
        row.ingested_at,
        row.value_kind,
        row.raw_file_id,
        row.normalization_run_id,
        row.confidence_score,
        row.quality_flag,
        jsonParam(row.payload),
      ],
    );
    inserted += result.rowCount;
  }
  return inserted;
}

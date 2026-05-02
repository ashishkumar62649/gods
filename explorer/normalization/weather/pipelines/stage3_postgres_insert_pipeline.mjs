import { readFile, readdir, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  closeDb,
  getPool,
  upsertSourceRawFile,
  withTransaction,
} from "../writers/postgres_writer.mjs";
import { NORMALIZED_WEATHER_ROOT, WEATHER_NORMALIZATION_DIR } from "../common/paths.mjs";

const EXPLORER_ROOT = join(WEATHER_NORMALIZATION_DIR, "..", "..");
const MIGRATION_PATH = join(EXPLORER_ROOT, "database", "postgres", "migrations", "0004_stage3_event_air_hydro.sql");
const INTELLIGENCE_VIEW_MIGRATION_PATH = join(EXPLORER_ROOT, "database", "postgres", "migrations", "0005_weather_intelligence_views.sql");
const STAGE2_SUMMARY_PATH = join(NORMALIZED_WEATHER_ROOT, "_reports", "stage2_normalization_summary.json");
const STAGE3_REPORT_ROOT = join(NORMALIZED_WEATHER_ROOT, "_reports");
const STAGE3_SUMMARY_PATH = join(STAGE3_REPORT_ROOT, "stage3_postgres_insert_summary.json");
const STAGE3_MARKDOWN_PATH = join(STAGE3_REPORT_ROOT, "stage3_postgres_insert_summary.md");

const SOURCE_DEFINITIONS = {
  open_meteo: ["Open-Meteo", "weather", "aggregator", 10],
  noaa_nws: ["NOAA/NWS API", "weather_alerts", "official", 10],
  climate_air_reference: ["Climate/Air Reference Catalogs", "climate_reference", "reference", 80],
  noaa_nodd_gfs: ["NOAA NODD/GFS", "weather_model", "official", 30],
  nasa_gibs: ["NASA GIBS", "satellite_imagery", "official", 40],
  noaa_goes: ["NOAA GOES", "satellite_imagery", "official", 40],
  nasa_firms: ["NASA FIRMS", "wildfire", "official", 10],
  usgs_earthquake: ["USGS Earthquake Hazards Program", "hazard", "official", 10],
  usgs_water: ["USGS Water Data", "hydrology", "official", 20],
  noaa_nwps: ["NOAA NWPS/NWM", "hydrology", "official", 20],
  noaa_dart: ["NOAA DART/NDBC", "ocean_tsunami", "official", 20],
  openaq: ["OpenAQ", "air_quality", "aggregator", 20],
  copernicus_land_clms: ["Copernicus Land/CLMS", "land", "official", 50],
  nasa_earthdata_modis: ["NASA Earthdata/MODIS", "satellite_land", "official", 50],
  smithsonian_gvp: ["Smithsonian GVP", "volcano_reference", "reference", 70],
  usgs_volcano: ["USGS Volcano Hazards", "volcano_alerts", "official", 20],
  gdacs: ["GDACS", "global_disaster_alerts", "official_aggregator", 20],
  worldpop: ["WorldPop", "population", "reference", 70],
};

const PARAMETER_DEFINITIONS = {
  temperature: ["temperature", "Temperature", "weather", "weather_time_series", "degC", "observation_or_forecast", "point", false, false],
  pressure: ["pressure", "Pressure", "weather", "weather_time_series", "hPa", "observation_or_forecast", "point", false, false],
  wind_speed: ["wind_speed", "Wind Speed", "weather", "weather_time_series", "m/s", "observation_or_forecast", "point", false, false],
  wind_direction: ["wind_direction", "Wind Direction", "weather", "weather_time_series", "degree", "observation_or_forecast", "point", false, false],
  rainfall: ["rainfall", "Rainfall", "weather", "weather_time_series", "mm", "observation_or_forecast", "point", false, false],
  humidity: ["humidity", "Humidity", "weather", "weather_time_series", "%", "observation_or_forecast", "point", false, false],
  earthquake_magnitude: ["earthquake_magnitude", "Earthquake Magnitude", "hazard", "hazard_events", "magnitude", "event", "point", true, false],
  meteorological_advisories: ["meteorological_advisories", "Meteorological Advisories", "hazard", "hazard_events", null, "event", "geometry", true, true],
  weather_warnings: ["weather_warnings", "Weather Warnings", "hazard", "hazard_events", null, "event", "geometry", true, true],
  weather_alerts: ["weather_alerts", "Weather Alerts", "hazard", "hazard_events", null, "event", "geometry", true, true],
  flood_warnings: ["flood_warnings", "Flood Warnings", "hazard", "hazard_events", null, "event", "geometry", true, true],
  weather_watches: ["weather_watches", "Weather Watches", "hazard", "hazard_events", null, "event", "geometry", true, true],
  cyclone_location: ["cyclone_location", "Cyclone Location", "hazard", "hazard_events", null, "event", "point", true, false],
  volcanic_eruption_event: ["volcanic_eruption_event", "Volcanic Eruption Event", "hazard", "hazard_events", null, "event", "point", true, false],
  active_fire_location: ["active_fire_location", "Active Fire Location", "hazard", "hazard_events", null, "event", "point", true, false],
  pm25: ["pm25", "PM2.5", "air_quality", "air_quality_time_series", "ug_m3", "observation", "point", false, false],
  pm10: ["pm10", "PM10", "air_quality", "air_quality_time_series", "ug_m3", "observation", "point", false, false],
  ozone: ["ozone", "Ozone", "air_quality", "air_quality_time_series", "ug_m3", "observation", "point", false, false],
  nitrogen_dioxide: ["nitrogen_dioxide", "Nitrogen Dioxide", "air_quality", "air_quality_time_series", "ug_m3", "observation", "point", false, false],
  sulfur_dioxide: ["sulfur_dioxide", "Sulfur Dioxide", "air_quality", "air_quality_time_series", "ug_m3", "observation", "point", false, false],
  carbon_monoxide: ["carbon_monoxide", "Carbon Monoxide", "air_quality", "air_quality_time_series", "ug_m3", "observation", "point", false, false],
  river_discharge: ["river_discharge", "River Discharge", "hydrology", "hydrology_time_series", "ft3/s", "observation", "point", false, false],
  stream_gauge_level: ["stream_gauge_level", "Stream Gauge Level", "hydrology", "hydrology_time_series", "ft", "observation", "point", false, false],
  river_level: ["river_level", "River Level", "hydrology", "hydrology_time_series", null, "observation", "point", false, false],
  ocean_water_level: ["ocean_water_level", "Ocean Water Level", "hydrology", "hydrology_time_series", "m", "observation", "point", false, false],
};

function jsonParam(value) {
  return JSON.stringify(value || {});
}

async function latestJsonl(folderName) {
  const folder = join(NORMALIZED_WEATHER_ROOT, folderName);
  const files = (await readdir(folder, { withFileTypes: true }))
    .filter((item) => item.isFile() && item.name.endsWith(".jsonl"))
    .map((item) => join(folder, item.name));
  if (!files.length) throw new Error(`No JSONL files found in ${folder}`);
  const stats = await Promise.all(files.map(async (path) => ({ path, mtimeMs: (await import("node:fs/promises")).stat(path).then((s) => s.mtimeMs) })));
  const resolved = [];
  for (const item of stats) resolved.push({ path: item.path, mtimeMs: await item.mtimeMs });
  return resolved.sort((a, b) => b.mtimeMs - a.mtimeMs)[0].path;
}

async function readJsonl(path) {
  const text = await readFile(path, "utf8");
  if (!text.trim()) return [];
  return text.trim().split(/\r?\n/).map((line) => JSON.parse(line));
}

async function resolveStage2Paths() {
  if (existsSync(STAGE2_SUMMARY_PATH)) {
    const summary = JSON.parse(await readFile(STAGE2_SUMMARY_PATH, "utf8"));
    return Object.fromEntries(Object.entries(summary.outputs).map(([family, details]) => [family, details.path]));
  }
  return {
    source_raw_files: await latestJsonl("source_raw_files"),
    weather_time_series: await latestJsonl("weather_time_series"),
    hazard_events: await latestJsonl("hazard_events"),
    air_quality_time_series: await latestJsonl("air_quality_time_series"),
    hydrology_time_series: await latestJsonl("hydrology_time_series"),
  };
}

async function applyStage3Migration(client) {
  await client.query(await readFile(MIGRATION_PATH, "utf8"));
  if (existsSync(INTELLIGENCE_VIEW_MIGRATION_PATH)) {
    await client.query(await readFile(INTELLIGENCE_VIEW_MIGRATION_PATH, "utf8"));
  }
}

async function ensureSources(client, sourceIds) {
  for (const sourceId of sourceIds) {
    const [name, family, authority, priority] = SOURCE_DEFINITIONS[sourceId] || [sourceId, "unknown", "reference", 100];
    await client.query(
      `
        INSERT INTO sources (
          source_id, source_name, source_family, authority_level, access_type,
          base_reliability, priority_current, enabled, notes
        ) VALUES ($1, $2, $3, $4, 'open', 0.700, $5, true, 'Stage 3 JSONL loader seed.')
        ON CONFLICT (source_id) DO UPDATE SET
          source_name = EXCLUDED.source_name,
          source_family = EXCLUDED.source_family,
          authority_level = EXCLUDED.authority_level,
          priority_current = EXCLUDED.priority_current,
          enabled = true
      `,
      [sourceId, name, family, authority, priority],
    );
  }
}

async function ensureParameters(client, parameterIds) {
  for (const parameterId of parameterIds) {
    const definition = PARAMETER_DEFINITIONS[parameterId] || [
      parameterId,
      parameterId.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()),
      "unknown",
      "unknown",
      null,
      "observation",
      "point",
      false,
      false,
    ];
    const [canonicalName, displayName, category, dataFamily, unit, valueKind, geometryKind, isEvent, isAlert] = definition;
    await client.query(
      `
        INSERT INTO parameter_registry (
          parameter_id, canonical_name, display_name, category, data_family,
          canonical_unit, value_kind, geometry_kind, storage_target, is_direct,
          is_derived, is_grid, is_event, is_alert, is_visual, notes
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, 'postgres', true,
          false, false, $9, $10, false, 'Stage 3 JSONL loader seed.'
        )
        ON CONFLICT (parameter_id) DO UPDATE SET
          canonical_name = EXCLUDED.canonical_name,
          display_name = EXCLUDED.display_name,
          category = EXCLUDED.category,
          data_family = EXCLUDED.data_family,
          canonical_unit = COALESCE(parameter_registry.canonical_unit, EXCLUDED.canonical_unit),
          value_kind = EXCLUDED.value_kind,
          geometry_kind = EXCLUDED.geometry_kind,
          is_event = EXCLUDED.is_event,
          is_alert = EXCLUDED.is_alert
      `,
      [parameterId, canonicalName, displayName, category, dataFamily, unit, valueKind, geometryKind, isEvent, isAlert],
    );
  }
}

async function createStage3Run(client, sourceRawFilesPath) {
  const result = await client.query(
    `
      INSERT INTO normalization_runs (
        source_id,
        input_raw_file_id,
        status,
        normalizer_version,
        payload
      ) VALUES (
        NULL,
        NULL,
        'running',
        'stage3_jsonl_postgres_v1',
        $1::jsonb
      )
      RETURNING run_id
    `,
    [jsonParam({ source_raw_files_path: sourceRawFilesPath })],
  );
  return result.rows[0].run_id;
}

async function finishStage3Run(client, runId, status, counts, errorMessage = null) {
  const recordsCreated = Object.values(counts).reduce((sum, count) => sum + count, 0);
  await client.query(
    `
      UPDATE normalization_runs
      SET
        status = $2,
        finished_at = now(),
        records_created = $3,
        records_failed = 0,
        error_message = $4,
        payload = payload || $5::jsonb
      WHERE run_id = $1
    `,
    [runId, status, recordsCreated, errorMessage, jsonParam({ inserted_counts: counts })],
  );
}

async function registerRawFiles(client, sourceRawFiles) {
  const idsByPath = new Map();
  for (const record of sourceRawFiles) {
    const rawFileId = await upsertSourceRawFile(client, record);
    idsByPath.set(record.raw_file_path, rawFileId);
  }
  return idsByPath;
}

function rawFileIdFor(row, idsByPath) {
  const rawFileId = idsByPath.get(row.raw_file_path);
  if (!rawFileId) throw new Error(`No raw_file_id resolved for ${row.raw_file_path}`);
  return rawFileId;
}

function geometryParam(row) {
  return row.geometry ? jsonParam(to2dGeometry(row.geometry)) : null;
}

function to2dGeometry(geometry) {
  if (!geometry?.type || !geometry.coordinates) return geometry || null;
  function strip(value) {
    if (!Array.isArray(value)) return value;
    if (value.length >= 2 && typeof value[0] === "number" && typeof value[1] === "number") {
      return [value[0], value[1]];
    }
    return value.map(strip);
  }
  return {
    ...geometry,
    coordinates: strip(geometry.coordinates),
  };
}

async function insertWeatherRows(client, rows, idsByPath, runId) {
  let inserted = 0;
  for (const row of rows) {
    const result = await client.query(
      `
        INSERT INTO weather_time_series (
          parameter_id, source_id, value, unit, original_value, original_unit,
          latitude, longitude, geom, h3_res5, h3_res6, h3_res7, h3_res8,
          observed_time, valid_time, forecast_time, model_run_time, time_index,
          ingested_at, value_kind, raw_file_id, normalization_run_id,
          confidence_score, quality_flag, payload
        ) VALUES (
          $1, $2, $3, $4, $5, $6,
          $7, $8,
          CASE WHEN $7::double precision IS NULL OR $8::double precision IS NULL
            THEN NULL
            ELSE ST_SetSRID(ST_MakePoint($8::double precision, $7::double precision), 4326)
          END,
          $9, $10, $11, $12,
          $13, $14, $15, $16, $17,
          $18, $19, $20, $21,
          $22, $23, $24::jsonb
        )
        ON CONFLICT DO NOTHING
      `,
      [
        row.parameter_id, row.source_id, row.value, row.unit, row.original_value, row.original_unit,
        row.latitude, row.longitude,
        row.h3_res5 || row.h3_res_5, row.h3_res6 || row.h3_res_6, row.h3_res7 || row.h3_res_7, row.h3_res8 || row.h3_res_8,
        row.observed_time, row.valid_time, row.forecast_time, row.model_run_time, row.time_index,
        row.ingested_at, row.value_kind || "observation", rawFileIdFor(row, idsByPath), runId,
        row.confidence_score, row.quality_flag, jsonParam(row.payload),
      ],
    );
    inserted += result.rowCount;
  }
  return inserted;
}

async function insertHazardRows(client, rows, idsByPath, runId) {
  let inserted = 0;
  for (const row of rows) {
    const result = await client.query(
      `
        INSERT INTO hazard_events (
          parameter_id, source_id, event_type, event_id, source_event_id,
          title, description, hazard_type, severity, severity_score, magnitude,
          category, status, started_at, observed_time, valid_time, forecast_time,
          model_run_time, issued_time, updated_time, ended_at, expires_time, time_index,
          centroid_latitude, centroid_longitude, latitude, longitude, geom,
          h3_res5, h3_res6, h3_res7, h3_res8, value, unit,
          raw_file_id, normalization_run_id, confidence_score, quality_flag, payload
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, $9, $10, $11,
          $12, $13, $14, $15, $16, $17,
          $18, $19, $20, $21, $22, $23,
          $24, $25, $26, $27,
          CASE WHEN $28::jsonb IS NULL THEN NULL ELSE ST_SetSRID(ST_GeomFromGeoJSON($28::text), 4326) END,
          $29, $30, $31, $32, $33, $34,
          $35, $36, $37, $38, $39::jsonb
        )
        ON CONFLICT DO NOTHING
      `,
      [
        row.parameter_id, row.source_id, row.event_type, row.event_id || null, row.source_event_id || null,
        row.title || null, row.description || null, row.hazard_type || null, row.severity || null, row.severity_score ?? null, row.magnitude ?? null,
        row.category || null, row.status || null, row.started_at || null, row.observed_time || null, row.valid_time || null, row.forecast_time || null,
        row.model_run_time || null, row.issued_time || null, row.updated_time || null, row.ended_at || null, row.expires_time || null, row.time_index || row.valid_time || row.observed_time,
        row.centroid_latitude ?? row.latitude ?? null, row.centroid_longitude ?? row.longitude ?? null, row.latitude ?? row.centroid_latitude ?? null, row.longitude ?? row.centroid_longitude ?? null,
        geometryParam(row),
        row.h3_res5 || row.h3_res_5, row.h3_res6 || row.h3_res_6, row.h3_res7 || row.h3_res_7, row.h3_res8 || row.h3_res_8, row.value ?? null, row.unit || null,
        rawFileIdFor(row, idsByPath), runId, row.confidence_score ?? null, row.quality_flag || null, jsonParam(row.payload),
      ],
    );
    inserted += result.rowCount;
  }
  return inserted;
}

async function insertPointTimeSeries(client, tableName, rows, idsByPath, runId) {
  let inserted = 0;
  for (const row of rows) {
    const result = await client.query(
      `
        INSERT INTO ${tableName} (
          parameter_id, source_id, station_id, value, unit, original_value, original_unit,
          latitude, longitude, geom, h3_res5, h3_res6, h3_res7, h3_res8,
          observed_time, valid_time, forecast_time, model_run_time, time_index,
          ingested_at, raw_file_id, normalization_run_id, confidence_score, quality_flag, payload
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7,
          $8, $9,
          CASE WHEN $8::double precision IS NULL OR $9::double precision IS NULL
            THEN NULL
            ELSE ST_SetSRID(ST_MakePoint($9::double precision, $8::double precision), 4326)
          END,
          $10, $11, $12, $13,
          $14, $15, $16, $17, $18,
          $19, $20, $21, $22, $23, $24::jsonb
        )
        ON CONFLICT DO NOTHING
      `,
      [
        row.parameter_id, row.source_id, row.station_id || null, row.value, row.unit, row.original_value, row.original_unit,
        row.latitude, row.longitude,
        row.h3_res5 || row.h3_res_5, row.h3_res6 || row.h3_res_6, row.h3_res7 || row.h3_res_7, row.h3_res8 || row.h3_res_8,
        row.observed_time, row.valid_time, row.forecast_time, row.model_run_time, row.time_index,
        row.ingested_at, rawFileIdFor(row, idsByPath), runId, row.confidence_score, row.quality_flag, jsonParam(row.payload),
      ],
    );
    inserted += result.rowCount;
  }
  return inserted;
}

function collectIds(...rowSets) {
  const sourceIds = new Set();
  const parameterIds = new Set();
  for (const rows of rowSets) {
    for (const row of rows) {
      if (row.source_id) sourceIds.add(row.source_id);
      if (row.parameter_id) parameterIds.add(row.parameter_id);
    }
  }
  return { sourceIds: [...sourceIds], parameterIds: [...parameterIds] };
}

async function tableCounts(client) {
  const tables = ["source_raw_files", "weather_time_series", "hazard_events", "air_quality_time_series", "hydrology_time_series"];
  const counts = {};
  for (const table of tables) {
    const result = await client.query(`SELECT count(*)::integer AS count FROM ${table}`);
    counts[table] = result.rows[0].count;
  }
  return counts;
}

function markdownSummary(summary) {
  return [
    "# Stage 3 PostgreSQL Insert Summary",
    "",
    `Generated: ${summary.generatedAt}`,
    `Run ID: ${summary.runId}`,
    "",
    "| Table | Inserted This Run | Total Rows |",
    "| --- | ---: | ---: |",
    `| source_raw_files | ${summary.inserted.source_raw_files} | ${summary.tableCounts.source_raw_files} |`,
    `| weather_time_series | ${summary.inserted.weather_time_series} | ${summary.tableCounts.weather_time_series} |`,
    `| hazard_events | ${summary.inserted.hazard_events} | ${summary.tableCounts.hazard_events} |`,
    `| air_quality_time_series | ${summary.inserted.air_quality_time_series} | ${summary.tableCounts.air_quality_time_series} |`,
    `| hydrology_time_series | ${summary.inserted.hydrology_time_series} | ${summary.tableCounts.hydrology_time_series} |`,
    "",
  ].join("\n");
}

export async function runStage3PostgresInsert() {
  const paths = await resolveStage2Paths();
  const sourceRawFiles = await readJsonl(paths.source_raw_files);
  const weatherRows = await readJsonl(paths.weather_time_series);
  const hazardRows = await readJsonl(paths.hazard_events);
  const airRows = await readJsonl(paths.air_quality_time_series);
  const hydroRows = await readJsonl(paths.hydrology_time_series);
  const { sourceIds, parameterIds } = collectIds(sourceRawFiles, weatherRows, hazardRows, airRows, hydroRows);

  const summary = await withTransaction(async (client) => {
    await applyStage3Migration(client);
    await ensureSources(client, sourceIds);
    await ensureParameters(client, parameterIds);
    const runId = await createStage3Run(client, paths.source_raw_files);
    const idsByPath = await registerRawFiles(client, sourceRawFiles);
    const inserted = {
      source_raw_files: idsByPath.size,
      weather_time_series: await insertWeatherRows(client, weatherRows, idsByPath, runId),
      hazard_events: await insertHazardRows(client, hazardRows, idsByPath, runId),
      air_quality_time_series: await insertPointTimeSeries(client, "air_quality_time_series", airRows, idsByPath, runId),
      hydrology_time_series: await insertPointTimeSeries(client, "hydrology_time_series", hydroRows, idsByPath, runId),
    };
    await finishStage3Run(client, runId, "success", inserted);
    return {
      generatedAt: new Date().toISOString(),
      runId,
      paths,
      inputCounts: {
        source_raw_files: sourceRawFiles.length,
        weather_time_series: weatherRows.length,
        hazard_events: hazardRows.length,
        air_quality_time_series: airRows.length,
        hydrology_time_series: hydroRows.length,
      },
      inserted,
      tableCounts: await tableCounts(client),
    };
  });

  await mkdir(STAGE3_REPORT_ROOT, { recursive: true });
  await writeFile(STAGE3_SUMMARY_PATH, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  await writeFile(STAGE3_MARKDOWN_PATH, markdownSummary(summary), "utf8");
  return summary;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    console.log(JSON.stringify(await runStage3PostgresInsert(), null, 2));
  } finally {
    await closeDb();
  }
}

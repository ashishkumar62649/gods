import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import pg from "pg";

const { Pool } = pg;
const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const EXPLORER_ROOT = join(SCRIPT_DIR, "..");
const REPORT_PATH = join(EXPLORER_ROOT, "pipelines", "weather", "reports", "weather_pipeline_report.md");
const RAW_REPORT_ROOT = join(EXPLORER_ROOT, "data_raw", "weather", "_reports");
const NORMALIZED_REPORT_ROOT = join(EXPLORER_ROOT, "data_normalized", "weather", "_reports");

function dbConfig() {
  return {
    host: process.env.PGHOST || "localhost",
    port: Number(process.env.PGPORT || process.env.GOD_EYES_DB_PORT || 55432),
    database: process.env.PGDATABASE || "god_eyes",
    user: process.env.PGUSER || "god_eyes",
    password: process.env.PGPASSWORD || process.env.GOD_EYES_DB_PASSWORD || "god_eyes_dev_password",
  };
}

async function readJsonIfExists(path) {
  if (!existsSync(path)) return null;
  return JSON.parse(await readFile(path, "utf8"));
}

async function dbSnapshot() {
  const pool = new Pool(dbConfig());
  try {
    const counts = await pool.query(`
      SELECT 'source_raw_files' AS name, count(*)::integer AS count FROM source_raw_files
      UNION ALL SELECT 'weather_time_series', count(*)::integer FROM weather_time_series
      UNION ALL SELECT 'hazard_events', count(*)::integer FROM hazard_events
      UNION ALL SELECT 'air_quality_time_series', count(*)::integer FROM air_quality_time_series
      UNION ALL SELECT 'hydrology_time_series', count(*)::integer FROM hydrology_time_series
      UNION ALL SELECT 'best_current_values', count(*)::integer FROM best_current_values
      UNION ALL SELECT 'latest_hazard_events', count(*)::integer FROM latest_hazard_events
    `);
    const health = await pool.query(`
      SELECT source_id, source_name, operational_status, success_count, failure_count, latest_fetched_at
      FROM source_operational_health
      ORDER BY latest_fetched_at DESC NULLS LAST
      LIMIT 12
    `);
    return {
      connected: true,
      counts: Object.fromEntries(counts.rows.map((row) => [row.name, row.count])),
      health: health.rows,
    };
  } catch (error) {
    return {
      connected: false,
      error: error instanceof Error ? error.message : String(error),
      counts: {},
      health: [],
    };
  } finally {
    await pool.end();
  }
}

function tableFromObject(object) {
  return Object.entries(object)
    .map(([key, value]) => `| ${key} | ${Number(value).toLocaleString()} |`)
    .join("\n");
}

function sourceRows(sourceReports = []) {
  return sourceReports
    .map((source) => `| ${source.tier} | ${source.canonicalId} | ${source.operationalStatus} | ${source.successLikeCount ?? 0} | ${source.fetcherFile} |`)
    .join("\n");
}

function healthRows(rows = []) {
  return rows
    .map((row) => `| ${row.source_id} | ${row.operational_status} | ${row.success_count} | ${row.failure_count} | ${row.latest_fetched_at || ""} |`)
    .join("\n");
}

export async function writeWeatherStageReport() {
  const [stage1, stage2, stage3, tiered] = await Promise.all([
    readJsonIfExists(join(RAW_REPORT_ROOT, "stage1_source_health.json")),
    readJsonIfExists(join(NORMALIZED_REPORT_ROOT, "stage2_normalization_summary.json")),
    readJsonIfExists(join(NORMALIZED_REPORT_ROOT, "stage3_postgres_insert_summary.json")),
    readJsonIfExists(join(RAW_REPORT_ROOT, "tiered_last_run.json")),
  ]);
  const database = await dbSnapshot();
  const sourceReports = stage1?.sourceReports || [];
  const working = sourceReports.filter((source) => source.operationalStatus === "working").length;
  const catalogOnly = sourceReports.filter((source) => source.operationalStatus === "catalog_only").length;
  const partial = sourceReports.filter((source) => source.operationalStatus === "partial").length;
  const blocked = sourceReports.filter((source) => source.operationalStatus === "credential_required").length;
  const broken = sourceReports.filter((source) => source.operationalStatus === "broken_feed").length;

  const markdown = [
    "# Weather Pipeline Stage 3-7 Report",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "## Stage 3 - Expanded Normalization",
    "",
    "Expanded normalizers now cover Open-Meteo, USGS Earthquake, NOAA/NWS alerts, GDACS, OpenAQ, USGS Water, NASA FIRMS, NOAA/NWPS, NOAA DART, and USGS Volcano.",
    "",
    "| Family | Latest JSONL Rows |",
    "| --- | ---: |",
    ...(stage2 ? Object.entries(stage2.outputs).map(([family, details]) => `| ${family} | ${details.count.toLocaleString()} |`) : ["| not available | 0 |"]),
    "",
    `Rejected rows: ${stage2?.rejectedCount ?? "not available"}`,
    "",
    "## Stage 4 - Database Model",
    "",
    "Added `0005_weather_intelligence_views.sql` with source-aware current-value and source-health views.",
    "",
    "| Database Object | Rows |",
    "| --- | ---: |",
    database.connected ? tableFromObject(database.counts) : `| database_error | ${database.error} |`,
    "",
    "## Stage 5 - Query/API Layer",
    "",
    "API now includes table reads plus `best-current` and `nearby` intelligence endpoints.",
    "",
    "- `/api/intel/best-current`",
    "- `/api/intel/nearby?lat=38.95&lon=-77.13&radiusKm=250`",
    "- `/api/intel/source-health`",
    "",
    "## Stage 6 - Five-Tier Fetching",
    "",
    "Tiered fetch command is available through `npm run fetch:weather:tier -- --tier N`, plus direct tier scripts.",
    "",
    tiered
      ? `Latest tiered run: tier ${tiered.tier || "custom"}, selected ${tiered.selectedCount}, dryRun=${tiered.dryRun}`
      : "Latest tiered run: not run yet",
    "",
    "## Stage 7 - Production Workflow",
    "",
    "- `npm run fetch:weather:tier1` through `npm run fetch:weather:tier5`",
    "- `npm run normalize:weather:stage2`",
    "- `npm run insert:weather:stage3`",
    "- `npm run db:weather:views`",
    "- `npm run report:weather`",
    "- `npm run weather:refresh`",
    "",
    "## Source Health",
    "",
    `Canonical sources: ${sourceReports.length}; working=${working}, catalog_only=${catalogOnly}, partial=${partial}, credential_required=${blocked}, broken=${broken}`,
    "",
    "| Tier | Source | Status | Success-like | Fetcher |",
    "| --- | --- | --- | ---: | --- |",
    sourceRows(sourceReports),
    "",
    "## Database Source Health",
    "",
    "| Source | Status | Success | Failure | Latest Fetch |",
    "| --- | --- | ---: | ---: | --- |",
    healthRows(database.health),
    "",
    "## Stage 3 Insert",
    "",
    stage3
      ? `Latest Stage 3 run ${stage3.runId}: inserted ${Object.values(stage3.inserted).reduce((sum, value) => sum + value, 0).toLocaleString()} rows/files.`
      : "No Stage 3 summary found.",
    "",
  ].join("\n");

  await mkdir(dirname(REPORT_PATH), { recursive: true });
  await writeFile(REPORT_PATH, markdown, "utf8");
  return { reportPath: REPORT_PATH };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  console.log(JSON.stringify(await writeWeatherStageReport(), null, 2));
}

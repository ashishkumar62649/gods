import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { closeDb, getPool } from "../writers/postgres_writer.mjs";
import { WEATHER_NORMALIZATION_DIR } from "../common/paths.mjs";

const EXPLORER_ROOT = join(WEATHER_NORMALIZATION_DIR, "..", "..");
const MIGRATION_PATH = join(EXPLORER_ROOT, "database", "postgres", "migrations", "0005_weather_intelligence_views.sql");

export async function applyWeatherIntelligenceViews() {
  const pool = getPool();
  await pool.query(await readFile(MIGRATION_PATH, "utf8"));
  const result = await pool.query(`
    SELECT table_name, table_type
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN ('best_current_values', 'latest_hazard_events', 'source_operational_health')
    ORDER BY table_name
  `);
  return {
    appliedAt: new Date().toISOString(),
    migrationPath: MIGRATION_PATH,
    views: result.rows,
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    console.log(JSON.stringify(await applyWeatherIntelligenceViews(), null, 2));
  } finally {
    await closeDb();
  }
}

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const COMMON_DIR = dirname(fileURLToPath(import.meta.url));
export const WEATHER_NORMALIZATION_DIR = join(COMMON_DIR, "..");
export const EXPLORER_ROOT = join(COMMON_DIR, "..", "..", "..");
export const RAW_WEATHER_ROOT = join(EXPLORER_ROOT, "data_raw", "weather");
export const NORMALIZED_WEATHER_ROOT = join(EXPLORER_ROOT, "data_normalized", "weather");
export const PROCESSED_WEATHER_ROOT = join(EXPLORER_ROOT, "data_processed", "weather");
export const WEATHER_FETCH_LOG_PATH = join(RAW_WEATHER_ROOT, "fetch_log.jsonl");

export function normalizedOutputPath(recordFamily, runStamp) {
  return join(NORMALIZED_WEATHER_ROOT, recordFamily, `${recordFamily}_${runStamp}.jsonl`);
}

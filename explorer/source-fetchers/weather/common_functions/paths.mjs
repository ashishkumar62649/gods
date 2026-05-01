import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { safeName, normalizeExtension } from "./names.mjs";
import { utcPartitionParts, utcStamp } from "./time.mjs";

const COMMON_DIR = dirname(fileURLToPath(import.meta.url));
export const WEATHER_FETCHERS_DIR = join(COMMON_DIR, "..");
export const SOURCE_FETCHERS_DIR = join(COMMON_DIR, "..", "..");
export const EXPLORER_ROOT = join(COMMON_DIR, "..", "..", "..");
export const RAW_ROOT = join(EXPLORER_ROOT, "data_raw", "weather");
export const FETCH_LOG_PATH = join(RAW_ROOT, "fetch_log.jsonl");

export function outputDir(feed, fetchedAt = new Date()) {
  return join(RAW_ROOT, safeName(feed.source), safeName(feed.folder), ...utcPartitionParts(fetchedAt));
}

export function outputFilename(feed, fetchedAt = new Date(), extension = feed.extension || "raw") {
  const stamp = utcStamp(fetchedAt);
  return `${safeName(feed.source)}_${safeName(feed.dataType)}_${stamp.file}.${normalizeExtension(extension)}`;
}

export function outputPath(feed, fetchedAt = new Date(), extension = feed.extension || "raw") {
  return join(outputDir(feed, fetchedAt), outputFilename(feed, fetchedAt, extension));
}

export function tempOutputPath(feed, fetchedAt = new Date()) {
  return outputPath(feed, fetchedAt, `part-${process.pid}`);
}

export function metadataPathForRaw(rawFilePath) {
  return `${rawFilePath}.metadata.json`;
}
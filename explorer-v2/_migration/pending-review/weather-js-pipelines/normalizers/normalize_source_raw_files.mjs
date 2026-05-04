import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { classifyNormalizationLane, targetTableForLane } from "./common/normalization_contract.mjs";
import { WEATHER_FETCH_LOG_PATH, normalizedOutputPath } from "./common/paths.mjs";
import { writeJsonl } from "./common/jsonl_writer.mjs";
import { fileExtension, safeJsonParse, toExplorerRelativePath } from "./common/raw_files.mjs";
import { upsertSourceRawFile, withTransaction } from "./writers/postgres_writer.mjs";

function runStamp(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, "-");
}

function toSourceRawFileRecord(entry) {
  const normalizationLane = classifyNormalizationLane(entry);
  const rawFilePath = toExplorerRelativePath(entry.rawFilePath || entry.existingFilePath);
  const metadataPath = toExplorerRelativePath(entry.metadataPath);
  return {
    source_id: entry.source,
    source: entry.source,
    source_family: null,
    folder: entry.folder || null,
    data_type: entry.dataType || "unknown",
    normalization_lane: normalizationLane,
    target_table: targetTableForLane(normalizationLane),
    expected_format: entry.expectedFormat || null,
    endpoint: entry.endpoint || null,
    fetched_at: entry.fetchedAt || null,
    ingested_at: new Date().toISOString(),
    status: entry.status,
    http_status: entry.httpStatus || null,
    content_type: entry.contentType || null,
    bytes: entry.bytes || null,
    checksum_sha256: entry.checksumSha256 || null,
    raw_file_path: rawFilePath,
    metadata_path: metadataPath,
    file_extension: fileExtension(rawFilePath),
    sample_shape: entry.sampleShape || {},
    payload: {
      expected: entry.expected || null,
      duration_ms: entry.durationMs || null,
      retry_count: entry.retryCount || 0,
      rate_limit_used: entry.rateLimitUsed || null,
      expected_format: entry.expectedFormat || null,
      target_table: targetTableForLane(normalizationLane),
      existing_file_path: toExplorerRelativePath(entry.existingFilePath),
    },
  };
}

async function loadFetchLog(path = WEATHER_FETCH_LOG_PATH) {
  const text = await readFile(path, "utf8");
  return text
    .split(/\r?\n/)
    .filter(Boolean)
    .map(safeJsonParse)
    .filter(Boolean);
}

export async function normalizeSourceRawFiles({
  fetchLogPath = WEATHER_FETCH_LOG_PATH,
  stamp = runStamp(),
  writeDatabase = false,
} = {}) {
  const entries = await loadFetchLog(fetchLogPath);
  const recordsByRawPath = new Map();
  for (const record of entries
    .filter((entry) => entry.rawFilePath || entry.existingFilePath)
    .map(toSourceRawFileRecord)) {
    const key = record.raw_file_path || `${record.source_id}:${record.data_type}:${record.checksum_sha256}`;
    if (!recordsByRawPath.has(key) || recordsByRawPath.get(key).status !== "success") {
      recordsByRawPath.set(key, record);
    }
  }
  const records = [...recordsByRawPath.values()];
  const outputPath = normalizedOutputPath("source_raw_files", stamp);
  await writeJsonl(outputPath, records);
  let rawFileIdsByPath = new Map();
  if (writeDatabase) {
    rawFileIdsByPath = await withTransaction(async (client) => {
      const ids = new Map();
      for (const record of records) {
        const rawFileId = await upsertSourceRawFile(client, record);
        ids.set(record.raw_file_path, rawFileId);
      }
      return ids;
    });
  }
  return {
    inputCount: entries.length,
    outputCount: records.length,
    outputPath,
    records,
    rawFileIdsByPath,
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const result = await normalizeSourceRawFiles({ writeDatabase: process.argv.includes("--db") });
  console.log(JSON.stringify(result, null, 2));
}

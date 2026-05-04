import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { normalizeSourceRawFiles } from "../normalize_source_raw_files.mjs";
import { normalizedOutputPath, EXPLORER_ROOT } from "../common/paths.mjs";
import { toAbsoluteExplorerPath } from "../common/raw_files.mjs";
import { writeJsonl } from "../common/jsonl_writer.mjs";
import {
  closeDb,
  createNormalizationRun,
  finishNormalizationRun,
  insertWeatherTimeSeriesRows,
  withTransaction,
} from "../writers/postgres_writer.mjs";
import { normalizeOpenMeteoFile } from "../adapters/open_meteo_adapter.mjs";

function runStamp(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, "-");
}

function pickOpenMeteoRawFile(records, rawFileIdsByPath) {
  return records.find((record) => (
    record.source_id === "open_meteo"
    && record.status === "success"
    && record.raw_file_path
    && record.raw_file_path.endsWith(".json")
    && rawFileIdsByPath.has(record.raw_file_path)
  ));
}

export async function runOpenMeteoMvpPipeline({ stamp = runStamp() } = {}) {
  const rawRegistration = await normalizeSourceRawFiles({ stamp, writeDatabase: true });
  const rawRecord = pickOpenMeteoRawFile(rawRegistration.records, rawRegistration.rawFileIdsByPath);
  if (!rawRecord) {
    throw new Error("No registered Open-Meteo JSON raw file was found.");
  }

  const rawFileId = rawRegistration.rawFileIdsByPath.get(rawRecord.raw_file_path);
  const rawFilePath = toAbsoluteExplorerPath(rawRecord.raw_file_path);
  let runId;
  let normalizedRows = [];
  let rejectedRows = [];
  let insertedRows = 0;

  await withTransaction(async (client) => {
    runId = await createNormalizationRun(client, {
      source_id: "open_meteo",
      input_raw_file_id: rawFileId,
      normalizer_version: "mvp_open_meteo_v1",
      payload: {
        raw_file_path: rawRecord.raw_file_path,
      },
    });

    const result = await normalizeOpenMeteoFile({
      rawFilePath,
      rawFileId,
      normalizationRunId: runId,
    });
    normalizedRows = result.rows;
    rejectedRows = result.rejected;
    insertedRows = await insertWeatherTimeSeriesRows(client, normalizedRows);
    await finishNormalizationRun(client, runId, {
      status: "success",
      records_created: insertedRows,
      records_failed: rejectedRows.length,
    });
  });

  const outputPath = normalizedOutputPath("weather_time_series", stamp);
  await writeJsonl(outputPath, normalizedRows);

  return {
    runId,
    rawFileId,
    rawFilePath: join(EXPLORER_ROOT, rawRecord.raw_file_path),
    rawRegistration: {
      inputCount: rawRegistration.inputCount,
      outputCount: rawRegistration.outputCount,
      outputPath: rawRegistration.outputPath,
    },
    normalizedOutputPath: outputPath,
    normalizedRowCount: normalizedRows.length,
    rejectedRowCount: rejectedRows.length,
    insertedRowCount: insertedRows,
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    const result = await runOpenMeteoMvpPipeline();
    console.log(JSON.stringify(result, null, 2));
  } finally {
    await closeDb();
  }
}


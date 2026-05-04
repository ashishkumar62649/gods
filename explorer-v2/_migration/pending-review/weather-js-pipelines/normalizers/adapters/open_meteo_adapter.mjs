import { readJson } from "../common/raw_files.mjs";
import { h3Indexes } from "../common/h3.mjs";
import { OPEN_METEO_MVP_FIELDS, normalizeOpenMeteoValue } from "../common/open_meteo_mapping.mjs";
import { chooseTimeIndex, toUtcIso } from "../common/time.mjs";
import { validateWeatherTimeSeriesRow } from "../validators/weather_time_series_validator.mjs";

function baseContext(payload) {
  const latitude = Number(payload.latitude);
  const longitude = Number(payload.longitude);
  return {
    latitude: Number.isFinite(latitude) ? latitude : null,
    longitude: Number.isFinite(longitude) ? longitude : null,
    ...h3Indexes(latitude, longitude),
  };
}

function makeRow({
  sourceField,
  sourceSection,
  value,
  originalUnit,
  time,
  rawFileId,
  normalizationRunId,
  ingestedAt,
  context,
  payload,
}) {
  const mapping = OPEN_METEO_MVP_FIELDS[sourceField];
  if (!mapping) return null;

  const normalizedValue = normalizeOpenMeteoValue(value, originalUnit, mapping.canonical_unit);
  if (normalizedValue === null) return null;

  const validTime = toUtcIso(time);
  const observedTime = sourceSection === "current" ? validTime : null;
  const forecastTime = sourceSection === "hourly" ? validTime : null;
  const timeIndex = chooseTimeIndex({
    observed_time: observedTime,
    valid_time: validTime,
    ingested_at: ingestedAt,
  });

  return {
    parameter_id: mapping.parameter_id,
    source_id: "open_meteo",
    value: normalizedValue,
    unit: mapping.canonical_unit,
    original_value: String(value),
    original_unit: originalUnit || null,
    latitude: context.latitude,
    longitude: context.longitude,
    h3_res5: context.h3_res5,
    h3_res6: context.h3_res6,
    h3_res7: context.h3_res7,
    h3_res8: context.h3_res8,
    observed_time: observedTime,
    valid_time: validTime,
    forecast_time: forecastTime,
    model_run_time: null,
    time_index: timeIndex,
    ingested_at: ingestedAt,
    value_kind: sourceSection === "hourly" ? "forecast" : "observation",
    raw_file_id: rawFileId,
    normalization_run_id: normalizationRunId,
    confidence_score: 0.85,
    quality_flag: "mvp",
    payload: {
      source_field: sourceField,
      source_section: sourceSection,
      source_timezone: payload.timezone || null,
      elevation: payload.elevation ?? null,
      generationtime_ms: payload.generationtime_ms ?? null,
    },
  };
}

function currentRows(payload, options) {
  if (!payload.current) return [];
  const time = payload.current.time;
  return Object.entries(OPEN_METEO_MVP_FIELDS)
    .filter(([field]) => field in payload.current)
    .map(([field]) => makeRow({
      sourceField: field,
      sourceSection: "current",
      value: payload.current[field],
      originalUnit: payload.current_units?.[field] || null,
      time,
      payload,
      ...options,
    }))
    .filter(Boolean);
}

function hourlyRows(payload, options) {
  if (!payload.hourly?.time) return [];
  const rows = [];
  for (const [field] of Object.entries(OPEN_METEO_MVP_FIELDS)) {
    const values = payload.hourly[field];
    if (!Array.isArray(values)) continue;
    const originalUnit = payload.hourly_units?.[field] || null;
    for (let index = 0; index < payload.hourly.time.length; index += 1) {
      const row = makeRow({
        sourceField: field,
        sourceSection: "hourly",
        value: values[index],
        originalUnit,
        time: payload.hourly.time[index],
        payload,
        ...options,
      });
      if (row) rows.push(row);
    }
  }
  return rows;
}

function dedupeRainfall(rows) {
  const seen = new Set();
  return rows.filter((row) => {
    const key = `${row.parameter_id}:${row.time_index}:${row.value_kind}`;
    if (row.parameter_id !== "rainfall") return true;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function normalizeOpenMeteoFile({
  rawFilePath,
  rawFileId,
  normalizationRunId,
  ingestedAt = new Date().toISOString(),
}) {
  const payload = await readJson(rawFilePath);
  const context = baseContext(payload);
  const options = {
    rawFileId,
    normalizationRunId,
    ingestedAt,
    context,
  };
  const rows = dedupeRainfall([
    ...currentRows(payload, options),
    ...hourlyRows(payload, options),
  ]);

  const accepted = [];
  const rejected = [];
  for (const row of rows) {
    const validation = validateWeatherTimeSeriesRow(row);
    if (validation.ok) {
      accepted.push(row);
    } else {
      rejected.push({ row, error: validation.error });
    }
  }

  return { rows: accepted, rejected };
}


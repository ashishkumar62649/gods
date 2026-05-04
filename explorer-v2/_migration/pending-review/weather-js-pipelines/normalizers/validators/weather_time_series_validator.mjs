const REQUIRED_FIELDS = [
  "parameter_id",
  "source_id",
  "value",
  "time_index",
  "raw_file_id",
];

export function validateWeatherTimeSeriesRow(row) {
  const missing = REQUIRED_FIELDS.filter((field) => row[field] === null || row[field] === undefined || row[field] === "");
  if (missing.length > 0) {
    return { ok: false, error: `Missing required fields: ${missing.join(", ")}` };
  }
  if (!Number.isFinite(Number(row.value))) {
    return { ok: false, error: "value must be numeric" };
  }
  return { ok: true, error: null };
}


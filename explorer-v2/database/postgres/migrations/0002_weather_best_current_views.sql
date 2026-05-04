-- Derived result layer for clean API/frontend reads.
-- This is intentionally a view over evidence rows, not a replacement for them.

CREATE OR REPLACE VIEW best_weather_current AS
SELECT DISTINCT ON (w.h3_res_7, w.parameter_id)
  w.h3_res_7,
  w.parameter_id,
  w.value,
  w.unit,
  w.valid_time,
  w.observed_time,
  w.source_id,
  sr.priority_current,
  w.latitude,
  w.longitude,
  w.geom,
  w.raw_file_path,
  w.checksum_sha256,
  w.payload
FROM weather_time_series w
LEFT JOIN sources sr ON sr.source_id = w.source_id
WHERE w.h3_res_7 IS NOT NULL
  AND w.value IS NOT NULL
ORDER BY
  w.h3_res_7,
  w.parameter_id,
  COALESCE(sr.priority_current, 100) ASC,
  COALESCE(w.valid_time, w.observed_time, w.ingested_at) DESC;

CREATE OR REPLACE VIEW active_hazard_events AS
SELECT *
FROM hazard_events
WHERE COALESCE(expires_time, valid_time, observed_time, ingested_at) >= now() - interval '7 days';

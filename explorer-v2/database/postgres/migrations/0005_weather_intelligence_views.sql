-- Source-aware intelligence views for API/query reads.

CREATE INDEX IF NOT EXISTS weather_time_series_current_rank_idx
  ON weather_time_series (parameter_id, h3_res7, time_index DESC, source_id)
  WHERE h3_res7 IS NOT NULL;

CREATE INDEX IF NOT EXISTS hazard_events_current_rank_idx
  ON hazard_events (event_type, time_index DESC, source_id);

CREATE INDEX IF NOT EXISTS air_quality_time_series_current_rank_idx
  ON air_quality_time_series (parameter_id, h3_res7, time_index DESC, source_id)
  WHERE h3_res7 IS NOT NULL;

CREATE INDEX IF NOT EXISTS hydrology_time_series_current_rank_idx
  ON hydrology_time_series (parameter_id, h3_res7, time_index DESC, source_id)
  WHERE h3_res7 IS NOT NULL;

CREATE OR REPLACE VIEW best_current_values AS
WITH unified AS (
  SELECT
    'weather_time_series'::text AS selected_table,
    w.record_id,
    w.parameter_id,
    w.source_id,
    w.value,
    w.unit,
    w.latitude,
    w.longitude,
    w.geom,
    w.h3_res6,
    w.h3_res7,
    w.h3_res8,
    w.observed_time,
    w.valid_time,
    w.forecast_time,
    w.time_index,
    w.confidence_score,
    w.quality_flag,
    w.raw_file_id,
    w.payload
  FROM weather_time_series w
  WHERE w.value IS NOT NULL

  UNION ALL

  SELECT
    'air_quality_time_series'::text AS selected_table,
    a.record_id,
    a.parameter_id,
    a.source_id,
    a.value,
    a.unit,
    a.latitude,
    a.longitude,
    a.geom,
    a.h3_res6,
    a.h3_res7,
    a.h3_res8,
    a.observed_time,
    a.valid_time,
    a.forecast_time,
    a.time_index,
    a.confidence_score,
    a.quality_flag,
    a.raw_file_id,
    a.payload
  FROM air_quality_time_series a
  WHERE a.value IS NOT NULL

  UNION ALL

  SELECT
    'hydrology_time_series'::text AS selected_table,
    h.record_id,
    h.parameter_id,
    h.source_id,
    h.value,
    h.unit,
    h.latitude,
    h.longitude,
    h.geom,
    h.h3_res6,
    h.h3_res7,
    h.h3_res8,
    h.observed_time,
    h.valid_time,
    h.forecast_time,
    h.time_index,
    h.confidence_score,
    h.quality_flag,
    h.raw_file_id,
    h.payload
  FROM hydrology_time_series h
  WHERE h.value IS NOT NULL
)
SELECT DISTINCT ON (
  u.parameter_id,
  COALESCE(u.h3_res7, u.h3_res6, u.record_id::text)
)
  u.selected_table,
  u.record_id,
  u.parameter_id,
  COALESCE(p.display_name, u.parameter_id) AS display_name,
  p.category,
  p.data_family,
  u.source_id,
  COALESCE(s.source_name, u.source_id) AS source_name,
  s.source_family,
  s.authority_level,
  s.priority_current,
  u.value,
  u.unit,
  u.latitude,
  u.longitude,
  u.geom,
  u.h3_res6,
  u.h3_res7,
  u.h3_res8,
  u.observed_time,
  u.valid_time,
  u.forecast_time,
  u.time_index,
  u.confidence_score,
  u.quality_flag,
  u.raw_file_id,
  u.payload,
  now() AS selected_at
FROM unified u
LEFT JOIN sources s ON s.source_id = u.source_id
LEFT JOIN parameter_registry p ON p.parameter_id = u.parameter_id
ORDER BY
  u.parameter_id,
  COALESCE(u.h3_res7, u.h3_res6, u.record_id::text),
  COALESCE(s.priority_current, 100) ASC,
  COALESCE(u.confidence_score, 0) DESC,
  u.time_index DESC;

CREATE OR REPLACE VIEW latest_hazard_events AS
SELECT
  h.*,
  COALESCE(s.source_name, h.source_id) AS source_name,
  s.source_family,
  s.priority_current,
  COALESCE(p.display_name, h.parameter_id) AS display_name
FROM hazard_events h
LEFT JOIN sources s ON s.source_id = h.source_id
LEFT JOIN parameter_registry p ON p.parameter_id = h.parameter_id
WHERE
  COALESCE(h.expires_time, h.ended_at, h.valid_time, h.observed_time, h.time_index, h.ingested_at)
    >= now() - interval '30 days';

CREATE OR REPLACE VIEW source_operational_health AS
SELECT
  r.source_id,
  COALESCE(s.source_name, r.source_id) AS source_name,
  COALESCE(s.source_family, 'unknown') AS source_family,
  count(*)::integer AS raw_file_count,
  count(*) FILTER (WHERE r.status = 'success')::integer AS success_count,
  count(*) FILTER (WHERE r.status = 'duplicate')::integer AS duplicate_count,
  count(*) FILTER (WHERE r.status NOT IN ('success', 'duplicate'))::integer AS failure_count,
  max(r.fetched_at) AS latest_fetched_at,
  min(r.fetched_at) AS earliest_fetched_at,
  CASE
    WHEN count(*) FILTER (WHERE r.status = 'success') > 0
      AND count(*) FILTER (WHERE r.status NOT IN ('success', 'duplicate')) = 0
      THEN 'working'
    WHEN count(*) FILTER (WHERE r.status = 'success') > 0
      THEN 'partial'
    ELSE 'broken_feed'
  END AS operational_status
FROM source_raw_files r
LEFT JOIN sources s ON s.source_id = r.source_id
GROUP BY r.source_id, s.source_name, s.source_family;

-- God Eyes normalization MVP weather time-series schema.

CREATE TABLE IF NOT EXISTS weather_time_series (
  record_id uuid NOT NULL DEFAULT gen_random_uuid(),
  parameter_id text NOT NULL REFERENCES parameter_registry(parameter_id),
  source_id text NOT NULL REFERENCES sources(source_id),
  value double precision NOT NULL,
  unit text,
  original_value text,
  original_unit text,
  latitude double precision,
  longitude double precision,
  geom geometry(Point, 4326),
  h3_res5 text,
  h3_res6 text,
  h3_res7 text,
  h3_res8 text,
  observed_time timestamptz,
  valid_time timestamptz,
  forecast_time timestamptz,
  model_run_time timestamptz,
  time_index timestamptz NOT NULL,
  ingested_at timestamptz NOT NULL DEFAULT now(),
  value_kind text NOT NULL DEFAULT 'observation',
  raw_file_id uuid NOT NULL REFERENCES source_raw_files(raw_file_id),
  normalization_run_id uuid REFERENCES normalization_runs(run_id),
  confidence_score double precision,
  quality_flag text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY (record_id, time_index)
);

CREATE UNIQUE INDEX IF NOT EXISTS weather_time_series_mvp_dedupe_uidx
  ON weather_time_series (raw_file_id, parameter_id, source_id, latitude, longitude, time_index, value_kind);
CREATE INDEX IF NOT EXISTS weather_time_series_parameter_time_idx
  ON weather_time_series (parameter_id, time_index DESC);
CREATE INDEX IF NOT EXISTS weather_time_series_source_time_idx
  ON weather_time_series (source_id, time_index DESC);
CREATE INDEX IF NOT EXISTS weather_time_series_h3_res6_idx
  ON weather_time_series (h3_res6, parameter_id, time_index DESC)
  WHERE h3_res6 IS NOT NULL;
CREATE INDEX IF NOT EXISTS weather_time_series_h3_res7_idx
  ON weather_time_series (h3_res7, parameter_id, time_index DESC)
  WHERE h3_res7 IS NOT NULL;
CREATE INDEX IF NOT EXISTS weather_time_series_geom_idx
  ON weather_time_series USING gist (geom);
CREATE INDEX IF NOT EXISTS weather_time_series_payload_gin_idx
  ON weather_time_series USING gin (payload);


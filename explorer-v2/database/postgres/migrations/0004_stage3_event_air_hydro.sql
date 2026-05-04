-- Stage 3 normalized tables for the first JSONL insertion pass.

CREATE TABLE IF NOT EXISTS hazard_events (
  record_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parameter_id text REFERENCES parameter_registry(parameter_id),
  source_id text NOT NULL REFERENCES sources(source_id),
  event_type text NOT NULL,
  event_id text,
  source_event_id text,
  title text,
  description text,
  hazard_type text,
  severity text,
  severity_score double precision,
  magnitude double precision,
  category text,
  status text,
  started_at timestamptz,
  observed_time timestamptz,
  valid_time timestamptz,
  forecast_time timestamptz,
  model_run_time timestamptz,
  issued_time timestamptz,
  updated_time timestamptz,
  ended_at timestamptz,
  expires_time timestamptz,
  time_index timestamptz,
  ingested_at timestamptz NOT NULL DEFAULT now(),
  centroid_latitude double precision,
  centroid_longitude double precision,
  latitude double precision,
  longitude double precision,
  geom geometry(Geometry, 4326),
  h3_res5 text,
  h3_res6 text,
  h3_res7 text,
  h3_res8 text,
  value double precision,
  unit text,
  raw_file_id uuid NOT NULL REFERENCES source_raw_files(raw_file_id),
  normalization_run_id uuid REFERENCES normalization_runs(run_id),
  confidence_score double precision,
  quality_flag text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE UNIQUE INDEX IF NOT EXISTS hazard_events_stage3_dedupe_uidx
  ON hazard_events (raw_file_id, source_id, event_type, event_id, time_index)
  WHERE event_id IS NOT NULL AND time_index IS NOT NULL;
CREATE INDEX IF NOT EXISTS hazard_events_type_time_idx
  ON hazard_events (event_type, valid_time DESC, observed_time DESC, time_index DESC);
CREATE INDEX IF NOT EXISTS hazard_events_source_event_idx
  ON hazard_events (source_id, event_id)
  WHERE event_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS hazard_events_geom_idx
  ON hazard_events USING gist (geom);
CREATE INDEX IF NOT EXISTS hazard_events_h3_res6_idx
  ON hazard_events (h3_res6, event_type, time_index DESC)
  WHERE h3_res6 IS NOT NULL;
CREATE INDEX IF NOT EXISTS hazard_events_payload_gin_idx
  ON hazard_events USING gin (payload);

CREATE TABLE IF NOT EXISTS air_quality_time_series (
  record_id uuid NOT NULL DEFAULT gen_random_uuid(),
  parameter_id text NOT NULL REFERENCES parameter_registry(parameter_id),
  source_id text NOT NULL REFERENCES sources(source_id),
  station_id text,
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
  raw_file_id uuid NOT NULL REFERENCES source_raw_files(raw_file_id),
  normalization_run_id uuid REFERENCES normalization_runs(run_id),
  confidence_score double precision,
  quality_flag text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY (record_id, time_index)
);

CREATE UNIQUE INDEX IF NOT EXISTS air_quality_time_series_stage3_dedupe_uidx
  ON air_quality_time_series (raw_file_id, parameter_id, source_id, station_id, latitude, longitude, time_index);
CREATE INDEX IF NOT EXISTS air_quality_time_series_parameter_time_idx
  ON air_quality_time_series (parameter_id, time_index DESC);
CREATE INDEX IF NOT EXISTS air_quality_time_series_source_time_idx
  ON air_quality_time_series (source_id, time_index DESC);
CREATE INDEX IF NOT EXISTS air_quality_time_series_h3_res7_idx
  ON air_quality_time_series (h3_res7, parameter_id, time_index DESC)
  WHERE h3_res7 IS NOT NULL;
CREATE INDEX IF NOT EXISTS air_quality_time_series_geom_idx
  ON air_quality_time_series USING gist (geom);
CREATE INDEX IF NOT EXISTS air_quality_time_series_payload_gin_idx
  ON air_quality_time_series USING gin (payload);

CREATE TABLE IF NOT EXISTS hydrology_time_series (
  record_id uuid NOT NULL DEFAULT gen_random_uuid(),
  parameter_id text NOT NULL REFERENCES parameter_registry(parameter_id),
  source_id text NOT NULL REFERENCES sources(source_id),
  station_id text,
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
  raw_file_id uuid NOT NULL REFERENCES source_raw_files(raw_file_id),
  normalization_run_id uuid REFERENCES normalization_runs(run_id),
  confidence_score double precision,
  quality_flag text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY (record_id, time_index)
);

CREATE UNIQUE INDEX IF NOT EXISTS hydrology_time_series_stage3_dedupe_uidx
  ON hydrology_time_series (raw_file_id, parameter_id, source_id, station_id, latitude, longitude, time_index);
CREATE INDEX IF NOT EXISTS hydrology_time_series_parameter_time_idx
  ON hydrology_time_series (parameter_id, time_index DESC);
CREATE INDEX IF NOT EXISTS hydrology_time_series_source_time_idx
  ON hydrology_time_series (source_id, time_index DESC);
CREATE INDEX IF NOT EXISTS hydrology_time_series_h3_res7_idx
  ON hydrology_time_series (h3_res7, parameter_id, time_index DESC)
  WHERE h3_res7 IS NOT NULL;
CREATE INDEX IF NOT EXISTS hydrology_time_series_geom_idx
  ON hydrology_time_series USING gist (geom);
CREATE INDEX IF NOT EXISTS hydrology_time_series_payload_gin_idx
  ON hydrology_time_series USING gin (payload);

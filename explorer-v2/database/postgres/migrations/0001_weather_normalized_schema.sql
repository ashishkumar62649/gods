-- GODS Explorer normalized weather schema.
-- Target database: god_eyes
-- Run inside the god_eyes PostgreSQL database.

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS normalized_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline text NOT NULL,
  lane text,
  status text NOT NULL DEFAULT 'running',
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  source_fetch_log_path text,
  input_count integer NOT NULL DEFAULT 0,
  output_count integer NOT NULL DEFAULT 0,
  error_count integer NOT NULL DEFAULT 0,
  notes text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS sources (
  source_id text PRIMARY KEY,
  source_family text NOT NULL,
  display_name text NOT NULL,
  global_best_effort boolean NOT NULL DEFAULT true,
  priority_current integer NOT NULL DEFAULT 100,
  priority_historical integer NOT NULL DEFAULT 100,
  license_note text,
  docs_url text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS parameter_registry (
  parameter_id text PRIMARY KEY,
  display_name text NOT NULL,
  category text NOT NULL,
  data_family text NOT NULL,
  canonical_unit text,
  is_fetched boolean NOT NULL DEFAULT true,
  is_derived boolean NOT NULL DEFAULT false,
  primary_source_id text REFERENCES sources(source_id),
  fallback_source_ids text[] NOT NULL DEFAULT ARRAY[]::text[],
  value_shape text NOT NULL DEFAULT 'point',
  storage_target text NOT NULL DEFAULT 'postgres',
  normalized_table text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS source_raw_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  normalized_run_id uuid REFERENCES normalized_runs(id),
  source_id text NOT NULL REFERENCES sources(source_id),
  source_family text,
  folder text,
  data_type text NOT NULL,
  normalization_lane text,
  expected_format text,
  endpoint text,
  fetched_at timestamptz,
  ingested_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL,
  http_status integer,
  content_type text,
  bytes bigint,
  checksum_sha256 text,
  raw_file_path text,
  metadata_path text,
  sample_shape jsonb NOT NULL DEFAULT '{}'::jsonb,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS source_raw_files_checksum_idx
  ON source_raw_files (checksum_sha256)
  WHERE checksum_sha256 IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS source_raw_files_raw_path_idx
  ON source_raw_files (raw_file_path)
  WHERE raw_file_path IS NOT NULL;
CREATE INDEX IF NOT EXISTS source_raw_files_source_time_idx
  ON source_raw_files (source_id, fetched_at DESC);
CREATE INDEX IF NOT EXISTS source_raw_files_lane_idx
  ON source_raw_files (normalization_lane);
CREATE INDEX IF NOT EXISTS source_raw_files_payload_gin_idx
  ON source_raw_files USING gin (payload);

CREATE TABLE IF NOT EXISTS weather_time_series (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  raw_file_id uuid REFERENCES source_raw_files(id),
  normalized_run_id uuid REFERENCES normalized_runs(id),
  source_id text NOT NULL REFERENCES sources(source_id),
  source_family text,
  parameter_id text NOT NULL REFERENCES parameter_registry(parameter_id),
  observed_time timestamptz,
  valid_time timestamptz,
  forecast_time timestamptz,
  model_run_time timestamptz,
  issued_time timestamptz,
  expires_time timestamptz,
  time_index timestamptz NOT NULL DEFAULT now(),
  ingested_at timestamptz NOT NULL DEFAULT now(),
  latitude double precision,
  longitude double precision,
  geom geometry(Point, 4326),
  h3_res_4 text,
  h3_res_5 text,
  h3_res_6 text,
  h3_res_7 text,
  h3_res_8 text,
  h3_res_9 text,
  value double precision,
  unit text,
  original_value text,
  original_unit text,
  quality_flag text,
  confidence_score double precision,
  quality_score double precision,
  raw_file_path text,
  checksum_sha256 text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY (id, time_index)
);

CREATE INDEX IF NOT EXISTS weather_time_series_time_idx
  ON weather_time_series (parameter_id, valid_time DESC, observed_time DESC);
CREATE INDEX IF NOT EXISTS weather_time_series_source_idx
  ON weather_time_series (source_id, parameter_id);
CREATE INDEX IF NOT EXISTS weather_time_series_h3_6_idx
  ON weather_time_series (h3_res_6, parameter_id, valid_time DESC);
CREATE INDEX IF NOT EXISTS weather_time_series_h3_7_idx
  ON weather_time_series (h3_res_7, parameter_id, valid_time DESC);
CREATE INDEX IF NOT EXISTS weather_time_series_geom_idx
  ON weather_time_series USING gist (geom);
CREATE INDEX IF NOT EXISTS weather_time_series_payload_gin_idx
  ON weather_time_series USING gin (payload);

CREATE TABLE IF NOT EXISTS ocean_time_series (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  raw_file_id uuid REFERENCES source_raw_files(id),
  normalized_run_id uuid REFERENCES normalized_runs(id),
  source_id text NOT NULL REFERENCES sources(source_id),
  source_family text,
  station_id text,
  parameter_id text NOT NULL REFERENCES parameter_registry(parameter_id),
  observed_time timestamptz,
  valid_time timestamptz,
  forecast_time timestamptz,
  model_run_time timestamptz,
  issued_time timestamptz,
  expires_time timestamptz,
  time_index timestamptz NOT NULL DEFAULT now(),
  ingested_at timestamptz NOT NULL DEFAULT now(),
  latitude double precision,
  longitude double precision,
  geom geometry(Point, 4326),
  h3_res_5 text,
  h3_res_6 text,
  h3_res_7 text,
  value double precision,
  unit text,
  original_value text,
  original_unit text,
  quality_flag text,
  confidence_score double precision,
  raw_file_path text,
  checksum_sha256 text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY (id, time_index)
);

CREATE INDEX IF NOT EXISTS ocean_time_series_time_idx
  ON ocean_time_series (parameter_id, observed_time DESC, valid_time DESC);
CREATE INDEX IF NOT EXISTS ocean_time_series_station_idx
  ON ocean_time_series (source_id, station_id, parameter_id);
CREATE INDEX IF NOT EXISTS ocean_time_series_h3_6_idx
  ON ocean_time_series (h3_res_6, parameter_id, observed_time DESC);
CREATE INDEX IF NOT EXISTS ocean_time_series_geom_idx
  ON ocean_time_series USING gist (geom);

CREATE TABLE IF NOT EXISTS air_quality_time_series (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  raw_file_id uuid REFERENCES source_raw_files(id),
  normalized_run_id uuid REFERENCES normalized_runs(id),
  source_id text NOT NULL REFERENCES sources(source_id),
  source_family text,
  station_id text,
  parameter_id text NOT NULL REFERENCES parameter_registry(parameter_id),
  observed_time timestamptz,
  valid_time timestamptz,
  forecast_time timestamptz,
  model_run_time timestamptz,
  issued_time timestamptz,
  expires_time timestamptz,
  time_index timestamptz NOT NULL DEFAULT now(),
  ingested_at timestamptz NOT NULL DEFAULT now(),
  latitude double precision,
  longitude double precision,
  geom geometry(Point, 4326),
  h3_res_5 text,
  h3_res_6 text,
  h3_res_7 text,
  h3_res_8 text,
  value double precision,
  unit text,
  original_value text,
  original_unit text,
  quality_flag text,
  confidence_score double precision,
  raw_file_path text,
  checksum_sha256 text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY (id, time_index)
);

CREATE INDEX IF NOT EXISTS air_quality_time_series_time_idx
  ON air_quality_time_series (parameter_id, time_index DESC);
CREATE INDEX IF NOT EXISTS air_quality_time_series_h3_7_idx
  ON air_quality_time_series (h3_res_7, parameter_id, time_index DESC);
CREATE INDEX IF NOT EXISTS air_quality_time_series_geom_idx
  ON air_quality_time_series USING gist (geom);

CREATE TABLE IF NOT EXISTS hydrology_time_series (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  raw_file_id uuid REFERENCES source_raw_files(id),
  normalized_run_id uuid REFERENCES normalized_runs(id),
  source_id text NOT NULL REFERENCES sources(source_id),
  source_family text,
  station_id text,
  parameter_id text NOT NULL REFERENCES parameter_registry(parameter_id),
  observed_time timestamptz,
  valid_time timestamptz,
  forecast_time timestamptz,
  model_run_time timestamptz,
  issued_time timestamptz,
  expires_time timestamptz,
  time_index timestamptz NOT NULL DEFAULT now(),
  ingested_at timestamptz NOT NULL DEFAULT now(),
  latitude double precision,
  longitude double precision,
  geom geometry(Point, 4326),
  h3_res_5 text,
  h3_res_6 text,
  h3_res_7 text,
  h3_res_8 text,
  value double precision,
  unit text,
  original_value text,
  original_unit text,
  quality_flag text,
  confidence_score double precision,
  raw_file_path text,
  checksum_sha256 text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY (id, time_index)
);

CREATE INDEX IF NOT EXISTS hydrology_time_series_time_idx
  ON hydrology_time_series (parameter_id, time_index DESC);
CREATE INDEX IF NOT EXISTS hydrology_time_series_h3_7_idx
  ON hydrology_time_series (h3_res_7, parameter_id, time_index DESC);
CREATE INDEX IF NOT EXISTS hydrology_time_series_geom_idx
  ON hydrology_time_series USING gist (geom);

CREATE TABLE IF NOT EXISTS hazard_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  raw_file_id uuid REFERENCES source_raw_files(id),
  normalized_run_id uuid REFERENCES normalized_runs(id),
  source_id text NOT NULL REFERENCES sources(source_id),
  source_family text,
  parameter_id text REFERENCES parameter_registry(parameter_id),
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
  ingested_at timestamptz NOT NULL DEFAULT now(),
  centroid_latitude double precision,
  centroid_longitude double precision,
  geom geometry(Geometry, 4326),
  h3_res_5 text,
  h3_res_6 text,
  h3_res_7 text,
  value double precision,
  unit text,
  confidence_score double precision,
  raw_file_path text,
  checksum_sha256 text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS hazard_events_type_time_idx
  ON hazard_events (event_type, valid_time DESC, observed_time DESC);
CREATE INDEX IF NOT EXISTS hazard_events_event_id_idx
  ON hazard_events (source_id, event_id)
  WHERE event_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS hazard_events_geom_idx
  ON hazard_events USING gist (geom);
CREATE INDEX IF NOT EXISTS hazard_events_h3_6_idx
  ON hazard_events (h3_res_6, event_type, valid_time DESC);
CREATE INDEX IF NOT EXISTS hazard_events_payload_gin_idx
  ON hazard_events USING gin (payload);

CREATE TABLE IF NOT EXISTS geospatial_features (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  raw_file_id uuid REFERENCES source_raw_files(id),
  normalized_run_id uuid REFERENCES normalized_runs(id),
  source_id text NOT NULL REFERENCES sources(source_id),
  source_family text,
  parameter_id text REFERENCES parameter_registry(parameter_id),
  feature_type text NOT NULL,
  feature_id text,
  name text,
  observed_time timestamptz,
  valid_time timestamptz,
  ingested_at timestamptz NOT NULL DEFAULT now(),
  latitude double precision,
  longitude double precision,
  geom geometry(Geometry, 4326),
  h3_res_5 text,
  h3_res_6 text,
  h3_res_7 text,
  h3_res_8 text,
  h3_res_9 text,
  raw_file_path text,
  checksum_sha256 text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS geospatial_features_type_idx
  ON geospatial_features (feature_type, source_id);
CREATE INDEX IF NOT EXISTS geospatial_features_feature_id_idx
  ON geospatial_features (source_id, feature_id)
  WHERE feature_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS geospatial_features_geom_idx
  ON geospatial_features USING gist (geom);
CREATE INDEX IF NOT EXISTS geospatial_features_h3_7_idx
  ON geospatial_features (h3_res_7, feature_type);
CREATE INDEX IF NOT EXISTS geospatial_features_payload_gin_idx
  ON geospatial_features USING gin (payload);

CREATE TABLE IF NOT EXISTS catalog_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  raw_file_id uuid REFERENCES source_raw_files(id),
  normalized_run_id uuid REFERENCES normalized_runs(id),
  source_id text NOT NULL REFERENCES sources(source_id),
  source_family text,
  catalog_type text NOT NULL,
  product_id text,
  title text,
  observed_time timestamptz,
  valid_time timestamptz,
  forecast_time timestamptz,
  ingested_at timestamptz NOT NULL DEFAULT now(),
  product_url text,
  raw_file_path text,
  checksum_sha256 text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS catalog_products_source_type_idx
  ON catalog_products (source_id, catalog_type);
CREATE INDEX IF NOT EXISTS catalog_products_product_id_idx
  ON catalog_products (source_id, product_id)
  WHERE product_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS catalog_products_payload_gin_idx
  ON catalog_products USING gin (payload);

CREATE TABLE IF NOT EXISTS raster_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  raw_file_id uuid REFERENCES source_raw_files(id),
  normalized_run_id uuid REFERENCES normalized_runs(id),
  source_id text NOT NULL REFERENCES sources(source_id),
  source_family text,
  product_type text NOT NULL,
  parameter_id text REFERENCES parameter_registry(parameter_id),
  observed_time timestamptz,
  valid_time timestamptz,
  forecast_time timestamptz,
  ingested_at timestamptz NOT NULL DEFAULT now(),
  raster_format text,
  raw_file_path text,
  processed_file_path text,
  processed_storage_class text,
  checksum_sha256 text,
  bbox geometry(Polygon, 4326),
  h3_res_4 text,
  h3_res_5 text,
  h3_res_6 text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS raster_products_source_type_idx
  ON raster_products (source_id, product_type, valid_time DESC);
CREATE INDEX IF NOT EXISTS raster_products_parameter_idx
  ON raster_products (parameter_id, valid_time DESC);
CREATE INDEX IF NOT EXISTS raster_products_bbox_idx
  ON raster_products USING gist (bbox);
CREATE INDEX IF NOT EXISTS raster_products_payload_gin_idx
  ON raster_products USING gin (payload);

CREATE TABLE IF NOT EXISTS source_health (
  source_id text PRIMARY KEY REFERENCES sources(source_id),
  last_success_time timestamptz,
  last_failure_time timestamptz,
  success_count bigint NOT NULL DEFAULT 0,
  failure_count bigint NOT NULL DEFAULT 0,
  duplicate_count bigint NOT NULL DEFAULT 0,
  avg_response_time_ms double precision,
  updated_at timestamptz NOT NULL DEFAULT now(),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS derived_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  raw_file_id uuid REFERENCES source_raw_files(id),
  normalized_run_id uuid REFERENCES normalized_runs(id),
  parameter_id text NOT NULL REFERENCES parameter_registry(parameter_id),
  metric_type text NOT NULL,
  source_method text NOT NULL,
  observed_time timestamptz,
  valid_time timestamptz,
  forecast_time timestamptz,
  model_run_time timestamptz,
  ingested_at timestamptz NOT NULL DEFAULT now(),
  latitude double precision,
  longitude double precision,
  geom geometry(Geometry, 4326),
  h3_res_4 text,
  h3_res_5 text,
  h3_res_6 text,
  h3_res_7 text,
  h3_res_8 text,
  h3_res_9 text,
  value double precision,
  unit text,
  confidence_score double precision,
  input_record_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  raw_file_path text,
  checksum_sha256 text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS derived_metrics_parameter_time_idx
  ON derived_metrics (parameter_id, valid_time DESC, observed_time DESC);
CREATE INDEX IF NOT EXISTS derived_metrics_h3_7_idx
  ON derived_metrics (h3_res_7, parameter_id, valid_time DESC);
CREATE INDEX IF NOT EXISTS derived_metrics_geom_idx
  ON derived_metrics USING gist (geom);

CREATE TABLE IF NOT EXISTS best_current_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parameter_id text NOT NULL REFERENCES parameter_registry(parameter_id),
  h3_res_6 text,
  h3_res_7 text,
  h3_res_8 text,
  latitude double precision,
  longitude double precision,
  geom geometry(Point, 4326),
  best_value double precision,
  unit text,
  selected_source_id text REFERENCES sources(source_id),
  selected_table text NOT NULL,
  selected_record_id uuid,
  observed_time timestamptz,
  valid_time timestamptz,
  calculated_at timestamptz NOT NULL DEFAULT now(),
  confidence_score double precision,
  supporting_source_count integer NOT NULL DEFAULT 0,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE UNIQUE INDEX IF NOT EXISTS best_current_values_h3_parameter_idx
  ON best_current_values (h3_res_7, parameter_id)
  WHERE h3_res_7 IS NOT NULL;
CREATE INDEX IF NOT EXISTS best_current_values_geom_idx
  ON best_current_values USING gist (geom);
CREATE INDEX IF NOT EXISTS best_current_values_parameter_time_idx
  ON best_current_values (parameter_id, valid_time DESC, calculated_at DESC);

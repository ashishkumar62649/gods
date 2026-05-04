-- God Eyes normalization MVP core schema.
-- Target database: god_eyes

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS timescaledb;
EXCEPTION
  WHEN undefined_file THEN
    RAISE NOTICE 'TimescaleDB extension is not available in this image; continuing with normal PostgreSQL tables.';
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'TimescaleDB extension could not be enabled with current privileges; continuing with normal PostgreSQL tables.';
END $$;

CREATE TABLE IF NOT EXISTS sources (
  source_id text PRIMARY KEY,
  source_name text NOT NULL,
  source_family text NOT NULL,
  authority_level text NOT NULL DEFAULT 'reference',
  access_type text NOT NULL DEFAULT 'open',
  base_reliability numeric(4,3) NOT NULL DEFAULT 0.700,
  priority_current integer NOT NULL DEFAULT 100,
  update_frequency text,
  rate_limit_notes text,
  normalizer_adapter text,
  enabled boolean NOT NULL DEFAULT true,
  notes text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS parameter_registry (
  parameter_id text PRIMARY KEY,
  canonical_name text NOT NULL,
  display_name text NOT NULL,
  category text NOT NULL,
  data_family text NOT NULL,
  canonical_unit text,
  value_kind text NOT NULL DEFAULT 'observation',
  geometry_kind text NOT NULL DEFAULT 'point',
  storage_target text NOT NULL DEFAULT 'postgres',
  is_direct boolean NOT NULL DEFAULT true,
  is_derived boolean NOT NULL DEFAULT false,
  is_grid boolean NOT NULL DEFAULT false,
  is_event boolean NOT NULL DEFAULT false,
  is_alert boolean NOT NULL DEFAULT false,
  is_visual boolean NOT NULL DEFAULT false,
  primary_sources text[] NOT NULL DEFAULT ARRAY[]::text[],
  fallback_sources text[] NOT NULL DEFAULT ARRAY[]::text[],
  aggregation_rule text,
  retention_rule text,
  notes text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS source_raw_files (
  raw_file_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id text NOT NULL,
  source text,
  folder text,
  data_type text NOT NULL,
  endpoint text,
  raw_file_path text,
  metadata_path text,
  checksum_sha256 text,
  content_type text,
  file_extension text,
  bytes bigint,
  fetched_at timestamptz,
  http_status integer,
  status text NOT NULL,
  sample_shape jsonb NOT NULL DEFAULT '{}'::jsonb,
  normalization_lane text,
  ingestion_run_id uuid,
  inserted_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE UNIQUE INDEX IF NOT EXISTS source_raw_files_raw_path_uidx
  ON source_raw_files (raw_file_path)
  WHERE raw_file_path IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS source_raw_files_checksum_uidx
  ON source_raw_files (checksum_sha256)
  WHERE checksum_sha256 IS NOT NULL AND raw_file_path IS NULL;
CREATE INDEX IF NOT EXISTS source_raw_files_source_idx
  ON source_raw_files (source_id, fetched_at DESC);
CREATE INDEX IF NOT EXISTS source_raw_files_lane_idx
  ON source_raw_files (normalization_lane);
CREATE INDEX IF NOT EXISTS source_raw_files_payload_gin_idx
  ON source_raw_files USING gin (payload);

CREATE TABLE IF NOT EXISTS normalization_runs (
  run_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  source_id text REFERENCES sources(source_id),
  input_raw_file_id uuid REFERENCES source_raw_files(raw_file_id),
  status text NOT NULL DEFAULT 'running',
  records_created integer NOT NULL DEFAULT 0,
  records_failed integer NOT NULL DEFAULT 0,
  error_message text,
  normalizer_version text NOT NULL DEFAULT 'mvp_open_meteo_v1',
  payload jsonb NOT NULL DEFAULT '{}'::jsonb
);


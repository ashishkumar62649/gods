\set ON_ERROR_STOP on

CREATE SCHEMA IF NOT EXISTS core;
CREATE SCHEMA IF NOT EXISTS aviation;
CREATE SCHEMA IF NOT EXISTS weather;
CREATE SCHEMA IF NOT EXISTS satellites;
CREATE SCHEMA IF NOT EXISTS maritime;
CREATE SCHEMA IF NOT EXISTS hazards;
CREATE SCHEMA IF NOT EXISTS infrastructure;
CREATE SCHEMA IF NOT EXISTS locations;
CREATE SCHEMA IF NOT EXISTS economy;
CREATE SCHEMA IF NOT EXISTS population;
CREATE SCHEMA IF NOT EXISTS news;

CREATE TABLE IF NOT EXISTS core.source_registry (
  source_key text PRIMARY KEY,
  domain text NOT NULL,
  display_name text NOT NULL,
  homepage_url text,
  requires_auth boolean NOT NULL DEFAULT false,
  raw_retention_days integer NOT NULL DEFAULT 30,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS core.fetch_runs (
  fetch_run_id bigserial PRIMARY KEY,
  source_key text REFERENCES core.source_registry(source_key),
  domain text NOT NULL,
  status text NOT NULL CHECK (status IN ('started', 'succeeded', 'failed', 'partial')),
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  raw_uri text,
  record_count integer,
  error_message text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS core.source_health (
  source_key text PRIMARY KEY REFERENCES core.source_registry(source_key),
  status text NOT NULL CHECK (status IN ('unknown', 'healthy', 'degraded', 'failed')),
  checked_at timestamptz NOT NULL DEFAULT now(),
  last_success_at timestamptz,
  last_failure_at timestamptz,
  latency_ms integer,
  message text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS core.entities (
  entity_id bigserial PRIMARY KEY,
  domain text NOT NULL,
  entity_type text NOT NULL,
  stable_key text NOT NULL,
  display_name text,
  confidence numeric(5,4),
  geom geometry(Point, 4326),
  attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (domain, entity_type, stable_key)
);

CREATE TABLE IF NOT EXISTS core.provenance (
  provenance_id bigserial PRIMARY KEY,
  source_key text REFERENCES core.source_registry(source_key),
  fetch_run_id bigint REFERENCES core.fetch_runs(fetch_run_id),
  entity_id bigint REFERENCES core.entities(entity_id),
  domain text NOT NULL,
  observed_at timestamptz,
  normalized_at timestamptz NOT NULL DEFAULT now(),
  raw_uri text,
  confidence numeric(5,4),
  lineage jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_fetch_runs_source_started
  ON core.fetch_runs (source_key, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_entities_domain_type
  ON core.entities (domain, entity_type);

CREATE INDEX IF NOT EXISTS idx_entities_geom
  ON core.entities USING gist (geom);

CREATE INDEX IF NOT EXISTS idx_provenance_domain_observed
  ON core.provenance (domain, observed_at DESC);

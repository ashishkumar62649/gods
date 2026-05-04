\set ON_ERROR_STOP on

CREATE TABLE IF NOT EXISTS aviation.aircraft_reference (
  icao24 text PRIMARY KEY,
  registration text,
  aircraft_type text,
  description text,
  owner_operator text,
  country_origin text,
  source_key text REFERENCES core.source_registry(source_key),
  updated_at timestamptz NOT NULL DEFAULT now(),
  attributes jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS aviation.airports (
  airport_id text PRIMARY KEY,
  ident text,
  name text NOT NULL,
  airport_type text,
  municipality text,
  iso_country text,
  iata_code text,
  icao_code text,
  latitude double precision,
  longitude double precision,
  geom geometry(Point, 4326),
  source_key text REFERENCES core.source_registry(source_key),
  updated_at timestamptz NOT NULL DEFAULT now(),
  attributes jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS aviation.live_flight_snapshots (
  icao24 text NOT NULL,
  observed_at timestamptz NOT NULL,
  callsign text,
  registration text,
  aircraft_type text,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  geom geometry(Point, 4326) GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)) STORED,
  altitude_baro_m double precision,
  altitude_geom_m double precision,
  velocity_mps double precision,
  heading_true_deg double precision,
  vertical_rate_mps double precision,
  on_ground boolean NOT NULL DEFAULT false,
  squawk text,
  emergency_status text,
  is_military boolean NOT NULL DEFAULT false,
  is_interesting boolean NOT NULL DEFAULT false,
  source_key text REFERENCES core.source_registry(source_key),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY (icao24, observed_at)
);

CREATE TABLE IF NOT EXISTS satellites.tle_catalog (
  norad_id integer PRIMARY KEY,
  object_name text,
  object_type text,
  country_origin text,
  launch_date date,
  tle_epoch timestamptz,
  line1 text NOT NULL,
  line2 text NOT NULL,
  source_key text REFERENCES core.source_registry(source_key),
  updated_at timestamptz NOT NULL DEFAULT now(),
  attributes jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS satellites.state_snapshots (
  norad_id integer NOT NULL REFERENCES satellites.tle_catalog(norad_id),
  observed_at timestamptz NOT NULL,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  geom geometry(Point, 4326) GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)) STORED,
  altitude_km double precision,
  velocity_kps double precision,
  inclination_deg double precision,
  period_minutes double precision,
  mission_category text,
  decay_status text,
  source_key text REFERENCES core.source_registry(source_key),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY (norad_id, observed_at)
);

CREATE TABLE IF NOT EXISTS maritime.vessels (
  vessel_id text PRIMARY KEY,
  mmsi text,
  imo text,
  name text,
  vessel_type text,
  flag text,
  source_key text REFERENCES core.source_registry(source_key),
  updated_at timestamptz NOT NULL DEFAULT now(),
  attributes jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS maritime.position_snapshots (
  vessel_id text NOT NULL REFERENCES maritime.vessels(vessel_id),
  observed_at timestamptz NOT NULL,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  geom geometry(Point, 4326) GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)) STORED,
  speed_knots double precision,
  heading_deg double precision,
  nearest_cable_id text,
  nearest_cable_distance_m double precision,
  risk_status text,
  source_key text REFERENCES core.source_registry(source_key),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY (vessel_id, observed_at)
);

CREATE TABLE IF NOT EXISTS infrastructure.cables (
  cable_id text PRIMARY KEY,
  name text NOT NULL,
  status text,
  owner_operator text,
  length_km double precision,
  geom geometry(MultiLineString, 4326),
  source_key text REFERENCES core.source_registry(source_key),
  updated_at timestamptz NOT NULL DEFAULT now(),
  attributes jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS infrastructure.landing_points (
  landing_point_id text PRIMARY KEY,
  cable_id text REFERENCES infrastructure.cables(cable_id),
  name text NOT NULL,
  country text,
  latitude double precision,
  longitude double precision,
  geom geometry(Point, 4326),
  source_key text REFERENCES core.source_registry(source_key),
  updated_at timestamptz NOT NULL DEFAULT now(),
  attributes jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS infrastructure.assets (
  asset_id text PRIMARY KEY,
  asset_type text NOT NULL,
  name text NOT NULL,
  status text,
  latitude double precision,
  longitude double precision,
  geom geometry(Point, 4326),
  source_key text REFERENCES core.source_registry(source_key),
  updated_at timestamptz NOT NULL DEFAULT now(),
  attributes jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS hazards.events (
  event_id text PRIMARY KEY,
  event_type text NOT NULL,
  title text,
  description text,
  severity text,
  severity_score double precision,
  magnitude double precision,
  category text,
  status text,
  started_at timestamptz,
  observed_at timestamptz,
  updated_at timestamptz,
  ended_at timestamptz,
  expires_at timestamptz,
  latitude double precision,
  longitude double precision,
  geom geometry(Geometry, 4326),
  source_key text REFERENCES core.source_registry(source_key),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_airports_geom ON aviation.airports USING gist (geom);
CREATE INDEX IF NOT EXISTS idx_live_flights_time ON aviation.live_flight_snapshots (observed_at DESC);
CREATE INDEX IF NOT EXISTS idx_live_flights_geom ON aviation.live_flight_snapshots USING gist (geom);
CREATE INDEX IF NOT EXISTS idx_satellite_states_time ON satellites.state_snapshots (observed_at DESC);
CREATE INDEX IF NOT EXISTS idx_satellite_states_geom ON satellites.state_snapshots USING gist (geom);
CREATE INDEX IF NOT EXISTS idx_maritime_positions_time ON maritime.position_snapshots (observed_at DESC);
CREATE INDEX IF NOT EXISTS idx_maritime_positions_geom ON maritime.position_snapshots USING gist (geom);
CREATE INDEX IF NOT EXISTS idx_cables_geom ON infrastructure.cables USING gist (geom);
CREATE INDEX IF NOT EXISTS idx_landing_points_geom ON infrastructure.landing_points USING gist (geom);
CREATE INDEX IF NOT EXISTS idx_infrastructure_assets_geom ON infrastructure.assets USING gist (geom);
CREATE INDEX IF NOT EXISTS idx_hazard_events_type_time ON hazards.events (event_type, observed_at DESC);
CREATE INDEX IF NOT EXISTS idx_hazard_events_geom ON hazards.events USING gist (geom);

CREATE OR REPLACE VIEW aviation.current_flights AS
SELECT DISTINCT ON (icao24) *
FROM aviation.live_flight_snapshots
ORDER BY icao24, observed_at DESC;

CREATE OR REPLACE VIEW satellites.current_states AS
SELECT DISTINCT ON (norad_id) *
FROM satellites.state_snapshots
ORDER BY norad_id, observed_at DESC;

CREATE OR REPLACE VIEW maritime.current_positions AS
SELECT DISTINCT ON (vessel_id) *
FROM maritime.position_snapshots
ORDER BY vessel_id, observed_at DESC;

CREATE OR REPLACE VIEW hazards.current_events AS
SELECT *
FROM hazards.events
WHERE (expires_at IS NULL OR expires_at >= now() - interval '1 hour')
  AND (ended_at IS NULL OR ended_at >= now() - interval '1 hour');

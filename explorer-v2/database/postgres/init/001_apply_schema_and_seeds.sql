\set ON_ERROR_STOP on

\echo 'Initializing god_eyes MVP database schema'
\i /schema/migrations/0001_mvp_core.sql
\i /schema/migrations/0002_mvp_weather_time_series.sql
\i /schema/migrations/0003_mvp_timescale_optional.sql
\i /schema/migrations/0004_stage3_event_air_hydro.sql
\i /schema/migrations/0005_weather_intelligence_views.sql
\i /schema/migrations/0006_v2_domain_schemas.sql
\i /schema/migrations/0007_v2_operational_domain_tables.sql

\echo 'Loading god_eyes MVP seed data'
\i /schema/seeds/0001_mvp_sources.sql
\i /schema/seeds/0002_mvp_parameters.sql
\i /schema/seeds/0003_v2_core_source_registry.sql

\echo 'god_eyes MVP database initialization complete'

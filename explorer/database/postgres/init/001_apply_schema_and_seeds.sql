\set ON_ERROR_STOP on

\echo 'Initializing god_eyes MVP database schema'
\i /schema/migrations/0001_mvp_core.sql
\i /schema/migrations/0002_mvp_weather_time_series.sql
\i /schema/migrations/0003_mvp_timescale_optional.sql

\echo 'Loading god_eyes MVP seed data'
\i /schema/seeds/0001_mvp_sources.sql
\i /schema/seeds/0002_mvp_parameters.sql

\echo 'god_eyes MVP database initialization complete'

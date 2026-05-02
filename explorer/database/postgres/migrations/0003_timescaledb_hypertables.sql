-- TimescaleDB layer for recent/current time-series tables.
-- Run after TimescaleDB is installed in the PostgreSQL server.

CREATE EXTENSION IF NOT EXISTS timescaledb;

SELECT create_hypertable('weather_time_series', 'time_index', if_not_exists => TRUE, chunk_time_interval => interval '1 day');
SELECT create_hypertable('ocean_time_series', 'time_index', if_not_exists => TRUE, chunk_time_interval => interval '1 day');
SELECT create_hypertable('air_quality_time_series', 'time_index', if_not_exists => TRUE, chunk_time_interval => interval '1 day');
SELECT create_hypertable('hydrology_time_series', 'time_index', if_not_exists => TRUE, chunk_time_interval => interval '1 day');

-- Keep raw evidence and source records in PostgreSQL, but compress old chunks.
ALTER TABLE weather_time_series SET (
  timescaledb.compress,
  timescaledb.compress_segmentby = 'parameter_id, h3_res_7, source_id',
  timescaledb.compress_orderby = 'time_index DESC'
);
ALTER TABLE ocean_time_series SET (
  timescaledb.compress,
  timescaledb.compress_segmentby = 'parameter_id, h3_res_7, source_id',
  timescaledb.compress_orderby = 'time_index DESC'
);
ALTER TABLE air_quality_time_series SET (
  timescaledb.compress,
  timescaledb.compress_segmentby = 'parameter_id, h3_res_7, source_id',
  timescaledb.compress_orderby = 'time_index DESC'
);
ALTER TABLE hydrology_time_series SET (
  timescaledb.compress,
  timescaledb.compress_segmentby = 'parameter_id, h3_res_7, source_id',
  timescaledb.compress_orderby = 'time_index DESC'
);

SELECT add_compression_policy('weather_time_series', interval '30 days', if_not_exists => TRUE);
SELECT add_compression_policy('ocean_time_series', interval '30 days', if_not_exists => TRUE);
SELECT add_compression_policy('air_quality_time_series', interval '30 days', if_not_exists => TRUE);
SELECT add_compression_policy('hydrology_time_series', interval '30 days', if_not_exists => TRUE);

-- Optional TimescaleDB layer for the MVP weather time-series table.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'timescaledb') THEN
    PERFORM create_hypertable(
      'weather_time_series',
      'time_index',
      if_not_exists => TRUE,
      chunk_time_interval => interval '1 day'
    );
  ELSE
    RAISE NOTICE 'TimescaleDB is not enabled; weather_time_series remains a normal PostgreSQL table.';
  END IF;
END $$;


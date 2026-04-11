-- Timescale setup for the Telemetry table.
-- Runs AFTER Prisma creates the base "Telemetry" table.

CREATE EXTENSION IF NOT EXISTS timescaledb;

SELECT create_hypertable(
  '"Telemetry"',
  'time',
  chunk_time_interval => INTERVAL '7 days',
  if_not_exists => TRUE,
  migrate_data => TRUE
);

ALTER TABLE "Telemetry" SET (
  timescaledb.compress,
  timescaledb.compress_segmentby = '"deviceId"'
);

SELECT add_compression_policy('"Telemetry"', INTERVAL '30 days', if_not_exists => TRUE);
SELECT add_retention_policy('"Telemetry"', INTERVAL '2 years', if_not_exists => TRUE);

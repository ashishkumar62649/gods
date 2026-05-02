# God Eyes Local Database Setup

This project uses one local PostgreSQL database named `god_eyes`.

The MVP local development stack is:

- PostgreSQL for relational normalized records
- PostGIS for geometry and spatial indexes
- TimescaleDB for recent/current time-series hypertables when available in the Docker image
- Parquet/DuckDB later for old or very large analytical history

## Requirements

Install Docker Desktop on the laptop first.

## Start The Database

From the project root:

```powershell
docker compose up -d god_eyes_db
```

On the first startup, Docker creates the `god_eyes` database and runs:

```txt
explorer/database/postgres/migrations/0001_mvp_core.sql
explorer/database/postgres/migrations/0002_mvp_weather_time_series.sql
explorer/database/postgres/migrations/0003_mvp_timescale_optional.sql
explorer/database/postgres/seeds/0001_mvp_sources.sql
explorer/database/postgres/seeds/0002_mvp_parameters.sql
```

## Connection Details

```txt
host: localhost
port: 55432
database: god_eyes
user: god_eyes
password: god_eyes_dev_password
```

To use a different local password:

```powershell
$env:GOD_EYES_DB_PASSWORD = "your_password_here"
docker compose up -d god_eyes_db
```

The Docker database publishes to host port `55432` by default so it does not collide with a Windows PostgreSQL service on `5432`.

## Verify

```powershell
docker compose ps
docker compose exec -T god_eyes_db psql -U god_eyes -d god_eyes -c "SELECT current_database();"
docker compose exec -T god_eyes_db psql -U god_eyes -d god_eyes -c "SELECT extname FROM pg_extension WHERE extname IN ('postgis','timescaledb','pgcrypto');"
docker compose exec -T god_eyes_db psql -U god_eyes -d god_eyes -c "SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name;"
docker compose exec -T god_eyes_db psql -U god_eyes -d god_eyes -c "SELECT count(*) FROM sources;"
docker compose exec -T god_eyes_db psql -U god_eyes -d god_eyes -c "SELECT count(*) FROM parameter_registry;"
```

For MVP, `sources` should contain `4` rows and `parameter_registry` should contain `8` rows.

## Run MVP Normalization Proof

```powershell
cd explorer
npm run normalize:weather:mvp
cd ..
docker compose exec -T god_eyes_db psql -U god_eyes -d god_eyes -c "SELECT count(*) FROM source_raw_files;"
docker compose exec -T god_eyes_db psql -U god_eyes -d god_eyes -c "SELECT count(*) FROM weather_time_series;"
docker compose exec -T god_eyes_db psql -U god_eyes -d god_eyes -c "SELECT parameter_id, value, unit, valid_time, source_id FROM weather_time_series WHERE parameter_id='temperature' ORDER BY time_index DESC LIMIT 5;"
```

After this MVP works, expand the seeds back toward the full `283` parameter registry.

## Stop

```powershell
docker compose stop god_eyes_db
```

## Reset Local Database

This deletes only the local Docker database volume.

```powershell
docker compose down -v
docker compose up -d god_eyes_db
```

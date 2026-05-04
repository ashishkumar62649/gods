# Current God Eyes V2 Structure

`explorer-v2` is the active project. `explorer` is v1 reference only and must remain untouched.

```text
explorer-v2/
  README.md
  .env.example
  package.json
  package-lock.json
  frontend/
    src/
      app/
      components/
      features/
      earth/
      engine/
      core/
      data/
      store/
      utils/
  backend/
    package.json
    package-lock.json
    src/
      index.mjs
      config/
      routes/
      services/
      sources/
      domain/
        normalizers/
        models/
      analytics/
      fusion/
      core/
      store/
      data/
  pipelines/
    weather/
      fetchers/
      normalizers/
      loaders/
      validators/
      jobs/
      common/
      reports/
  database/
    postgres/
      init/
      migrations/
      seeds/
      views/
      schemas/
  data_raw/
    weather/
  data_processed/
    weather/
  data_normalized/
    weather/
      weather_time_series/
      hazard_events/
      hydrology_time_series/
      air_quality_time_series/
      manifests/
      source_raw_files/
      _reports/
      _rejected/
  docs/
  scripts/
  tests/
  infra/
  _migration/
```

## Stack

- Frontend: TypeScript, React, Cesium
- Backend API: Node.js, Express
- Data pipelines: Python
- Database: PostgreSQL, PostGIS, TimescaleDB

## Rules

- New backend API work goes in `backend/src`.
- New pipeline work goes in `pipelines/weather` and should be Python.
- Database schema work goes in `database/postgres`.
- Generated data goes in `data_raw`, `data_processed`, or `data_normalized` and should not be committed unless it is a tiny sample.
- Copied v1 assets that are not yet clean v2 source go in `_migration/pending-review`.

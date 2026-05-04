# God Eyes V2 Structure And Data Platform

This is the canonical map for all future work. Read this file before adding code, data sources, migrations, generated files, or docs.

## Source Of Truth

- `explorer-v2/` is the active product.
- `explorer/` is frozen v1 reference. Do not edit it for v2 work.
- `_unnecessary/` is quarantine for old root clutter and local artifacts.
- Frontend stack is TypeScript, React, and Cesium.
- Backend API stack is Node.js and Express.
- Data pipeline stack is Python.
- Database stack is PostgreSQL, PostGIS, and TimescaleDB.
- Postgres/Timescale is the source of truth for normalized and queryable intelligence.
- Local files are allowed only for raw audit snapshots, staging, rejected payloads, debugging, and retry recovery.

## Final Tree

```text
god-eyes/
  README.md
  .env.example
  package.json
  docker-compose.yml
  explorer/                  # frozen v1 reference
  explorer-v2/
    frontend/                # active React/Cesium UI
    backend/
      src/
        index.mjs
        config/
        routes/
        services/
        db/
        domains/
        analytics/
        fusion/
        core/
    database/postgres/
      init/
      migrations/
      seeds/
      views/
      schemas/
    pipelines/
      weather/
        fetchers/
        normalizers/
        loaders/
        validators/
        jobs/
        common/
        reports/
    data_raw/
      weather/
    data_processed/
      weather/
    data_normalized/
      weather/
    docs/
    scripts/
    tests/
  _unnecessary/
```

## Data Flow Rule

Every source follows the same path:

```text
fetch -> raw audit -> normalize -> validate -> load DB -> expose API -> render frontend
```

Do not make frontend mock files, JSON files, or in-memory backend caches the long-term system memory. They are temporary helpers only.

## Where New Work Goes

- New frontend feature: `explorer-v2/frontend/src/features/<domain>/`.
- New Cesium/map rendering code: `explorer-v2/frontend/src/earth/<domain>/` or `explorer-v2/frontend/src/engine/`.
- New backend route: `explorer-v2/backend/src/routes/` using Express-compatible handlers.
- New backend domain logic: `explorer-v2/backend/src/domains/<domain>/`.
- New Python weather source caller/fetcher: `explorer-v2/pipelines/weather/fetchers/`.
- New Python weather normalizer/validator/loader: `explorer-v2/pipelines/weather/`.
- Shared weather pipeline utility: `explorer-v2/pipelines/weather/common/`.
- New database schema change: `explorer-v2/database/postgres/migrations/`.
- New seed data: `explorer-v2/database/postgres/seeds/`.
- New generated raw data: `explorer-v2/data_raw/`.
- New generated processed data: `explorer-v2/data_processed/`.
- New generated normalized data: `explorer-v2/data_normalized/`.
- New architecture or onboarding docs: `explorer-v2/docs/`.

## Database Organization

Use shared `core` tables plus domain schemas:

- `core`: source registry, fetch runs, source health, entity identity, provenance.
- `aviation`: flights, aircraft, airports, routes, surveillance observations.
- `weather`: weather observations, hazards, hydrology, air quality, climate context.
- `satellites`: TLE catalogs, propagated positions, operators, asset metadata.
- `maritime`: vessels, AIS observations, ports, fishing/watch activity.
- `hazards`: earthquakes, fires, storms, volcanoes, emergency events.
- `infrastructure`: cables, ports, energy, transit, critical facilities.
- `locations`: places, regions, watch zones, exposure summaries.
- `economy`, `population`, `news`: context and event intelligence.

## API Rules

- Preferred public namespace is `/api/v2/...`.
- Legacy `/api/...` routes may remain while the frontend is migrated.
- Domain groups should stay stable: aviation, weather, satellites, maritime, hazards, infrastructure, locations, and source-health.
- APIs should read normalized data from the database where available. In-memory stores are transitional.

## Pipeline Rules

- New pipeline code must be Python.
- `npm run pipeline:weather` runs the Python weather pipeline entrypoint under `pipelines/weather`.
- Copied JavaScript weather fetchers/normalizers are transitional migration assets only and live under `_migration/pending-review/weather-js-pipelines`.
- If a copied JavaScript pipeline must be run during migration, use the explicitly named legacy script.

## Forbidden For Active V2 Work

- Do not add new active code to `explorer/`.
- Do not put durable data products in `explorer-v2/data/`; load them into Postgres.
- Do not add new root-level temp files, logs, generated HTML, or scratch scripts.
- Do not create another nested `.git` inside `explorer-v2`.
- Do not wire new backend/database paths back to v1.

## Commands

```bash
npm run dev
npm run dev:frontend
npm run dev:backend
npm run build
npm run db:up
npm run pipeline:weather
npm run pipeline:weather:legacy-js
npm run pipeline:python:check
npm run report:structure
npm run test
```

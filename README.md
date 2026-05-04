# God Eyes

God Eyes is now organized around `explorer-v2`, the active world-intelligence platform. The old `explorer` folder is preserved as a frozen v1 reference and should not receive new product work.

Start every new implementation by reading:

- `explorer-v2/docs/STRUCTURE_AND_DATA_PLATFORM.md`
- `explorer-v2/docs/DATA_SOURCE_ONBOARDING.md`
- `explorer-v2/docs/MIGRATION_FROM_V1.md`

## Common commands

```bash
npm run dev
npm run dev:frontend
npm run dev:backend
npm run build
npm run db:up
npm run pipeline:weather
npm run report:structure
```

## Repository rules

- Active code goes under `explorer-v2`.
- `explorer` is v1 reference only.
- Frontend is TypeScript, React, and Cesium.
- Backend API is Node.js and Express.
- Data pipelines are Python.
- Database is PostgreSQL, PostGIS, and TimescaleDB.
- Normalized/queryable intelligence belongs in Postgres/Timescale.
- Local files are only raw audit, staging, rejected payloads, logs, or generated outputs.
- New data sources must follow `fetch -> raw audit -> normalize -> validate -> load DB -> expose API -> render frontend`.

# God Eyes Explorer V2

This is the active God Eyes application and data platform. New work belongs here unless `explorer-v2/docs/STRUCTURE_AND_DATA_PLATFORM.md` says otherwise.

## Stack

- Frontend: TypeScript, React, Cesium
- Backend API: Node.js, Express
- Data pipelines: Python
- Database: PostgreSQL, PostGIS, TimescaleDB

## Read first

- `docs/STRUCTURE_AND_DATA_PLATFORM.md`
- `docs/DATA_SOURCE_ONBOARDING.md`
- `docs/DATABASE_ARCHITECTURE.md`
- `docs/API_CONTRACTS.md`
- `docs/MIGRATION_FROM_V1.md`

## Commands

```bash
npm run dev
npm run dev:frontend
npm run dev:backend
npm run build
npm run pipeline:weather
npm run pipeline:python:check
npm run report:structure
npm run test
```

The old `../explorer` project is v1 reference only.

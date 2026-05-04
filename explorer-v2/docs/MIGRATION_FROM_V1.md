# Migration From V1

`explorer/` remains untouched as the frozen v1 reference. Useful work is copied into `explorer-v2` and adapted there.

## Copied Forward

- Backend server: `explorer/server` -> `explorer-v2/backend/src`.
- Postgres schema/seeds: `explorer/database/postgres` -> `explorer-v2/database/postgres`.
- Weather fetchers: `explorer/source-fetchers/weather` -> `explorer-v2/_migration/pending-review/weather-js-pipelines/fetchers`.
- Weather normalizers/loaders: `explorer/normalization/weather` -> `explorer-v2/_migration/pending-review/weather-js-pipelines/normalizers`.
- Scripts: `explorer/scripts` -> `explorer-v2/scripts`.
- Root docs: `doc` -> `explorer-v2/docs`.

## Migration Status

- Weather database work is preserved and becomes the first database-backed intelligence domain.
- Copied JavaScript weather pipeline files are transitional only; new pipeline work is Python.
- Flight, satellite, maritime, hazard, and infrastructure services are copied as transitional backend logic.
- In-memory stores are allowed temporarily but should be replaced by domain repositories backed by Postgres.
- Frontend v2 remains the active UI and should progressively move from mock/domain adapters to `/api/v2` data.

## Do Not Do

- Do not patch v1 to make v2 work.
- Do not add new pipeline outputs as permanent JSON products.
- Do not reconnect new v2 features to old frontend-specific weather work.

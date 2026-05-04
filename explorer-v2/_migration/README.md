# Migration Notes

`explorer/` is the untouched v1 reference. Anything copied from v1 into v2 should be documented here.

## Copied From V1

- `explorer/server` -> `explorer-v2/backend/src`
- `explorer/database/postgres` -> `explorer-v2/database/postgres`
- `explorer/source-fetchers/weather` -> `explorer-v2/_migration/pending-review/weather-js-pipelines/fetchers`
- `explorer/normalization/weather` -> `explorer-v2/_migration/pending-review/weather-js-pipelines/normalizers`
- `explorer/scripts` -> `explorer-v2/scripts`

## Pending Review

- JavaScript weather pipeline copies remain in `pending-review/weather-js-pipelines` while Python replacements are built under `pipelines/weather`.
- Unused v2 mock-only frontend overlays/renderers remain in `pending-review/frontend-mock-ui` until they are either rebuilt as production Cesium renderers or deleted after review.

## Rejected

- Experimental `pipelines/domains` layout was moved to `_migration/rejected/pipelines-domains-layout`.
- Experimental top-level pipeline shared folders were moved to `_migration/rejected/pipelines-shared-experimental`.

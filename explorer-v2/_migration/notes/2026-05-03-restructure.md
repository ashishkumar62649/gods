# 2026-05-03 Restructure Notes

- Kept `explorer/` untouched as v1 reference.
- Backend remains Node.js/Express under `backend/src`.
- Backend copied v1 `normalize` and `models` folders were reorganized into `backend/src/domain/normalizers` and `backend/src/domain/models`.
- Weather pipelines are Python-first under `pipelines/weather`.
- Copied `.mjs` weather pipeline assets were moved to `_migration/pending-review/weather-js-pipelines` for manual review.
- Local generated data belongs in `data_raw`, `data_processed`, and `data_normalized`, not source folders.

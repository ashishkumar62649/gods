# Data Source Onboarding

Use this checklist for every new data source.

New data pipelines are Python. Do not add new JavaScript pipeline jobs unless they are temporary wrappers around copied v1 migration code.

## Required Path

```text
fetch -> raw audit -> normalize -> validate -> load DB -> expose API -> render frontend
```

## Checklist

1. Register the source in database seed data or a migration using `core.source_registry`.
2. Put Python weather callers under `explorer-v2/pipelines/weather/fetchers/`.
3. Write raw snapshots only under `explorer-v2/data/raw/` or a future object store.
4. Normalize into stable Python contracts under `explorer-v2/pipelines/weather/normalizers/`.
5. Validate required fields, timestamps, coordinates, source identifiers, and confidence.
6. Load normalized rows into Postgres domain tables and attach provenance.
7. Expose backend API routes under `/api/v2/<domain>`.
8. Render through the relevant frontend feature and map layer.
9. Add tests for parser/normalizer behavior and database contract assumptions.

## Domain Choice

Use an existing domain unless the source truly creates a new kind of intelligence. When unsure, prefer adding source metadata under `core` and domain-specific observations under the closest existing schema.

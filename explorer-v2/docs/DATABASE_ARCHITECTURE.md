# Database Architecture

God Eyes v2 is database-first. The database stores normalized facts, observations, source health, provenance, and query-ready intelligence.

## Schemas

- `core`: platform registry, source health, fetch runs, entity identity, provenance.
- `aviation`: flight and aircraft intelligence.
- `weather`: environmental observations and weather intelligence.
- `satellites`: orbital catalog and propagated satellite state.
- `maritime`: vessel, AIS, and maritime activity.
- `hazards`: hazard events and emergency signals.
- `infrastructure`: critical infrastructure and exposure.
- `locations`: places, watch zones, and location intelligence.
- `economy`, `population`, `news`: wider context domains.

## Migration Rules

- Add migrations under `explorer-v2/database/postgres/migrations/`.
- Keep migrations idempotent where practical with `IF NOT EXISTS`.
- Add source and parameter seeds under `explorer-v2/database/postgres/seeds/`.
- Do not rely on raw files as the query layer.
- Add provenance for data that came from external sources.

## Operational Domain Tables

Migration `0007_v2_operational_domain_tables.sql` adds the first production
landing-zone tables for aviation, satellites, maritime, infrastructure, and
hazards. These tables are the intended persistence layer for v1 live caches that
are still in memory during the transition.

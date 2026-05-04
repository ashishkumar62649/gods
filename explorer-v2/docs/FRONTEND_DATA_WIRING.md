# Frontend Data Wiring

This document explains how the v2 frontend connects production UI to backend data. It is paired with `FRONTEND_FUNCTIONALITY_AUDIT.md`.

## API Client Boundary

Frontend components should not call `fetch` directly except inside shared API helpers.

- `frontend/src/core/api/intelApi.ts`: small JSON domain feeds and point helpers.
- `frontend/src/core/api/sourceHealthApi.ts`: source health chips and future panels.
- `frontend/src/core/api/liveBinary.ts`: God Eyes fixed binary decoder for live flights.
- `frontend/src/earth/flights/flights.ts`: aviation JSON fallback, route lookup, trace lookup, airports.

## Optimized Paths

| Domain | Frontend Path | Backend Endpoint | Format | Status |
|---|---|---|---|---|
| Flights | `LiveFlightRenderer.ts` | `/api/v2/aviation/flights/live.bin` | fixed binary records | active |
| Flights fallback | `LiveFlightRenderer.ts` | `/api/flights` | bounded JSON | active fallback |
| Satellites | `LiveIntelEntityRenderer.ts` | `/api/v2/satellites` | bounded JSON | active transitional path |
| Satellites binary | pending decoder | `/api/v2/satellites/live.bin` | fixed binary records | backend ready, frontend pending |
| Maritime binary | pending decoder | `/api/v2/maritime/live.bin` | fixed binary records | backend ready, frontend pending |
| Weather points | `LiveIntelEntityRenderer.ts` | `/api/v2/weather/current?limit=350` | bounded JSON from DB | active |
| Hazards | `LiveIntelEntityRenderer.ts` | `/api/v2/hazards?limit=500` | bounded JSON from DB | active |
| Active alerts panel | `ActiveAlertsPanel.tsx` | `/api/v2/hazards?limit=80` | small JSON from DB | active |
| Weather tiles | pending renderer | `/api/v2/weather/tiles/:z/:x/:y.mvt` | Mapbox Vector Tile | backend ready |
| Hazard tiles | pending renderer | `/api/v2/hazards/tiles/:z/:x/:y.mvt` | Mapbox Vector Tile | backend ready |
| Cable tiles | pending renderer | `/api/v2/infrastructure/cables/tiles/:z/:x/:y.mvt` | Mapbox Vector Tile | backend ready |
| Source health | `SourceStatusChips.tsx` | `/api/v2/source-health?limit=8` | small JSON | active |
| Location nearby | `LocationIntelPanel.tsx` | `/api/v2/locations?lat&lon&radiusKm` | small JSON from DB | active with offline state |
| World summary | `WorldSituationPanel.tsx` | `/api/health`, `/api/v2/source-health` | small JSON | active |

## Selection Wiring

- Aircraft clicks are handled by `LiveFlightRenderer` through Cesium primitive picking.
- Selected aircraft id is stored in `frontend/src/store/selectionStore.ts`.
- `AircraftIntelligencePanel.tsx` queries the live flight JSON fallback and route endpoint to show real selected aircraft details.
- Location search uses Cesium Ion geocoder through `MapRenderer.ts`; on geocoder success it updates `liveDataStore` with the real selected latitude/longitude.

## Timeline Wiring

`LiveIntelEntityRenderer.ts` appends `time` and `timeMode` query parameters when the timeline is in `historical` or `forecast` mode. Current backend handlers tolerate these parameters today; weather and hazard DB queries should use them next for real time-window filtering.

`LiveFlightRenderer.ts` only refreshes live flight data when the timeline is in `live` mode because historical aviation snapshots are not loaded into PostgreSQL yet.

## Performance Rules Applied

- Live flight updates stay inside Cesium renderer classes, not React component state.
- Flight positions use binary transport before falling back to JSON.
- Intel point feeds are bounded with `limit` query parameters.
- Timeline, layer, and source-health fetches use `AbortController` where the component owns the request.
- Cesium entities use stable ids derived from backend ids and are refreshed in batches.
- Mock-only development data is isolated under `frontend/src/data/mock`; unused v2 mock renderers/overlay components live in `_migration/pending-review/frontend-mock-ui`.

## Remaining Data Wiring Gaps

- Add frontend decoders for satellite and maritime binary endpoints.
- Add Cesium MVT/vector-tile rendering for weather, hazard, and cable tiles.
- Add detail endpoints for selected satellite, vessel, cable, landing point, hazard, weather cell, and infrastructure asset.
- Add persisted watch-zone APIs and database tables.

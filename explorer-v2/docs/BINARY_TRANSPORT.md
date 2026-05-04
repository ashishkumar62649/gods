# Binary And Optimized Transport

God Eyes v2 uses small JSON only for metadata and selected-entity panels. Dense
live layers and large geospatial layers use compact transport.

## Live Point Binary

Endpoint content type:

```text
application/vnd.god-eyes.live+octet-stream; version=1
```

Header layout:

| Offset | Type | Meaning |
| ---: | --- | --- |
| 0 | uint32 LE | Magic `GE2B` (`0x47453242`) |
| 4 | uint16 LE | Version |
| 6 | uint16 LE | Kind: 1 flights, 2 satellites, 3 maritime |
| 8 | uint32 LE | Record count |
| 12 | uint32 LE | Record byte size |

Implemented endpoints:

| Domain | Endpoint | Record bytes | Frontend consumer |
| --- | --- | ---: | --- |
| Flights | `/api/v2/aviation/flights/live.bin` | 40 | `frontend/src/engine/LiveFlightRenderer.ts` |
| Satellites | `/api/v2/satellites/live.bin` | 40 | backend contract present; frontend currently uses JSON point fallback |
| Maritime | `/api/v2/maritime/live.bin` | 36 | backend contract present; frontend currently uses infrastructure JSON fallback |

Design notes:

- Live binary contains render-critical fields only.
- Selected-entity detail remains JSON.
- Frontend flight binary decode lives in `frontend/src/core/api/liveBinary.ts`.
- Contract tests live in `tests/backend/binary-transport-contract.test.mjs`.

## Vector Tiles

PostGIS MVT endpoints:

| Domain | Endpoint | Source table/view |
| --- | --- | --- |
| Weather | `/api/v2/weather/tiles/:z/:x/:y.mvt` | `weather_time_series` |
| Hazards | `/api/v2/hazards/tiles/:z/:x/:y.mvt` | `hazard_events` |
| Internet cables | `/api/v2/infrastructure/cables/tiles/:z/:x/:y.mvt` | `infrastructure.cables` |

The backend uses `ST_TileEnvelope`, `ST_AsMVTGeom`, and `ST_AsMVT` in
`backend/src/services/vectorTileDb.mjs`. The current Cesium v2 renderer still
uses bounded JSON point/polyline fallback for fast integration; the MVT contract
is in place for the next rendering optimization step.

## JSON Allowed

JSON remains acceptable for:

- `/api/v2/source-health`
- selected flight/satellite/ship/cable/hazard details
- route/trace details
- small current weather/hazard lists with `limit`
- UI config and summaries

JSON is not acceptable for full raw files, large cable GeoJSON, full historical
time series, or high-volume live point arrays.

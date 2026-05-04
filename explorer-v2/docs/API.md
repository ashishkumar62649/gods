# API

Preferred namespace: `/api/v2`.

Legacy `/api/...` compatibility routes still exist while v1 behavior is being
rebuilt into domain routers.

## Health And Sources

| Route | Format | Notes |
| --- | --- | --- |
| `GET /api/v2/health` | JSON | Backend/cache health summary |
| `GET /api/v2/source-health` | JSON | DB weather source health where populated |

## Aviation

| Route | Format | Notes |
| --- | --- | --- |
| `GET /api/v2/aviation/flights` | JSON | Live aircraft list with metadata |
| `GET /api/v2/aviation/flights/live` | JSON | Alias to live aircraft list |
| `GET /api/v2/aviation/flights/live.bin` | Binary | Fixed-record live aircraft rendering payload |
| `GET /api/v2/aviation/airports` | JSON | Airport reference list |
| `GET /api/trace/:icao24` | JSON | OpenSky trace compatibility endpoint |
| `GET /api/route/:callsign` | JSON | OpenSky route compatibility endpoint |

## Satellites

| Route | Format | Notes |
| --- | --- | --- |
| `GET /api/v2/satellites` | JSON | Current propagated satellite states |
| `GET /api/v2/satellites/live.bin` | Binary | Fixed-record satellite rendering payload |

## Weather And Hazards

| Route | Format | Notes |
| --- | --- | --- |
| `GET /api/v2/weather/current` | JSON | DB current weather values |
| `GET /api/v2/weather/best-current` | JSON | DB best/current view |
| `GET /api/v2/weather/nearby` | JSON | Nearby weather/intel query |
| `GET /api/v2/weather/tiles/:z/:x/:y.mvt` | MVT | PostGIS weather vector tile |
| `GET /api/v2/hazards` | JSON | Active hazard events |
| `GET /api/v2/hazards/active` | JSON | Active hazard events |
| `GET /api/v2/hazards/tiles/:z/:x/:y.mvt` | MVT | PostGIS hazard vector tile |

## Maritime And Infrastructure

| Route | Format | Notes |
| --- | --- | --- |
| `GET /api/v2/maritime` | JSON | Maritime snapshot/GFW compatibility payload |
| `GET /api/v2/maritime/live.bin` | Binary | Fixed-record vessel rendering payload |
| `GET /api/v2/infrastructure` | JSON | Cables, vessels, derived infrastructure nodes |
| `GET /api/v2/infrastructure/cables/tiles/:z/:x/:y.mvt` | MVT | PostGIS cable vector tile |

## Locations

| Route | Format | Notes |
| --- | --- | --- |
| `GET /api/v2/locations` | JSON | Alias to nearby intel while dedicated router is built |

## Timeline Parameters

Frontend timeline mode adds these optional query parameters to non-live data
requests:

| Parameter | Values | Notes |
| --- | --- | --- |
| `timeMode` | `historical`, `forecast` | Sent by the frontend when not in live mode |
| `time` | ISO timestamp | The current timeline cursor |

Current routes tolerate these parameters. Weather and hazard SQL should apply
them next against `valid_time`, `observed_time`, `forecast_time`, and event
time windows.

## Error Shape

Database-backed routes return `503` with:

```json
{
  "error": "Weather intelligence database query failed.",
  "detail": "exact error",
  "meta": { "count": 0, "timestamp": 0 }
}
```

# GODS Explorer Source Audit

Audit date: 2026-04-30

This audit validates the sources listed in `DATA_SOURCE_REPORT.md` against the
current repository, local files, environment variables, and lightweight live
source probes.

## Method

- Inspected `server/`, `src/`, `.env.example`, `.env`, local data files, routes,
  fetchers, stores, and hardcoded URLs.
- Ran one safe live probe per source where possible: one tiny JSON request, one
  sample tile, one capabilities/index request, or one auth/login probe.
- Did not print secrets. Environment variables were checked only for presence.
- Did not run bulk downloads for GRIB2, NetCDF, GeoTIFF, or large historical data.

## Repository Source Map

Implemented backend sources:

- `server/services/fetchers.mjs`: Airplanes.live and custom expansion aircraft feed.
- `server/services/intelFetcher.mjs`: adsb.lol intel endpoints.
- `server/services/aircraftIndex.mjs`: local aircraft identity cache.
- `server/services/airportIndex.mjs`: local airport CSV index.
- `server/services/ClimateEngine.mjs`: OpenWeatherMap and RainViewer climate state.
- `server/services/infrastructureFetcher.mjs`: Submarine Cable Map GeoJSON.
- `server/services/gfwService.mjs`: Global Fishing Watch 4Wings presence reports.
- `server/services/shipFetcher.mjs`: AISStream WebSocket.
- `server/services/satelliteFetcher.mjs`: Space-Track GP/TLE catalog.
- `server/services/opensky.mjs`: OpenSky route/trace lookup.

Implemented frontend consumers:

- `src/core/api/telemetryApi.ts`: local flights, emergencies, maritime, airports, route, trace.
- `src/core/api/weatherApi.ts`: local climate state, RainViewer fallback, Open-Meteo point weather.
- `src/core/api/infrastructureApi.ts`: local infrastructure endpoint.
- `src/core/api/orbitalApi.ts`: local satellite endpoint.
- `src/engine/*Renderer.ts`: Cesium renderers.
- `src/ui/panels/GlobalLayerPanel.tsx`: polling and layer UI.

Missing source-management APIs:

- No implemented `/api/sources`.
- No implemented `/api/source-health`.
- No implemented `/api/layers/manifest`.
- `/api/health` exists and includes partial health for aircraft, airports, satellites, infrastructure, climate, emergencies, and intel.

## Environment Variable Presence

Checked `explorer/.env`; values were masked during audit and are not recorded here.

Present:

- `VITE_CESIUM_ION_TOKEN`
- `OPENSKY_CLIENT_ID`
- `OPENSKY_CLIENT_SECRET`
- `SPACETRACK_EMAIL`
- `SPACETRACK_PASSWORD`
- `AISSTREAM_API_KEY`
- `GFW_API_KEY`
- `VITE_MAPTILER_API_KEY`
- `VITE_MAPTILER_RAILWAY_STYLE_ID`
- `VITE_OWM_API_KEY`

Missing or blank:

- `NASA_FIRMS_MAP_KEY`
- `WINDY_WEBCAMS_API_KEY`
- `EARTHCAM_API_KEY`
- `EIA_API_KEY`
- `UN_COMTRADE_API_KEY`
- `ACLED_API_KEY`
- `OPENCHARGEMAP_API_KEY`
- `VITE_MAPBOX_ACCESS_TOKEN`
- `VITE_MAPBOX_USERNAME`
- `VITE_MAPBOX_METRO_STYLE_ID`
- `VITE_MAPBOX_RAILWAY_STYLE_ID`
- `VITE_MAPTILER_METRO_STYLE_ID`

## Local File Audit

| File | Exists | Size | Format observed | Records | Status | Notes |
| --- | --- | ---: | --- | ---: | --- | --- |
| `server/data/aircraft.csv.gz` | yes | 8,814,166 bytes | gzip, semicolon-delimited, positional/headerless CSV | 619,745 rows after first row | working | Current loader handles both comma and semicolon CSV. Real file shape is `icao24;registration;typecode;flags;description;...;owner`, not the standard header CSV from the initial plan. |
| `server/data/airports.csv` | yes | 12,599,516 bytes | comma CSV with headers | 85,202 data rows | working | Headers include `id`, `ident`, `type`, `name`, `latitude_deg`, `longitude_deg`, `iso_country`, `icao_code`, `iata_code`, `gps_code`, `local_code`. |
| `server/data/climate-state.json` | yes | 688 bytes | JSON | 1 state object | working | Keys: `timestamp`, `activeSource`, `precipitationUrl`, `temperatureUrl`, `cloudsUrl`, `windUrl`, `pressureUrl`; active source at audit time: `OWM`. |
| `server/data/v2.6-2026-04-14-ror-data.json` | yes | 280,698,271 bytes | large JSON | not parsed | present | Large local reference/infrastructure file. Not parsed in audit to avoid memory spike. |

## Current Source Audit Table

| Source | Category | Data type | Expected format | Access method | Key required | Env vars | Code location | Implementation | Live test | HTTP/error | Sample response shape | Notes | Recommended fallback |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Airplanes.live CDN | aviation | live aircraft positions | gzip JSON | backend fetch every 5s | no | none | `server/services/fetchers.mjs` | implemented | working | 200 | object keys: `now`, `messages`, `aircraft`; gzip 933,937 bytes, decompressed 4,436,320 bytes | Current backend correctly decompresses and normalizes via `normalizeReadsb`. | custom expansion API, OpenSky, adsb.lol |
| api.adsb.lol | aviation | aircraft intel flags | JSON | backend 10s polling | no | none | `server/services/intelFetcher.mjs` | implemented | working | 200 | object keys: `ac`, `msg`, `now`, `total`, `ctime`, `ptime` | Used for MIL/PIA/LADD/emergency enrichment. | local aircraft DB, Airplanes.live |
| Local aircraft DB | aviation | aircraft identity | gzip CSV | local streaming cache on boot | no | none | `server/services/aircraftIndex.mjs` | implemented | working | local file ok | semicolon positional rows | Works with real headerless semicolon file. Live polling uses sync `Map#get`. | adsb.lol/OpenSky metadata, ICAO hex only |
| Local airports DB / OurAirports | aviation | airports | CSV | local parse on boot; OurAirports backup download reachable | no | optional `AIRPORTS_CSV_PATH` | `server/services/airportIndex.mjs`, `/api/airports` | implemented | working | local file ok; OurAirports 200 | CSV headers valid | Frontend consumes local `/api/airports`. | OSM aeroway, nearest city |
| OpenWeatherMap | weather | weather map tiles | XYZ PNG tile | backend climate SSOT | yes, optional | `VITE_OWM_API_KEY`, `OWM_API_KEY`, `OPENWEATHER_API_KEY` | `server/services/ClimateEngine.mjs` | implemented | working with key | 200 | PNG tile magic bytes | Current `.env` has key. Climate state active source is `OWM`. | RainViewer, Open-Meteo |
| RainViewer | weather | radar fallback | JSON index + PNG tiles | backend and frontend fallback | no | none | `server/services/ClimateEngine.mjs`, `src/core/api/weatherApi.ts` | implemented | working | 200 | object keys: `version`, `generated`, `host`, `radar`, `satellite` | Used when OWM is unavailable. | Open-Meteo point weather |
| Open-Meteo | weather | point forecast and air quality | JSON | frontend direct fetch on map click | no | none | `src/core/api/weatherApi.ts`, `src/engine/WeatherInspectorRenderer.ts` | implemented | working | 200 | object keys: `latitude`, `longitude`, `current_units`, `current` | Frontend calls third-party directly; okay for no-key, but backend proxy would improve source health/provenance later. | OWM current weather if added |
| Submarine Cable Map | infrastructure | subsea cable routes | GeoJSON | backend refresh loop | no | none | `server/services/infrastructureFetcher.mjs` | implemented | working | 200 | object keys: `type`, `name`, `crs`, `features` | Backend caches normalized cables. Confirm terms before heavy use. | local cache, OSM cables |
| Global Fishing Watch | maritime | vessel presence/trade | JSON REST API | backend authenticated 4Wings report | yes | `GFW_API_KEY`, `GLOBAL_FISHING_WATCH_API_KEY`, `GFW_TOKEN` | `server/services/gfwService.mjs`, `/api/maritime` | implemented | working with key | 4Wings probe 200 | object keys: `total`, `entries`; rows include callsign/date/timestamps | Generic `/v3/datasets` probe returned 422, but the actual current 4Wings report shape works. | AISStream, MarineCadastre, OSM ports |
| AISStream | maritime | live AIS ships | WebSocket JSON | backend WebSocket subscription | yes | `AISSTREAM_API_KEY` | `server/services/shipFetcher.mjs` | implemented | working with key | WebSocket open/subscribed | stream subscription accepted | Probe opened and subscribed to a small bbox, then closed. | GFW, MarineCadastre |
| Space-Track | space | satellite GP/TLE catalog | JSON GP/TLE | backend login + cached GP fetch | yes/login | `SPACETRACK_EMAIL`, `SPACETRACK_USERNAME`, `SPACETRACK_PASSWORD` | `server/services/satelliteFetcher.mjs` | implemented | working with key | login 200 | login returned JSON object | Login worked. Full catalog fetch not repeated in audit to avoid unnecessary provider load. | stale local cache, CelesTrak later |
| OpenSky | aviation | route/trace lookup | JSON REST API | backend OAuth optional | optional | `OPENSKY_CLIENT_ID`, `OPENSKY_CLIENT_SECRET` | `server/services/opensky.mjs`, `/api/route`, `/api/trace` | implemented | working with key | OAuth 200 | object keys: `access_token`, `expires_in`, `token_type`, `scope` | Route/trace calls are backend-only; fallback estimates destination from live flight + airport index when route missing. | local route estimation |
| Cesium ion | terrain/imagery | terrain, imagery, 3D tiles | ion assets | frontend Cesium token | yes | `VITE_CESIUM_ION_TOKEN`, `CESIUM_ION_TOKEN` | `src/earth/viewer/viewerConfig.ts`, `src/engine/ViewerRuntime.ts` | implemented | failing probe | asset API 403 | object keys: `code`, `message` | Token exists, but direct asset API probe returned 403. Review token scopes/domain restrictions. Runtime may still work if token is scoped differently. | ArcGIS/OSM imagery, no terrain fallback yet |
| ArcGIS basemaps | imagery | public basemap imagery | service JSON / tiles | frontend Cesium provider | usually no | none | `src/earth/viewer/imageryOptions.ts` | implemented | working | 200 | service JSON with `layers`, `tileInfo`, `fullExtent` | Public basemap endpoint reachable. | OSM, Cesium ion |
| OpenStreetMap tiles | imagery/infrastructure | base map tiles | PNG tile | frontend provider | no | none | `src/earth/viewer/imageryOptions.ts` | implemented | working | 200 | PNG tile | Reachable sample tile. Respect tile policy and avoid heavy direct usage. | ArcGIS, Natural Earth |
| Stadia Maps | imagery | basemap tiles | PNG tile | frontend provider | yes/account for production | `STADIA_MAPS_API_KEY` not currently read | `src/earth/viewer/imageryOptions.ts` | partially implemented | blocked by auth | 401 | PNG error tile | Code currently uses public Stadia URLs without key. Production use should add key handling or hide when unavailable. | OSM, ArcGIS |
| MapTiler | imagery | satellite/transit tiles | JPEG/TileJSON/XYZ | frontend provider | yes | `VITE_MAPTILER_API_KEY`, style IDs | `src/earth/viewer/imageryOptions.ts`, `src/engine/TransitRenderer.ts` | implemented | working with key | 200 | JPEG tile | Satellite tile works. Railway style ID present; metro style ID missing. | ArcGIS, OSM |
| Custom expansion API | custom | custom aircraft feed | JSON | backend optional fetch | optional | `CUSTOM_API_URL`, `CUSTOM_API_KEY`, `GODS_EXPANSION_API_KEY` | `server/services/fetchers.mjs` | implemented | missing URL | not configured | not tested | No custom URL configured. Supports `states`, `ac`, `aircraft`, or bare array. | Airplanes.live |

## Future and Expansion Source Audit Table

| Source | Category | Data type | Expected format | Access method | Key required | Env vars | Code location | Implementation | Live test | HTTP/error | Sample response shape | Notes | Recommended fallback |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| USGS Earthquake API | hazards | earthquakes | GeoJSON | future backend source | no | none | placeholder `server/sources/hazards/usgsEarthquakesSource.mjs` | referenced but not implemented | working | 200 | object keys: `type`, `metadata`, `features`, `bbox` | Best next no-key hazard layer. | GDACS, EMSC |
| NASA FIRMS | hazards | active fires | CSV/KML/map services | future backend source | yes/free | `NASA_FIRMS_MAP_KEY` | placeholder `server/sources/hazards/nasaFirmsSource.mjs` | referenced but not implemented | missing key | skipped | none | Add BYOK workflow before implementation. | Copernicus EMS, NOAA HMS |
| NASA GIBS | imagery | satellite imagery | WMTS/WMS/TMS | future imagery source | no for many layers | none | placeholder `server/sources/weather/nasaGibsSource.mjs` | referenced but not implemented | working | 200 | WMTS XML capabilities | Good no-key imagery expansion; capabilities document is large. | GOES/Himawari/Meteosat |
| GDELT | events | news/events | JSON/CSV/BigQuery | future backend source | no | none | placeholder `server/sources/news/gdeltSource.mjs` | referenced but not implemented | blocked/rate limited | 429 | provider says limit requests | Needs throttling/cache and backoff. | ReliefWeb, GDACS, RSS |
| Natural Earth | infrastructure | boundaries/coastlines | Shapefile/GeoPackage | future local download/import | no | none | placeholder `server/sources/geo/naturalEarthSource.mjs` | referenced but not implemented | working | 200 | HTML downloads page | Use as downloaded static dataset, not live API. | OSM/Geofabrik |
| Geofabrik | infrastructure | OSM extracts | OSM PBF/shapefile | future download/import | no | none | placeholder `server/sources/geo/osmSource.mjs` | referenced but not implemented | working | 200 | HTML index | Use for region extracts instead of Overpass-heavy workflows. | OSM live tiles |
| WorldPop | population | population grids | GeoTIFF/API metadata | future raster import | no | none | placeholder `server/sources/population/worldpopSource.mjs` | referenced but not implemented | working | 200 | object key: `data` | Requires raster/zonal processing for real exposure analysis. | World Bank country population |
| HDX | events/population | humanitarian datasets | CKAN JSON/CSV/GeoJSON | future backend source | usually no | none | placeholder `server/sources/population/hdxSource.mjs` | referenced but not implemented | blocked | 406 | error: blocked due to bot activity | Current environment is blocked. Need provider-compliant app identity or manual dataset downloads. | ReliefWeb, OCHA COD downloads |
| ReliefWeb | events | humanitarian reports | JSON API | future backend source | no | none | placeholder `server/sources/news/reliefwebSource.mjs` | referenced but not implemented | blocked | 406 | same HDX bot block response | Current environment blocked. Need provider-compliant access pattern. | GDELT, GDACS |
| GDACS | hazards | disaster alerts | RSS/XML | future backend source | no | none | placeholder `server/sources/hazards/gdacsSource.mjs` | referenced but not implemented | working | 200 | RSS XML | Good fallback disaster feed. | USGS/FIRMS/ReliefWeb |
| ACLED | events | conflict/protest events | API/CSV | future backend source | yes | `ACLED_API_KEY` | placeholder `server/sources/news/acledSource.mjs` | referenced but not implemented | missing key | skipped | none | BYOK only. Do not enable by default. | GDELT |
| Mobility Database | infrastructure | GTFS feed catalog | API/GTFS/GBFS | future backend source | usually no | feed-specific | none | not implemented | docs working; API attempt failed | API fetch failed; homepage 200 | HTML homepage | Need confirm current catalog API endpoint before coding. | GTFS agency feeds |
| GTFS static | infrastructure | transit schedules | ZIP of CSV | future backend source | agency-dependent | varies | none | not implemented | working docs | 200 | HTML docs | Implement feed-specific registry, not one global source. | Mobility Database |
| GTFS Realtime | infrastructure | live transit | protobuf | future backend source | agency-dependent | varies | none | not implemented | working docs | 200 | HTML docs | Needs protobuf parser and feed registry. | GTFS static |
| OpenRailwayMap / OSM rail | infrastructure | rail infrastructure | OSM data / tiles | future source | no for OSM data | none | current transit renderers use MapTiler/Mapbox, not ORM | not implemented | working | 200 | HTML page | Use OSM/Geofabrik for data; do not scrape tile service. | Geofabrik rail extraction |
| MarineCadastre AIS | maritime | U.S. AIS history | GIS downloads | future source | no | none | placeholder `server/sources/maritime/marineCadastreSource.mjs` | referenced but not implemented | working | 200 | HTML page | Good historical fallback for U.S. waters. | AISStream/GFW |
| World Bank API | economy | country indicators | JSON/XML/CSV | future backend source | no | none | placeholder `server/sources/economy/worldbankSource.mjs` | referenced but not implemented | working | 200 | array response with metadata + data | Good for country context. | IMF |
| IMF API | economy | macro indicators | SDMX/API | future backend source | usually no | none | placeholder `server/sources/economy/imfSource.mjs` | referenced but not implemented | docs reachable; old API failed | API fetch failed; docs 200 | HTML docs | Use current IMF API docs before implementation; old SDMX endpoint failed from this environment. | World Bank |
| UN Comtrade | economy | trade data | JSON/CSV | future backend source | yes/free | `UN_COMTRADE_API_KEY` | placeholder `server/sources/economy/uncomtradeSource.mjs` | referenced but not implemented | missing key | skipped | none | BYOK source. | World Bank, IMF |
| EIA Open Data | economy | energy data | JSON/bulk | future backend source | yes for API | `EIA_API_KEY` | none | not implemented | missing key | skipped | none | BYOK source; bulk files may be keyless. | OpenInfraMap + World Bank |
| OpenInfraMap / OSM infra | infrastructure | power/substation/pipeline/telecom | OSM-derived | future import/reference | no if using OSM | none | none | not implemented | working | 200 | HTML page | Use OSM/Geofabrik as actual ingest source. | OSM/Geofabrik |
| Open Charge Map | infrastructure | EV chargers | JSON/KML | future backend source | yes/free | `OPENCHARGEMAP_API_KEY` | none | not implemented | missing key | skipped | none | Optional infrastructure layer. | OSM charging POIs |
| Copernicus Land | infrastructure | land/environment rasters | GeoTIFF/NetCDF | future heavy import | varies | none | none | not implemented | working | 200 | HTML page | Heavy processing; not MVP. | Natural Earth/OSM |
| USGS Landsat | imagery | satellite imagery | GeoTIFF/COG | future heavy import | varies | none | none | not implemented | blocked | 403 | HTML error | Public site blocked this probe; use official data access route when implementing. | NASA GIBS |
| NOAA GFS | weather | forecast model | GRIB2 | future heavy ingest | no | none | none | not implemented | working | 200 | directory HTML | Needs GRIB2 processing and tile generation. | Open-Meteo, OWM |
| DWD ICON | weather | forecast model | GRIB2 | future heavy ingest | no | none | none | not implemented | working | 200 | directory HTML | Needs GRIB2 processing. | NOAA GFS |
| ECMWF Open Data | weather | forecast model | GRIB2/BUFR | future heavy ingest | no for open products | none | none | not implemented | working | 200 | directory HTML | Needs model-data processing. | GFS/ICON |
| NOAA NEXRAD | weather | U.S. radar | Level II/III | future heavy ingest | no | none | none | not implemented | bucket root blocked | 403 | S3 AccessDenied | Registry docs reachable; direct root listing denied. Use documented object paths/bucket access pattern. | RainViewer/MRMS |
| NOAA MRMS / NOAA Open Data | weather | precipitation/severe weather | GRIB2 | future heavy ingest | no | none | none | not implemented | working docs | 200 | HTML registry page | Needs GRIB2 processing. | RainViewer/NEXRAD |
| NOAA GOES | imagery | geostationary satellite | NetCDF | future heavy ingest | no | none | none | not implemented | working | 200 | S3 XML listing | Heavy NetCDF processing. | NASA GIBS |
| Himawari | imagery | Asia-Pacific satellite | NetCDF/HSD | future heavy ingest | usually no | none | none | not implemented | working | 200 | S3 XML listing | Heavy processing; useful for India/Asia-Pacific. | NASA GIBS |
| EUMETSAT / Meteosat | imagery | Meteosat products | product-dependent | future heavy ingest | registration varies | none | none | not implemented | working docs | 200 | HTML app shell | Registration/workflow likely needed for products. | NASA GIBS |
| Windy Webcams | cameras | public webcams | JSON/images/embeds | future backend source | yes/free | `WINDY_WEBCAMS_API_KEY` | none | not implemented | missing key | skipped | none | Best first camera source. | City open-data cameras |
| EarthCam | cameras | scenic webcams | embed/API/player | future source | partner/key varies | `EARTHCAM_API_KEY` | none | not implemented | docs working | 200 | HTML docs | Partner-oriented. Optional only. | Windy/city cameras |
| City open-data cameras | cameras | official public webcam links | JSON/CSV/ArcGIS/Socrata | future source | usually no | none | none | not implemented | working | 200 | object keys: `total_count`, `results` | Vancouver sample works. Add city-by-city source registry. | Windy Webcams |
| OpenDataCam | cameras | self-hosted visual analysis | local API/output | future tool | no | none | none | not implemented | working docs | 200 | HTML docs | Tool, not a public camera feed. Use only on allowed streams. | none |

## Frontend/Backend Compatibility Findings

| Area | Status | Finding |
| --- | --- | --- |
| Backend normalization | partial | Implemented sources are normalized for flights, aircraft identities, airports, cables, ships, satellites, weather tiles, and emergencies. Future sources only have placeholders. |
| Frontend third-party access | mixed | Most live feeds go through backend. Open-Meteo point weather is called directly from frontend. Basemap/tile providers are frontend direct by design. |
| Source health | missing | `/api/health` exists, but there is no source registry-backed `/api/source-health` or `/api/sources`. |
| Layer sidebar status | partial | Sidebar shows toggles, but does not consistently show missing-key/stale/degraded source states. Weather wiring still needs cleanup because `WeatherLayerAccordion` and `WeatherRenderer` use different stores. |
| Fallback UI | partial | Backend has real OWM -> RainViewer fallback and aircraft missing-file fallbacks. UI fallback labels are incomplete. |
| Key hygiene | fixed in this audit | `.env.example` contained a real-looking Cesium token value. It was blanked and new optional env vars were added. |

## Recommended Next Fixes

1. Add a real `/api/source-health` route backed by `sourceRegistry.ts`.
2. Fix weather UI wiring so weather controls toggle `useClimateStore.activeLayers`, not only `useWeatherLayerStore.activeLayer`.
3. Add missing-key/stale/degraded labels to the layer sidebar.
4. Re-check Cesium ion token scopes because the direct asset API probe returned 403.
5. Add USGS Earthquakes next; it is no-key, GeoJSON, reachable, and not heavy.
6. Add NASA FIRMS only after adding `NASA_FIRMS_MAP_KEY` BYOK UI/documentation.
7. Treat GDELT, HDX, and ReliefWeb carefully with cache/backoff because the live probes hit rate-limit or bot-block responses.


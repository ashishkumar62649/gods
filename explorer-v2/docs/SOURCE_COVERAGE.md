# Source Coverage

This inventory combines v1 discovered sources with candidate sources from
`https://github.com/public-apis/public-apis`. Candidate sources are not production
sources until a fetcher, normalizer, loader, backend route, frontend layer, and
smoke result exist.

| Source | Domain | v1 file | v2 fetcher/logic | v2 normalizer | v2 loader | DB table/view | Backend route | Frontend layer/panel | Auth | Status | Last smoke |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| airplanes.live CDN | aviation | `server/services/fetchers.mjs` | `backend/src/services/fetchers.mjs` | `domain/normalizers/normalizer.mjs` | pending DB repository | `aviation.live_flight_snapshots` | `/api/v2/aviation/flights`, `/live.bin` | `LiveFlightRenderer`, asset panel | No | partial | backend route contract only |
| adsb.lol intel feeds | aviation | `server/services/intelFetcher.mjs` | copied backend service | `mergeIntel` | pending DB repository | `aviation.live_flight_snapshots.payload` | `/api/v2/aviation/flights` | flight flags/render styling | No | partial | not separately tested |
| OpenSky | aviation | `server/services/opensky.mjs` | copied backend service | trace/route adapters | none | future route/trace tables | `/api/trace/:icao24`, `/api/route/:callsign` | selected trail support | No, account improves limits | partial | route only |
| OurAirports | aviation | `server/services/airportIndex.mjs` | copied backend service | CSV parser | pending Python/reference loader | `aviation.airports` | `/api/v2/aviation/airports` | flight airport markers | No | partial | local file present |
| Space-Track GP | satellites | `server/services/satelliteFetcher.mjs` | copied backend service | `orbitPropagator.mjs` | pending DB repository | `satellites.tle_catalog`, `satellites.state_snapshots` | `/api/v2/satellites`, `/live.bin` | `LiveIntelEntityRenderer` satellite points | Yes | blocked | needs credentials |
| CelesTrak | satellites | not primary v1 | candidate fallback | pending | pending | `satellites.tle_catalog` | future | future | No | candidate | not run |
| Open-Meteo | weather | `source-fetchers/weather/open_meteo_fetcher.mjs` | `pipelines/weather/fetchers/open_meteo_fetcher.py` | `normalize_weather.py` | `load_weather_to_postgres.py` | `weather_time_series`, `best_current_values` | `/api/v2/weather/current` | weather points/toggles | No | partial | dry-run fetch worked previously; plan test now non-writing |
| NOAA NWS alerts | weather/hazards | `source-fetchers/weather/noaa_nws_fetcher.mjs` | `pipelines/weather/fetchers/noaa_nws_fetcher.py` | pending alert adapter | pending | `hazards.events` / `hazard_events` | `/api/v2/hazards` | hazard layer | No | partial fetcher | not run |
| NOAA GFS/NODD | weather | `noaa_nodd_gfs_fetcher.mjs` | `noaa_gfs_fetcher.py` scaffold | pending | pending | weather grids/time series | future tiles | weather layers | No | pending | not run |
| NOAA GOES | weather | `noaa_goes_fetcher.mjs` | pending Python | pending | pending | weather raster metadata | future tiles | clouds/satellite | No | pending | not run |
| NOAA radar | weather | `noaa_radar_fetcher.mjs` | pending Python | pending | pending | tile/source metadata | future tiles | radar layer | No | pending | not run |
| NOAA SPC | hazards | `noaa_spc_fetcher.mjs` | pending Python | pending | pending | `hazards.events` | `/api/v2/hazards` | storms toggle | No | pending | not run |
| NOAA cyclone | hazards | `noaa_cyclone_fetcher.mjs` | pending Python | pending | pending | `hazards.events` | `/api/v2/hazards` | storms toggle | No | pending | not run |
| NOAA marine | weather/maritime | `noaa_marine_fetcher.mjs` | pending Python | pending | pending | weather/ocean tables | future | marine layer | No | pending | not run |
| NOAA NWPS | weather/hydro | `noaa_nwps_fetcher.mjs` | pending Python | pending | pending | hydrology/ocean tables | future | hydrology toggle | No | pending | not run |
| NOAA DART | hazards/ocean | `noaa_dart_fetcher.mjs` | pending Python | pending | pending | hydrology/ocean tables | future | hazard layer | No | pending | not run |
| NASA GIBS | weather imagery | `nasa_gibs_fetcher.mjs` | pending Python | pending | pending | raster metadata | future tiles | satellite/weather layer | No | pending | not run |
| NASA FIRMS | fires | `nasa_firms_fetcher.mjs` | `nasa_firms_fetcher.py` plan | pending | pending | `hazards.events` | `/api/v2/hazards` | wildfires toggle | API key/MAP_KEY | blocked | not run |
| NASA Earthdata MODIS | weather/fire | `nasa_earthdata_modis_fetcher.mjs` | pending Python | pending | pending | raster/fire tables | future | fire/weather layer | Earthdata auth often required | blocked | not run |
| USGS Earthquake | hazards | `usgs_earthquake_fetcher.mjs` | `usgs_earthquake_fetcher.py` | `normalize_hazards.py` | `load_hazards_to_postgres.py` | `hazards.events` | `/api/v2/hazards` | earthquakes toggle | No | partial | plan test passes; real dry-run available |
| USGS Water | hydrology | `usgs_water_fetcher.mjs` | `usgs_water_fetcher.py` scaffold | pending | pending | `hydrology_time_series` | future | hydrology toggle | No | pending | not run |
| USGS Volcano | volcano | `usgs_volcano_fetcher.mjs` | pending Python | pending | pending | `hazards.events` | `/api/v2/hazards` | volcano toggle | No | pending | not run |
| Smithsonian GVP | volcano | `smithsonian_gvp_fetcher.mjs` | pending Python | pending | pending | `hazards.events` | `/api/v2/hazards` | volcano toggle | No/public data | pending | not run |
| GDACS | hazards | `gdacs_fetcher.mjs` | pending Python | pending | pending | `hazards.events` | `/api/v2/hazards` | hazards toggle | No | pending | not run |
| RainViewer | weather imagery | `rainviewer_fetcher.mjs`, `server/sources/weather/rainviewerSource.mjs` | pending Python; backend source copied | pending | pending | raster metadata | future tile metadata | radar layer | No | pending | not run |
| OpenAQ | air quality | `openaq_fetcher.mjs` | pending Python | pending | pending | `air_quality_time_series` | `/api/v2/weather` future | airQuality toggle | API key per public-apis | blocked | not run |
| WorldPop | population | `worldpop_fetcher.mjs` | pending Python | pending | pending | `population` schema | future | exposure panels | Mixed/no-auth downloads | pending | not run |
| Copernicus Land/CLMS | land/weather | `copernicus_land_clms_fetcher.mjs` | pending Python | pending | pending | weather/infrastructure | future | land layer | Auth/config required | blocked | not run |
| Global Fishing Watch | maritime | `server/services/gfwService.mjs` | copied backend service | service adapter | pending DB repository | `maritime.*` | `/api/v2/maritime` | vessel layer | API key/token | blocked | warmup can fail without key |
| AISStream | maritime | `server/services/shipFetcher.mjs` | copied backend service | service adapter | pending DB repository | `maritime.position_snapshots` | `/api/v2/maritime/live.bin` | vessels toggle | API key | blocked | needs key |
| Submarine Cable Map | infrastructure | `server/services/infrastructureFetcher.mjs` | copied backend service | service adapter | pending DB repository | `infrastructure.cables` | `/api/v2/infrastructure`, `/cables/tiles` | internetCables toggle | No | partial | cache route only |

## public-apis Candidate Sources

These were discovered from `public-apis/public-apis` and should be considered
for future onboarding. API key requirements are copied from the catalog and must
be verified before use.

| Candidate | Domain | Auth in public-apis | Why useful |
| --- | --- | --- | --- |
| OpenSky Network | aviation | No | Alternate/free real-time ADS-B aviation source. |
| AviationAPI | aviation | No | FAA charts, airport information, and aviation weather. |
| apilayer aviationstack | aviation | OAuth | Commercial flight status/global aviation data. |
| AIS Hub | maritime | apiKey | Real-time AIS vessel data candidate. |
| Open-Meteo | weather | No | Global forecast/current API, already active in v2. |
| US Weather / NWS | weather | No | Official US weather API, already planned. |
| AviationWeather | weather/aviation | No | NOAA aviation forecasts and observations. |
| RainViewer | weather | No | Radar data and tile metadata. |
| Pirate Weather | weather | No | Forecast source similar to Dark Sky. |
| Weatherstack | weather | apiKey | Commercial current/historical weather candidate. |
| OpenWeatherMap | weather | apiKey | Weather tiles/current data; v1 supports key-based tiles. |
| Storm Glass | weather/marine | apiKey | Marine weather candidate. |
| OpenAQ | air quality | apiKey | Air quality data; key requirement noted. |
| IQAir | air quality | apiKey | Weather and air quality candidate. |
| USGS Earthquake Hazards Program | hazards | No | Active earthquake feed, now Python pipeline target. |
| USGS Water Services | hydrology | No | Water quality/level source. |
| NASA | space/weather | No in catalog | NASA imagery/data candidate; endpoint-specific keys can apply. |
| TLE | satellites | No | Satellite info/TLE candidate fallback. |
| Launch Library 2 | space/events | No | Launch and event context. |
| ISRO | space | No | Spacecraft metadata candidate. |
| Queimadas INPE | fires | No | Wildfire heat focus candidate. |
| Nominatim | geocoding | No | Search/geocoding fallback. |
| Geoapify | geocoding | apiKey | Geocoding/address autocomplete candidate. |
| OpenStreetMap | geospatial | OAuth | OSM API data source; use extracts where possible. |

## Coverage Rules

- No source is production-complete until it has fetcher, normalizer, validator, loader, DB target, API route, frontend layer/panel, source health entry, and smoke result.
- Credential-blocked sources must expose env vars in `.env.example` and remain documented here.
- Huge source outputs stay under `data_raw`, `data_processed`, or `data_normalized`; never under `src`.

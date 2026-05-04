

<!-- ============================================== --><!-- CONTENT FROM: DATA_SOURCE_REPORT.md --><!-- ============================================== -->

# God Eyes Data Source Report

This is the official data-source inventory for God Eyes. It explains where the
project gets data, what format each source uses, which sources require API keys,
what fallbacks exist, and how future sources should be added safely.

## 1. Open-Source API Key Policy

Because God Eyes is an open-source project, the default experience should work
without paid services whenever possible.

Priority model:

```text
Free/no-key source first
-> free-account/free-key source second
-> paid/BYOK source third
-> fallback source always available
```

Product model:

```text
Default experience: works without keys
Enhanced experience: user adds their own API keys
Developer mode: advanced users connect premium/free-trial APIs
```

| Key type | Meaning | How to handle |
| --- | --- | --- |
| No key | Works immediately for every user | Enable by default |
| Free key | User signs up for a free API key/account | Show as recommended |
| Free trial / freemium | Better quality, but limited quota | BYOK only |
| Paid key | Not required for core app | Optional plugin |
| Local file | Bundled or downloaded dataset | Best for stable reference data |

Never commit real keys into GitHub. Use `.env` only.

Recommended environment variables:

```env
OPENWEATHER_API_KEY=
CESIUM_ION_TOKEN=
MAPTILER_API_KEY=
STADIA_MAPS_API_KEY=
GFW_TOKEN=
AISSTREAM_API_KEY=
SPACETRACK_USERNAME=
SPACETRACK_PASSWORD=
OPENSKY_CLIENT_ID=
OPENSKY_CLIENT_SECRET=
NASA_FIRMS_MAP_KEY=
EIA_API_KEY=
UN_COMTRADE_API_KEY=
ACLED_API_KEY=
GODS_EXPANSION_API_KEY=
```

Current repo variable names may differ slightly. Keep compatibility aliases where
needed, such as `VITE_OWM_API_KEY`, `OWM_API_KEY`, `GFW_API_KEY`,
`GLOBAL_FISHING_WATCH_API_KEY`, `SPACETRACK_EMAIL`, and `SPACETRACK_PASSWORD`.

## 2. Current Data Sources

| # | Source | Data type | Format | API key needed? | Website / docs | Notes / fallback |
| -: | --- | --- | --- | --- | --- | --- |
| 1 | Airplanes.live CDN / API | Live aircraft positions | `aircraft.json.gz`, JSON, REST JSON | No for current CDN approach | [airplanes.live API docs](https://airplanes.live/api-guide/) | Primary aircraft feed. Cache on backend and avoid direct frontend polling. |
| 2 | api.adsb.lol | Aircraft intel flags and ADS-B metadata | JSON | No | [adsb.lol API](https://api.adsb.lol/) | Backup/enrichment source for military, LADD, PIA, and emergency-style aircraft intelligence. |
| 3 | Local aircraft database | Aircraft identity, registration, type, owner/operator | `aircraft.csv.gz` local gzip CSV | No | Local file | Keep local so identity lookup works even if live feeds fail. |
| 4 | Local airports database / OurAirports | Airports, locations, metadata | `airports.csv` local CSV | No | [OurAirports data](https://ourairports.com/data/) | Strong public backup for airport CSV datasets. |
| 5 | OpenWeatherMap Weather Maps | Weather map tiles: precipitation, temperature, clouds, wind, pressure | XYZ PNG tile URL | Yes, optional | [OpenWeather Weather Maps](https://openweathermap.org/api/weather-map-2) | Enhanced BYOK weather source. Fallback to RainViewer/Open-Meteo when missing. |
| 6 | RainViewer | Radar fallback and precipitation animation | JSON index + PNG tiles | No for public/personal/educational use | [RainViewer API](https://www.rainviewer.com/api/weather-maps-api.html) | Great fallback radar layer. Show source status because availability is not guaranteed. |
| 7 | Open-Meteo | Point weather click, forecast, temperature, wind, humidity, pressure, air quality | JSON | No | [Open-Meteo](https://open-meteo.com/) | Best no-key weather API for click-location cards and fallback forecasts. |
| 8 | Submarine Cable Map / TeleGeography-derived endpoints | Subsea cable routes and landing points | GeoJSON / JSON | No for public map endpoints, but usage should be cautious | [Submarine Cable Map](https://www.submarinecablemap.com/) | Cache locally and confirm terms before heavy use. |
| 9 | Global Fishing Watch | Maritime trade vessels, fishing activity, ocean activity | JSON REST API | Yes, free registration/token for many non-commercial APIs | [Global Fishing Watch APIs](https://globalfishingwatch.org/our-apis/) | Good maritime intelligence source. Backend-only token usage. |
| 10 | AISStream | Live AIS ships | WebSocket JSON | Yes, free API key | [AISStream docs](https://aisstream.io/documentation) | Great live ship feed. Connect backend to WebSocket, not frontend. |
| 11 | Space-Track | Satellites, GP/TLE records, orbital data | JSON, TLE, CSV-like responses depending query | Yes, account email + password/session | [Space-Track docs](https://www.space-track.org/documentation) | Backend only. Primary source for satellite catalog/orbit data. |
| 12 | OpenSky | Route/trace lookup, arrivals/departures, aircraft states | JSON REST API | Optional OAuth credentials; anonymous access may be limited | [OpenSky REST API](https://openskynetwork.github.io/opensky-api/rest.html) | Backup for route/trace/history. OAuth recommended for programmatic access. |
| 13 | Cesium ion | Terrain, 3D Tiles, Cesium assets | Terrain / imagery / 3D Tiles | Yes, Cesium ion access token | [Cesium ion tokens](https://cesium.com/learn/ion/cesium-ion-access-tokens/) | Core terrain/3D asset provider if using Cesium World Terrain and OSM buildings. |
| 14 | ArcGIS basemaps | Base imagery / map tiles | Raster/vector tiles | Usually no key for many public basemaps; check terms | [ArcGIS maps](https://www.arcgis.com/) | Good basemap fallback. Do not depend on one imagery provider. |
| 15 | OpenStreetMap | Roads, buildings, POIs, infrastructure, rail, airports, ports | OSM PBF, OSM XML, GeoJSON via tools | No | [OpenStreetMap](https://www.openstreetmap.org/) | Best open base infrastructure source. For large regions, use Geofabrik extracts instead of heavy Overpass queries. |
| 16 | Stadia Maps | Map tiles / vector tiles | Raster/vector tiles | Yes/account key for most production use | [Stadia Maps auth docs](https://docs.stadiamaps.com/authentication/) | Optional BYOK/free-tier basemap provider. |
| 17 | MapTiler | Map tiles, satellite, vector/raster styles | TileJSON, XYZ, WMTS | Yes, API key | [MapTiler Tiles API](https://docs.maptiler.com/cloud/api/tiles/) | Optional/free-tier BYOK basemap and transit tile provider. |
| 18 | Custom expansion API | Custom fused intelligence feed | JSON | Optional, depends on user API | User-defined | Project abstraction layer for user-owned or premium feeds. |

## 3. Recommended Expansion Sources

These sources should be added after the current aviation/weather/maritime/satellite
foundation is stable.

| # | Source | Data type | Format | API key needed? | Website / docs | Use in God Eyes |
| -: | --- | --- | --- | --- | --- | --- |
| 19 | USGS Earthquake API | Earthquakes, magnitude, depth, location, metadata | GeoJSON, CSV, QuakeML | No | [USGS GeoJSON feeds](https://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php) | Add earthquake hazard layer. Easy high-value addition. |
| 20 | NASA FIRMS | Active fires from VIIRS/MODIS/Landsat | CSV, KML, map services | Yes, free MAP_KEY | [NASA FIRMS API](https://firms.modaps.eosdis.nasa.gov/api/) | Wildfire/active fire layer. Good BYOK source. |
| 21 | NASA GIBS | Satellite imagery, Earth observation layers | WMTS, WMS, TWMS, TMS/XYZ-style tiles | No for many public layers | [NASA GIBS API](https://www.earthdata.nasa.gov/engage/open-data-services-software/earthdata-developer-portal/gibs-api) | Satellite/cloud/smoke/dust/fire imagery. |
| 22 | GDELT | News/events, themes, locations, entity mentions, media signals | JSON APIs, CSV exports, BigQuery datasets | No | [GDELT data/APIs](https://www.gdeltproject.org/data.html) | News/event intelligence, "what changed here", corroboration. |
| 23 | Natural Earth | Country borders, coastlines, admin boundaries, rivers, populated places | Shapefile, SQLite, GeoPackage, raster | No | [Natural Earth downloads](https://www.naturalearthdata.com/downloads/) | Lightweight world boundaries and labels. |
| 24 | Geofabrik OSM Extracts | Regional OSM roads, buildings, POIs, railways, power lines | `.osm.pbf`, shapefile | No | [Geofabrik downloads](https://download.geofabrik.de/) | Offline/imported infrastructure without large Overpass queries. |
| 25 | WorldPop | Population density and demographic grids | GeoTIFF, CSV for some datasets, metadata API | No | [WorldPop API](https://www.worldpop.org/sdi/introapi/) | Population exposure: people near fire/storm/earthquake. |
| 26 | HDX / Humanitarian Data Exchange | Humanitarian datasets, admin boundaries, crisis indicators | CSV, GeoJSON, XLSX, Shapefile, CKAN API | Usually no for public datasets | [HDX](https://data.humdata.org/) | Crisis boundaries, displacement, health, food security. |
| 27 | ReliefWeb | Humanitarian reports, disaster updates, situation reports | JSON API | No for public API reads | [ReliefWeb API](https://apidoc.reliefweb.int/v0/index.html) | Backup to GDELT for disaster/humanitarian reports. |
| 28 | GDACS | Global disaster alerts: earthquakes, cyclones, floods, volcanoes | Feeds/API, XML/JSON depending endpoint | Usually no | [GDACS](https://www.gdacs.org/) | Backup global disaster alert layer. |
| 29 | ACLED | Political violence, protests, conflict events | API / CSV export | Yes, myACLED account/auth | [ACLED API docs](https://acleddata.com/acled-api-documentation) | Optional BYOK conflict layer. High value but not default no-key. |
| 30 | Mobility Database | GTFS, GTFS-Realtime, GBFS feed catalog | Catalog API, GTFS ZIP, GTFS-RT protobuf, GBFS JSON | Usually no; feed-specific keys may exist | [Mobility Database](https://mobilitydatabase.org/) | Transit feeds, city mobility, railway/bus/metro layers. |
| 31 | GTFS static feeds | Stops, routes, trips, schedules | ZIP of CSV files | Usually no, agency-dependent | [GTFS reference](https://gtfs.org/schedule/) | Public transit schedules. |
| 32 | GTFS Realtime | Vehicle positions, trip updates, service alerts | Protocol Buffers | Sometimes agency key | [GTFS Realtime](https://gtfs.org/realtime/) | Live transit vehicles and alerts. |
| 33 | OpenRailwayMap / OSM rail data | Rail lines, stations, electrification, signals | OSM PBF/GeoJSON, map tiles for display | No for OSM data | [OpenRailwayMap](https://www.openrailwaymap.org/) | Railway infrastructure. Ingest actual data from OSM/Geofabrik. |
| 34 | MarineCadastre AIS | U.S. AIS vessel traffic history | File geodatabase / GIS downloads | No | [MarineCadastre AIS](https://marinecadastre.gov/accessais/) | Backup/historical source for U.S. waters. |
| 35 | World Bank Indicators API | Country stats: population, GDP, energy, infrastructure, health | JSON, XML, CSV | No | [World Bank API docs](https://datahelpdesk.worldbank.org/knowledgebase/articles/889392-about-the-indicators-api-documentation) | Country-level context and risk indicators. |
| 36 | IMF Data API | Macroeconomic indicators | SDMX API | Usually no | [IMF API](https://data.imf.org/en/Resource-Pages/IMF-API) | Macroeconomic/country context. |
| 37 | UN Comtrade | Trade/import/export data | API JSON/CSV | Yes, free API key/registration | [UN Comtrade developer portal](https://comtradedeveloper.un.org/) | Trade/supply-chain intelligence. |
| 38 | EIA Open Data | Energy, electricity, petroleum, gas, prices | JSON API, bulk downloads | Yes for API key; bulk downloads may be keyless | [EIA Open Data](https://www.eia.gov/opendata/) | Energy-market and infrastructure context. |
| 39 | OpenInfraMap / OSM infrastructure | Power lines, substations, pipelines, telecoms | OSM-derived data | No if ingesting from OSM | [OpenInfraMap](https://openinframap.org/) | Visual reference; ingest actual data from OSM/Geofabrik. |
| 40 | Open Charge Map | EV charging stations | JSON API, KML | Yes, free key | [Open Charge Map](https://openchargemap.org/site/develop/api) | Optional infrastructure layer. |
| 41 | Copernicus Land Monitoring Service | Land cover, vegetation, water, ground motion | GeoTIFF, NetCDF, product-dependent | Free; account/API workflow can vary | [Copernicus Land](https://land.copernicus.eu/) | Land/environment/crop/drought layers later. |
| 42 | USGS Landsat | Satellite imagery / land change | GeoTIFF / COG | Free; account may depend on access route | [USGS Landsat](https://www.usgs.gov/landsat-missions) | Long-term land-change analysis, not first MVP. |
| 43 | NOAA GFS | Global forecast model | GRIB2 | No | [NOAA GFS info](https://www.ncei.noaa.gov/products/weather-climate-models/global-forecast) | Advanced weather model processing. |
| 44 | DWD ICON | Weather forecast model | GRIB2 | No | [DWD open data](https://www.dwd.de/EN/ourservices/nwp_forecast_data/nwp_forecast_data.html) | Advanced forecast backup to GFS/Open-Meteo. |
| 45 | ECMWF Open Data | Forecast model data | GRIB2, BUFR | No for open-data products | [ECMWF Open Data](https://www.ecmwf.int/en/forecasts/datasets/open-data) | Premium-style forecast source, but complex processing. |
| 46 | NOAA NEXRAD | U.S. weather radar | Level II/III radar files | No | [NOAA NEXRAD on AWS](https://registry.opendata.aws/noaa-nexrad/) | Backup radar for U.S. region. |
| 47 | NOAA MRMS | Multi-radar precipitation/severe products | GRIB2 | No | [NOAA open data registry](https://registry.opendata.aws/collab/noaa/) | Advanced U.S. precipitation/severe weather. |
| 48 | NOAA GOES | Geostationary satellite imagery for Americas | NetCDF | No | [NOAA GOES on AWS](https://registry.opendata.aws/noaa-goes/) | Advanced live satellite; processing needed. |
| 49 | Himawari | Asia-Pacific satellite imagery | NetCDF/HSD/product-dependent | Usually no via open mirrors; attribution may apply | [NOAA Himawari on AWS](https://registry.opendata.aws/noaa-himawari/) | Live satellite for India/Asia-Pacific. |
| 50 | Meteosat / EUMETSAT | Europe, Africa, Indian Ocean geostationary satellite | Product-dependent | Free/open products vary; registration may be needed | [EUMETSAT Data Store](https://data.eumetsat.int/) | Live satellite backup for Europe/Africa/Indian Ocean. |

## 4. Ready-to-Use Categories

### Works Immediately Without Keys

| Source | Data | Format |
| --- | --- | --- |
| Airplanes.live CDN/API | Aircraft | JSON / gzip JSON |
| api.adsb.lol | Aircraft intel | JSON |
| Local aircraft DB | Aircraft identity | CSV gzip |
| Local airports DB / OurAirports | Airports | CSV |
| RainViewer | Radar | JSON + PNG tiles |
| Open-Meteo | Weather | JSON |
| USGS Earthquakes | Earthquakes | GeoJSON |
| NASA GIBS | Satellite imagery | WMTS/WMS/TMS |
| GDELT | News/events | JSON/CSV |
| Natural Earth | Borders/coastlines | Shapefile/GeoPackage |
| OpenStreetMap / Geofabrik | Infrastructure/base data | OSM PBF |
| World Bank | Country indicators | JSON/XML/CSV |
| IMF public APIs | Macro indicators | SDMX |

### Free Key / Free Account Recommended

| Source | Why key is useful |
| --- | --- |
| NASA FIRMS | Active fires |
| Global Fishing Watch | Maritime activity |
| AISStream | Live AIS ships |
| Space-Track | Satellites/TLE |
| OpenWeatherMap | Weather tiles |
| Cesium ion | Terrain/3D Tiles |
| MapTiler | Basemaps/satellite |
| Stadia Maps | Basemaps |
| EIA | Energy data |
| UN Comtrade | Trade data |
| ACLED | Conflict/protest data |
| Windy Webcams | Global public webcam catalog |

### Heavy-Processing Sources

These are powerful, but not first-week work.

| Source | Format | Why harder |
| --- | --- | --- |
| NOAA GFS | GRIB2 | Need GRIB decoding + tile generation |
| DWD ICON | GRIB2 | Need GRIB decoding + tile generation |
| ECMWF Open Data | GRIB2/BUFR | Need model-data processing |
| NOAA MRMS | GRIB2 | Need weather-raster processing |
| GOES | NetCDF | Need satellite processing |
| Himawari | NetCDF/HSD | Need satellite processing |
| WorldPop | GeoTIFF | Need raster statistics / zonal analysis |
| Copernicus | GeoTIFF/NetCDF | Large files and product-specific processing |

## 5. Fallback Design

Every layer should define a primary source, backup source, and fallback UI.

| Layer | Primary | Backup | Fallback UI |
| --- | --- | --- | --- |
| Aircraft live | Airplanes.live | OpenSky / adsb.lol / optional ADS-B provider | Show cached aircraft + "live feed delayed" |
| Aircraft identity | Local `aircraft.csv.gz` | adsb.lol / OpenSky metadata | Show ICAO hex only |
| Airports | Local CSV / OurAirports | OSM aeroway / OpenFlights / FAA NASR | Show nearest city instead |
| Weather point | Open-Meteo | OpenWeatherMap current weather if key exists | Show "weather unavailable" |
| Weather tiles | OpenWeatherMap | Open-Meteo-derived tiles later / GFS later | Hide weather overlay, keep point weather |
| Radar | RainViewer | NEXRAD/MRMS for U.S. | Show satellite/cloud layer |
| Satellite | NASA GIBS | GOES/Himawari/Meteosat later | Show base imagery only |
| Ships live | AISStream | GFW / MarineCadastre historical | Show maritime activity heatmap |
| Maritime intelligence | GFW | AISStream / MarineCadastre / OSM ports | Show ports only |
| Satellites | Space-Track | CelesTrak GP/TLE where suitable | Show stale orbital catalog |
| Fires | NASA FIRMS | Copernicus EMS / NOAA HMS | Hide fire layer + show source missing |
| Earthquakes | USGS | EMSC / GDACS | Show no earthquake layer |
| News/events | GDELT | ReliefWeb / Wikipedia Current Events / RSS feeds | Show no event feed |
| Population | WorldPop | Kontur / GHSL / World Bank country population | Show country-level estimate only |
| Public cameras | Windy Webcams | City/road/port/volcano public camera lists | Hide camera layer + explain missing key/source |

## 6. Recommended Source Registry Structure

Future file:

```ts
// explorer/server/intel/sources/sourceRegistry.ts

export type SourceAccess =
  | "no_key"
  | "free_key"
  | "free_trial"
  | "paid"
  | "local_file"
  | "optional_key";

export type SourceStatus =
  | "ready"
  | "missing_key"
  | "disabled"
  | "stale"
  | "offline"
  | "degraded";

export const SOURCE_REGISTRY = [
  {
    id: "airplanes_live",
    name: "Airplanes.live",
    category: "aviation",
    dataType: "Live aircraft",
    format: ["aircraft.json.gz", "JSON"],
    access: "no_key",
    website: "https://airplanes.live/api-guide/",
    env: null,
    enabledByDefault: true,
    fallbackSources: ["opensky", "adsb_lol"],
  },
  {
    id: "open_meteo",
    name: "Open-Meteo",
    category: "weather",
    dataType: "Point weather and forecast",
    format: ["JSON"],
    access: "no_key",
    website: "https://open-meteo.com/",
    env: null,
    enabledByDefault: true,
    fallbackSources: ["openweathermap"],
  },
  {
    id: "openweathermap",
    name: "OpenWeatherMap",
    category: "weather",
    dataType: "Weather map tiles",
    format: ["XYZ PNG tiles"],
    access: "optional_key",
    website: "https://openweathermap.org/api/weather-map-2",
    env: "OPENWEATHER_API_KEY",
    enabledByDefault: false,
    fallbackSources: ["rainviewer", "open_meteo"],
  },
  {
    id: "nasa_firms",
    name: "NASA FIRMS",
    category: "hazards",
    dataType: "Active fires",
    format: ["CSV", "KML", "map services"],
    access: "free_key",
    website: "https://firms.modaps.eosdis.nasa.gov/api/",
    env: "NASA_FIRMS_MAP_KEY",
    enabledByDefault: false,
    fallbackSources: ["copernicus_ems"],
  }
];
```

## 7. `.env.example` Target Shape

Future public `.env.example` should look like this:

```env
# Core map / globe
CESIUM_ION_TOKEN=
MAPTILER_API_KEY=
STADIA_MAPS_API_KEY=

# Weather and hazards
OPENWEATHER_API_KEY=
NASA_FIRMS_MAP_KEY=

# Aviation
OPENSKY_CLIENT_ID=
OPENSKY_CLIENT_SECRET=

# Maritime
GFW_TOKEN=
AISSTREAM_API_KEY=

# Space
SPACETRACK_USERNAME=
SPACETRACK_PASSWORD=

# Economy / trade / energy
EIA_API_KEY=
UN_COMTRADE_API_KEY=

# Conflict/events
ACLED_API_KEY=

# Public camera layers
WINDY_WEBCAMS_API_KEY=
EARTHCAM_API_KEY=

# Your own expansion feed
GODS_EXPANSION_API_KEY=
```

## 8. Frontend Behavior for Missing Keys

The UI must not break when keys are missing.

Weather example:

```text
OpenWeatherMap Weather Tiles
Status: Missing API key
Action: Add OPENWEATHER_API_KEY
Fallback active: RainViewer + Open-Meteo
```

BYOK example:

```text
Enhanced source available
Add your own key for better coverage
```

AIS example:

```text
Live AIS Ships
Requires AISSTREAM_API_KEY
Fallback: Global Fishing Watch activity layer
```

## 9. First Implementation Order

Start with sources in this order:

```text
1. Current stack source registry
2. /api/sources
3. /api/source-health
4. /api/layers/manifest
5. USGS Earthquakes
6. NASA FIRMS
7. NASA GIBS
8. GDELT
9. Natural Earth
10. WorldPop
```

The current stack already gives aviation, weather, radar, maritime, satellites,
base maps, and cables. The next biggest intelligence boost is:

```text
USGS Earthquakes
+ NASA FIRMS Fires
+ GDELT Events
+ NASA GIBS Satellite
+ WorldPop Population
```

That turns the project from a globe viewer into a true open-source intelligence
platform.

## 10. Public Camera and Live Visual Evidence Sources

Open camera layers can make God Eyes feel much more alive, but they must be
designed carefully. This should not become CCTV/private surveillance. Focus only
on public scenic webcams, weather cams, official road/transport feeds, port and
beach cams, volcano cams, observatory cams, sky cameras, and environmental visual
sensors.

Why this matters:

```text
Weather says heavy rain
+ radar shows precipitation
+ public webcam shows wet roads / low visibility
= higher confidence
```

Another example:

```text
Storm near coast
+ port webcam shows rough sea
+ AIS shows vessels slowing
+ wind forecast rising
= maritime risk evidence
```

### Open Camera Sources

| Source | Data type | Format | API key needed? | Website / docs | Best use |
| --- | --- | --- | --- | --- | --- |
| Windy Webcams API | Global public webcams, previews, timelapses, location metadata | JSON API + image URLs / embeds | Yes, free key available | [Windy Webcams API](https://api.windy.com/webcams/docs) | Best global webcam catalog and best first camera source. |
| EarthCam | Scenic city, tourism, landmark, beach, port cams | Embed/player/API partnership | Usually partner/API access; public embeds vary | [EarthCam API](https://www.earthcam.net/api/) | Premium visual layer for landmarks and cities. |
| City open-data webcam lists | Public city/traffic/webcam links | CSV, JSON, ArcGIS FeatureServer, Socrata API, HTML links | Usually no | [Vancouver webcam open data example](https://opendata.vancouver.ca/explore/dataset/web-cam-url-links/api/) | Official municipal cameras. |
| Public transport/road authority cameras | Road/weather/traffic condition images | JPEG snapshots, JSON APIs, ArcGIS services, XML | Usually no, varies by region | City/state DOT portals | Road condition, snow, fog, visibility, congestion indicators. |
| Port authority webcams | Harbor, port, maritime, canal, ferry cams | Embed / HLS / JPEG snapshots | Usually no for public viewing; API varies | Port websites | Maritime intelligence near ports. |
| Beach/surf webcams | Coastal, wave, beach activity | Embed / HLS / JPEG snapshot | Varies | Local tourism/surf sites | Coastal weather and tourism context. |
| Volcano observatory webcams | Volcano crater and hazard monitoring | JPEG snapshots / public pages | Usually no | USGS volcano observatories and national geological agencies | Hazard visual confirmation. |
| Weather station sky cameras | Cloud/sky visibility imagery | JPEG snapshots / public pages | Varies | University/weather networks | Cloud, fog, storm, smoke visibility. |
| OpenDataCam | Computer vision on allowed streams/videos | Local processing + API/output | No, self-hosted | [OpenDataCam](https://opendata.cam/) | Use only on cameras you are allowed to process. |

### Camera Layer UI

Add a new layer group:

```text
LIVE VISUALS
  Public Webcams
  Weather Cameras
  Road Cameras
  Port Cameras
  Volcano Cameras
  Sky Cameras
```

Each camera marker should show:

```text
camera name
location
source
category
last updated
image freshness
license/terms
preview thumbnail
open live view
open timelapse
confidence / status
```

Marker colors:

```text
Green  = live / recently updated
Yellow = delayed
Orange = stale
Gray   = unknown
Red    = offline
```

Suggested icons:

```text
City cam      -> camera icon
Weather cam   -> cloud-camera icon
Road cam      -> road/camera icon
Port cam      -> anchor/camera icon
Volcano cam   -> volcano/warning icon
Sky cam       -> sun/cloud icon
```

### Camera Click Panel

When a user clicks a camera, open a right-side intelligence panel:

```text
CAMERA INTELLIGENCE

Kolkata City View
Category: City / Weather
Source: Windy Webcams
Status: Live
Last frame: 2 min ago

[Live preview / latest image]

Nearby:
- Weather: light rain
- Radar: precipitation detected
- Flights: 15 within 150 km
- Road condition: unknown
- Visibility estimate: low/medium/high

Source:
- URL
- License/terms
- Attribution
```

Important: do not just show video. Use the camera as evidence.

### Camera Intelligence Ideas

Visual weather confirmation:

```text
Open-Meteo: rain expected
RainViewer: radar rain detected
Camera frame: wet road / low visibility
-> confidence increases
```

Port visual status:

```text
AIS vessels near port
+ port webcam shows congestion / rough sea
+ wind gusts high
-> maritime operations risk
```

Disaster verification:

```text
NASA FIRMS fire nearby
+ sky camera detects smoke/haze
+ wind toward populated area
-> smoke exposure alert
```

City live pulse:

```text
Click a city
-> weather
-> air quality
-> traffic/public camera preview
-> news events
-> flights
-> nearby hazards
```

Timelapse intelligence:

```text
storm arrival
snow accumulation
fog clearing
smoke movement
crowd/event buildup
day/night city activity
```

### Camera Backend Design

Future source folder:

```text
explorer/server/intel/sources/cameras/
  windyWebcams.ts
  earthCam.ts
  cityOpenDataCameras.ts
  roadAuthorityCameras.ts
  portCameras.ts
  volcanoCameras.ts
```

Normalized camera object:

```ts
type PublicCamera = {
  id: string;
  name: string;
  category:
    | "city"
    | "weather"
    | "road"
    | "port"
    | "beach"
    | "volcano"
    | "sky"
    | "tourism";

  lat: number;
  lon: number;

  sourceId: string;
  sourceName: string;
  sourceUrl: string;

  previewImageUrl?: string;
  liveUrl?: string;
  embedUrl?: string;
  timelapseUrl?: string;

  status: "live" | "delayed" | "stale" | "offline" | "unknown";
  lastFrameAt?: string;
  lastCheckedAt: string;

  attribution?: string;
  license?: string;
  termsUrl?: string;

  allowEmbed: boolean;
  allowAnalysis: boolean;
};
```

Future API endpoints:

```text
GET /api/cameras?bbox=...
GET /api/cameras/nearby?lat=...&lon=...&radiusKm=...
GET /api/cameras/:id
GET /api/cameras/:id/frame
GET /api/intel/location?lat=...&lon=...
```

`/api/intel/location` should include nearby cameras:

```json
{
  "nearbyCameras": [
    {
      "id": "windy_123",
      "name": "Kolkata Skyline",
      "category": "city",
      "distanceKm": 4.2,
      "status": "live",
      "previewImageUrl": "...",
      "source": "Windy Webcams"
    }
  ]
}
```

### Camera Frontend Design

Future frontend components:

```text
CameraEntity.tsx
CameraIntelligencePanel.tsx
CameraPreviewCard.tsx
NearbyCamerasCard.tsx
CameraStatusBadge.tsx
```

Click behavior:

```text
User toggles Public Webcams
-> frontend calls /api/cameras?bbox=...
-> Cesium adds camera markers
-> user clicks marker
-> right panel opens Camera Intelligence
-> preview image/live embed appears
```

### Camera Legal and Privacy Rules

For an open-source project, enforce these rules:

```text
Only public, official, or licensed camera feeds
No private CCTV scraping
No hidden camera sources
No face recognition
No person tracking
No license plate recognition
No individual identification
No bypassing stream protections
Respect robots.txt / terms
Cache thumbnails carefully
Show source attribution
Allow users to disable visual-analysis features
```

### Best First Camera Implementation

Start with Windy Webcams API as the primary camera source because it is already a
global webcam catalog.

Then add:

```text
1. Windy Webcams
2. City open-data camera links
3. Port authority public webcams
4. Volcano/weather sky cameras
```

Do not start by scraping random camera websites.

## 11. Product Fit

Camera layers become a visual evidence layer:

```text
Satellite says clouds
Radar says rain
Weather model says storm
Camera shows low visibility
User trusts the alert more
```

Location intelligence should include:

```text
LIVE VISUAL EVIDENCE
3 cameras nearby
2 live
1 stale

Best camera:
Kolkata Skyline
Updated 2 min ago
Source: Windy Webcams
```

This helps God Eyes feel like a real-time Earth observation platform, not only a
data map.


<!-- ============================================== --><!-- CONTENT FROM: sourceAudit.md --><!-- ============================================== -->

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



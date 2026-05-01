# GODS Explorer Weather Raw Fetch Handoff Report

Date: 2026-05-01

This file is a continuation/handoff report for the weather raw-fetch phase of GODS Explorer. It explains what has been implemented, what has been tested, what is still missing, and what decisions the project owner made before moving to a new chat/thread.

## Current Goal

Complete the raw data fetch foundation before normalization.

The target source map is the first table of `weather.txt`, lines 1-285:

- Table header: `Parameter / data item` and `Best source/database to search first`
- Target rows: 283 parameter/data items
- Purpose: prove that we can fetch raw/source data for each parameter family before designing normalizers.

Important rule:

- Raw fetch phase proves that data can be obtained.
- Normalization phase turns raw payloads into clean project schemas.
- Analytics phase calculates derived fields such as risk, confidence, spread speed, slope, aspect, exposure, and source reliability.

## Locked User Decisions

1. National/local operational data priority:
   - Start with US first
   - Then India
   - Then global best-effort

2. Copernicus ERA5 / CAMS / EWDS:
   - Keep as catalog proof for now
   - Do not implement job submission yet

3. Derived fields:
   - Treat as normalization/analytics phase
   - Do not count them as raw-fetch failures

4. Expensive / limited sources:
   - Prefer free/open sources only for now
   - BYOK/freemium/premium sources can be added later as optional layers

5. Last hard rows priority:
   - US + India first
   - Global free sources second
   - Optional BYOK sources third

## Implemented Folder Structure

Weather fetcher code lives under:

```txt
explorer/source-fetchers/weather/
```

Raw downloaded output goes under:

```txt
explorer/data_raw/weather/
```

Common shared fetch core:

```txt
explorer/source-fetchers/weather/common_functions/
```

Important shared modules already implemented:

```txt
config_validator.mjs
time.mjs
names.mjs
paths.mjs
content_type_map.mjs
checksum.mjs
http_client.mjs
shape_detector.mjs
duplicate_detector.mjs
fetch_log.mjs
failure_writer.mjs
raw_writer.mjs
rate_limiter.mjs
retry_policy.mjs
feed_runner.mjs
cli_summary.mjs
auth_helpers.mjs
env_loader.mjs
index.mjs
```

The shared core supports:

- feed config validation
- timeout
- retry policies
- per-feed rate limits
- temp file writes
- final rename after successful download
- SHA-256 checksum
- streaming download
- response size guard
- content-type to extension mapping
- JSONL fetch logging
- failure metadata
- duplicate detection

## Current Fetchers

### Main runners

```txt
no_auth_weather_fetchers.mjs
auth_weather_fetchers.mjs
usgs_fetcher.mjs
```

`usgs_fetcher.mjs` remains as a compatibility runner for split USGS fetchers.

### No-auth/direct fetchers

```txt
open_meteo_fetcher.mjs
noaa_nws_fetcher.mjs
noaa_nodd_gfs_fetcher.mjs
nasa_gibs_fetcher.mjs
noaa_goes_fetcher.mjs
usgs_earthquake_fetcher.mjs
usgs_water_fetcher.mjs
noaa_nwps_fetcher.mjs
noaa_dart_fetcher.mjs
smithsonian_gvp_fetcher.mjs
usgs_volcano_fetcher.mjs
gdacs_fetcher.mjs
worldpop_fetcher.mjs
rainviewer_fetcher.mjs
noaa_radar_fetcher.mjs
noaa_cyclone_fetcher.mjs
noaa_spc_fetcher.mjs
noaa_marine_fetcher.mjs
climate_air_reference_fetcher.mjs
reference_context_fetcher.mjs
```

### Auth/API-key fetchers

```txt
nasa_firms_fetcher.mjs
openaq_fetcher.mjs
copernicus_land_clms_fetcher.mjs
nasa_earthdata_modis_fetcher.mjs
```

## Source Families Covered

### Basic weather / forecast

- Open-Meteo
- NOAA/NWS
- NOAA GFS through NOAA NODD/AWS
- NASA POWER for radiation and climate support variables
- NOAA NCEI daily summaries sample

### Radar / severe storms

- RainViewer public weather maps index
- RainViewer radar tile sample
- NEXRAD Level II listing and byte sample through Unidata mirror
- NOAA MRMS listing and GRIB2.GZ byte sample
- NOAA SPC day-1 categorical/tornado/hail/wind GeoJSON outlooks

### Cyclones

- NOAA NHC `CurrentStorms.json`
- NOAA NHC Atlantic GIS RSS
- NOAA NHC Eastern Pacific GIS RSS
- JTWC Western Pacific significant tropical weather text
- GDACS cyclone/disaster context

### Marine / tides / ocean

- NOAA CO-OPS station metadata
- NOAA CO-OPS water level
- NOAA CO-OPS tide predictions
- NOAA NDBC latest observations
- NOAA NDBC realtime buoy sample
- NOAA DART/NDBC tsunami buoy feed

### Hazards

- USGS Earthquake GeoJSON feeds and event details
- USGS Water data
- NOAA NWPS hydrology
- USGS Volcano Hazards Program
- Smithsonian GVP partial volcano reference
- GDACS global disaster alerts
- NASA FIRMS active fire CSV

### Satellite / land / population

- NASA GIBS WMTS capabilities and tile sample
- NOAA GOES S3 listings and NetCDF byte sample
- NASA Earthdata/MODIS CMR metadata and HDF byte samples
- Copernicus Land/CLMS metadata/search
- WorldPop metadata

### Reference / context

- OpenStreetMap/Overpass sample for hospitals, schools, buildings, power lines, substations
- OpenFEMA disaster declarations
- USGS/National Map watershed boundary sample
- USGS Quaternary Faults feature sample
- SoilGrids point sample
- SRTM elevation point sample
- NASA CMR LIS lightning catalog proof
- NASA CMR VIIRS night lights catalog proof
- FAA NAS airport status XML

## Latest Coverage Numbers

Target: 283 rows from the first table of `weather.txt`.

Current status:

```txt
229 / 283 = actual raw data or safe sample data
13  / 283 = catalog/process proof only
9   / 283 = partial or product-deferred source
17  / 283 = derived/internal analytics, not raw-fetch
15  / 283 = still need source decision or region-specific implementation
```

The “covered including catalog/partial/derived” count is:

```txt
268 / 283
```

The strict “actual raw/sample downloaded” count is:

```txt
229 / 283
```

## Why Not 283 / 283 Actual Raw Downloads Yet

Not all rows are direct API data rows.

Some rows are derived analytics:

- risk scores
- confidence
- spread speed
- slope
- aspect
- source reliability
- exposure calculations

These should be calculated after normalization.

Some rows depend on country/state/local agencies:

- dam releases
- avalanche warnings
- road closures
- bridge closures
- rail disruption
- port status
- some allergen/pollen feeds

There is no single global open API for these.

Some rows are catalog/job-based:

- ERA5
- CAMS
- EWDS/GloFAS/CEMS

For these, catalog access is proven, but full data requires async job submission and storage decisions.

Some rows are large raster/product sources:

- WorldPop GeoTIFFs
- Copernicus Land products

WorldPop metadata works, but its GeoTIFF host attempted to send multi-GB files instead of honoring tiny byte-range requests, so the safety guard blocked the download.

## Known Partial/Broken Sources

### Smithsonian GVP

Status: partially working.

Working:

- at least one Smithsonian/GVP feed returns data

Problem:

- several endpoints return `HTTP 403 Forbidden`

Reason:

- the Smithsonian website blocks direct scripted access on those endpoints

Impact:

- volcano reference rows are partly covered, but this source is not fully reliable yet.

### WorldPop

Status: metadata works, GeoTIFF sample blocked by safety guard.

Working:

- dataset metadata
- population metadata/download links

Problem:

- GeoTIFF sample request attempted to return very large full files
- examples seen: about 1.84 GB and 4.01 GB

Reason:

- server did not honor tiny byte-range sample in the way we needed

Impact:

- WorldPop should remain metadata-only until storage design is ready.

### Copernicus ERA5 / CAMS / EWDS

Status: catalog/process proof only.

Working:

- CDS process catalog
- ADS process catalog
- EWDS process catalog

Not implemented yet:

- job submission
- async job polling
- product download

Reason:

- user explicitly chose to keep these as catalog proof for now.

## Last 15 Hard Rows

These rows still need source decisions or region-specific implementation:

```txt
landslide warning
rockfall risk
flash drought
allergen level
dam level
dam release
avalanche risk
avalanche warning
deforestation
coastline change
road closures
bridge closures
port status
rail disruption
livestock density
```

Recommended handling:

- US first
- India second
- global free/open fallback third

Likely future source candidates:

```txt
USGS landslide / NASA landslide catalog
US Bureau of Reclamation / USACE / state water agencies for dam/reservoir data
National avalanche centers for avalanche risk/warnings
Open511 / state DOT feeds for road and bridge closures
FAA / airport feeds for airport status, already started with FAA NAS
Port authority feeds / MarineCadastre / UN or World Bank datasets for port status
GTFS-realtime / agency feeds for rail disruption
Global Forest Watch or Hansen Global Forest Change for deforestation
FAO livestock grids for livestock density
NOAA shoreline / USGS coastal products for coastline change
```

## Verification Commands Already Run

Syntax checks were run with:

```txt
node --check <fetcher file>
```

Production frontend build:

```txt
npm run build
```

Result:

```txt
passed
```

Graph update:

```txt
graphify update .
```

Result:

```txt
passed
```

Latest graph update reported:

```txt
242 files
1223 nodes
2370 edges
163 communities
```

## Important Implementation Notes

All fetchers remain raw-fetch only.

No database was added.

No frontend wiring was added.

No normalization was added.

No Copernicus job submission was added.

All heavy/binary sources use one of these approaches:

- metadata only
- index/listing only
- safe small byte-range sample
- safety abort if the response is too large

Raw files include metadata sidecars and fetch-log entries.

## Recommended Next Step

Do not start frontend yet.

Next best step:

1. Create a formal parameter coverage manifest for all 283 rows.
2. For each row, store:
   - parameter name
   - source family
   - raw fetcher
   - raw data folder
   - status: `raw_sample`, `catalog_only`, `partial`, `derived_later`, `missing_source`
   - normalization notes
3. Then implement the first normalization pass for the sources already downloaded.

Suggested file:

```txt
explorer/source-fetchers/weather/config/weather_parameter_coverage.mjs
```

or a generated report:

```txt
explorer/source-fetchers/weather/reports/weather_parameter_coverage.md
```

This will turn the current progress into a machine-checkable checklist before normalization begins.

## Mental Model For The Next Chat

The raw-fetch layer is now mostly complete for broad global/open weather and hazard data.

The project is ready to move toward normalization only after either:

1. accepting that the last 15 rows require later region-specific plugins, or
2. implementing US-first sample fetchers for those last 15 rows.

The user prefers finishing fetch proof first, but derived fields should not block normalization because they are not raw data.


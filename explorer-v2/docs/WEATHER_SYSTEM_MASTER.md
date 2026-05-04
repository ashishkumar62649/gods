

<!-- ============================================== --><!-- CONTENT FROM: WEATHER_RAW_FETCH_HANDOFF_REPORT.md --><!-- ============================================== -->

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

The â€œcovered including catalog/partial/derivedâ€ count is:

```txt
268 / 283
```

The strict â€œactual raw/sample downloadedâ€ count is:

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
doc/weather_parameter_coverage.md
```

This will turn the current progress into a machine-checkable checklist before normalization begins.

## Mental Model For The Next Chat

The raw-fetch layer is now mostly complete for broad global/open weather and hazard data.

The project is ready to move toward normalization only after either:

1. accepting that the last 15 rows require later region-specific plugins, or
2. implementing US-first sample fetchers for those last 15 rows.

The user prefers finishing fetch proof first, but derived fields should not block normalization because they are not raw data.


<!-- ============================================== --><!-- CONTENT FROM: weather_database_architecture.md --><!-- ============================================== -->

# Weather Database Architecture

The normalized weather database is one PostgreSQL database named `god_eyes`.

Required extensions:

- PostGIS for geometry, spatial indexes, and location queries
- TimescaleDB for recent/current time-series hypertables

The `explorer/database` folder contains only database design files, schema files, migrations, seed files, and documentation. It must not contain normalized data exports.

## Storage Flow

```txt
data_raw/weather/
  original fetched files and metadata evidence

normalization/weather/
  weather normalization code

data_normalized/weather/
  temporary normalized JSONL before database insert

PostgreSQL/PostGIS/TimescaleDB god_eyes
  normalized events, observations, alerts, source records

data_processed/weather/parquet/
data_processed/weather/cog/
data_processed/weather/zarr/
  old time-series archives, large processed grids, rasters, and multidimensional products
```

## PostgreSQL Tables

- `sources`: one row per data source.
- `parameter_registry`: one row per weather parameter/data item.
- `source_raw_files`: one lineage row per raw file.
- `weather_time_series`: temperature, pressure, wind, humidity, rain, radiation, air-quality values.
- `ocean_time_series`: tide, buoy, wave, tsunami, and water-level station values.
- `air_quality_time_series`: pollutant and AQI values.
- `hydrology_time_series`: river, reservoir, streamflow, and hydrology values.
- `hazard_events`: earthquakes, cyclones, floods, fires, volcanoes, warnings, watches.
- `geospatial_features`: polygons, alert areas, fire perimeters, faults, watersheds, infrastructure context.
- `catalog_products`: Copernicus catalogs, MODIS granule lists, GFS listings, WorldPop metadata.
- `raster_products`: references to GRIB2, NetCDF, HDF, GeoTIFF, COG, Zarr, tile/image products.
- `derived_metrics`: calculated values such as risk, confidence, exposure, heat index, spread speed.
- `best_current_values`: selected latest/best value for API and frontend reads.
- `source_health`: source-level fetch health.
- `normalized_runs`: normalization run tracking.

## TimescaleDB Hypertables

Use TimescaleDB for recent/current time-series tables:

- `weather_time_series`
- `ocean_time_series`
- `air_quality_time_series`
- `hydrology_time_series`

Do not use TimescaleDB for registries, raw-file lineage, catalogs, rasters, geospatial feature tables, or event tables.

## Single Truth Rule

Raw source values are not deleted. Multiple source values remain in normalized evidence tables. The single clean answer for the API/frontend comes from a selected result layer such as `best_weather_current`, ranked by source priority, freshness, distance, resolution, and quality.

## H3 Rule

Latitude/longitude remain the exact location fields. H3 cells are search/grouping indexes, not replacements for coordinates.

Early defaults:

- Events: H3 res 5, 6, 7
- Weather observations: H3 res 6, 7
- Assets/features: H3 res 7, 8, 9
- Global grids: H3 res 4, 5, 6 only, with full grid data outside PostgreSQL

## Large Data Rule

Do not expand global GRIB2, NetCDF, HDF, GeoTIFF, or tile grids into millions of PostgreSQL rows. Store the original in `data_raw/weather`, processed forms in Parquet/COG/Zarr, and only a reference row in `raster_products`.

Query old or large Parquet history with DuckDB instead of forcing it back into PostgreSQL.

## Retention Rule

- Hot: 0-30 days in PostgreSQL/PostGIS
- Warm: 30-180 days in hourly summaries plus Parquet detail
- Cold: older than 180 days in daily summaries plus Parquet/Zarr/COG archives


<!-- ============================================== --><!-- CONTENT FROM: weather_raw_profile.md --><!-- ============================================== -->

# Weather Raw Data Profile

Generated from `explorer/data_raw/weather/fetch_log.jsonl`.

## Summary

- Fetch log rows: 343
- Successful or duplicate raw file references: 313
- Distinct source/folder/dataType groups: 122
- Total referenced bytes: 29865999

## Fetch Status Counts

| status | count |
| --- | --- |
| success | 239 |
| duplicate | 60 |
| failed | 30 |
| http_error | 14 |

## Raw Formats Seen

| extension | count |
| --- | --- |
| .json | 163 |
| .xml | 73 |
| .geojson | 34 |
| .csv | 16 |
| .html | 9 |
| .txt | 6 |
| .idx | 3 |
| .hdf | 2 |
| .jpg | 2 |
| .bin | 1 |
| .grib2 | 1 |
| .gz | 1 |
| .nc | 1 |
| .png | 1 |

## Normalization Lanes

| lane | groups |
| --- | --- |
| catalog_or_product_metadata | 31 |
| hazard_events | 25 |
| geospatial_features | 13 |
| weather_time_series | 8 |
| xml_feed | 7 |
| air_quality_time_series | 6 |
| grid_or_binary_product | 6 |
| source_specific_json | 6 |
| hydrology_time_series | 5 |
| ocean_time_series | 5 |
| reference_features | 5 |
| tabular_records | 4 |
| imagery_or_tile | 1 |

## Source Coverage

| source | raw file refs |
| --- | --- |
| gdacs | 62 |
| noaa_nws | 26 |
| openaq | 24 |
| nasa_firms | 20 |
| reference_context | 16 |
| usgs | 16 |
| nasa_earthdata_modis | 14 |
| noaa_nwps | 12 |
| open_meteo | 12 |
| usgs_earthquake | 12 |
| worldpop | 12 |
| climate_air_reference | 10 |
| noaa_nodd_gfs | 10 |
| smithsonian_gvp | 10 |
| noaa_marine | 9 |
| usgs_volcano | 8 |
| copernicus_land_clms | 7 |
| noaa_goes | 7 |
| nasa_gibs | 4 |
| noaa_cyclone | 4 |
| noaa_dart | 4 |
| noaa_radar | 4 |
| noaa_spc | 4 |
| usgs_water | 4 |
| rainviewer | 2 |

## Target Normalized Format

Use these database-ready record families for v1:

- `source_raw_files`: Lineage row for every raw file, including source, endpoint, fetch time, checksum, byte size, content type, and raw path.
- `weather_time_series`: Point/time weather values such as temperature, humidity, wind, pressure, precipitation, radiation, air quality, and model samples.
- `ocean_time_series`: Buoy, tide, water-level, wave, and tsunami station observations.
- `air_quality_time_series`: Air quality pollutant and index values such as PM2.5, PM10, ozone, NO2, SO2, CO, AQI, aerosols, smoke, and dust.
- `hydrology_time_series`: River, stream, reservoir, water-level, and hydrology observations or forecasts.
- `hazard_events`: Earthquakes, cyclones, floods, wildfires, volcanoes, warnings, watches, and severe-storm outlooks.
- `geospatial_features`: GeoJSON/ArcGIS/OSM-style features such as alerts, polygons, faults, watersheds, infrastructure, and exposure context.
- `catalog_products`: Catalog/process/product metadata for sources that need async jobs or large downloads.
- `raster_products`: Binary/grid/tile assets such as GRIB2, NetCDF, HDF, GeoTIFF, imagery tiles, and byte samples.
- `derived_metrics`: Calculated values such as heat index, wind chill, risk score, exposure score, vulnerability score, confidence, and source reliability.
- `best_current_values`: Selected frontend-ready current value per parameter/location from all supporting evidence records.

Every normalized row should keep `source`, `source_family`, `parameter`, `observed_time`, `valid_time`, `forecast_time`, `ingested_at`, `latitude`, `longitude`, `geometry`, `value`, `unit`, `raw_file_path`, `checksum_sha256`, `payload` where applicable. Missing fields stay null.

## Source Groups

| source | folder | dataType | lane | formats | shape | files | sample raw path |
| --- | --- | --- | --- | --- | --- | --- | --- |
| climate_air_reference | copernicus_catalogs | ads_processes | catalog_or_product_metadata | .json | json_object, unknown | 2 | data_raw\weather\climate_air_reference\copernicus_catalogs\year=2026\month=05\day=01\hour=00\climate_air_reference_ads_processes_2026-05-01T00-57-04-274Z.json |
| climate_air_reference | copernicus_catalogs | cds_processes | catalog_or_product_metadata | .json | json_object, unknown | 2 | data_raw\weather\climate_air_reference\copernicus_catalogs\year=2026\month=05\day=01\hour=00\climate_air_reference_cds_processes_2026-05-01T00-57-03-414Z.json |
| climate_air_reference | copernicus_catalogs | ewds_processes | catalog_or_product_metadata | .json | json_object, unknown | 2 | data_raw\weather\climate_air_reference\copernicus_catalogs\year=2026\month=05\day=01\hour=00\climate_air_reference_ewds_processes_2026-05-01T00-57-05-133Z.json |
| climate_air_reference | nasa_power | daily_point_radiation_kolkata | source_specific_json | .json | json_object | 2 | data_raw\weather\climate_air_reference\nasa_power\year=2026\month=05\day=01\hour=00\climate_air_reference_daily_point_radiation_kolkata_2026-05-01T00-57-34-799Z.json |
| climate_air_reference | noaa_ncei | daily_summaries_san_francisco | source_specific_json | .json | json_array | 2 | data_raw\weather\climate_air_reference\noaa_ncei\year=2026\month=05\day=01\hour=00\climate_air_reference_daily_summaries_san_francisco_2026-05-01T00-57-36-040Z.json |
| copernicus_land_clms | metadata | search_collections | catalog_or_product_metadata | .json | json_object, unknown | 3 | data_raw\weather\copernicus_land_clms\metadata\year=2026\month=05\day=01\hour=00\copernicus_land_clms_search_collections_2026-05-01T00-27-49-091Z.json |
| copernicus_land_clms | metadata | site_root | catalog_or_product_metadata | .json | html, json_object, unknown | 4 | data_raw\weather\copernicus_land_clms\metadata\year=2026\month=05\day=01\hour=00\copernicus_land_clms_site_root_2026-05-01T00-27-48-558Z.json |
| gdacs | all_events | all_events_24h | xml_feed | .xml | rss_or_xml, unknown | 8 | data_raw\weather\gdacs\all_events\year=2026\month=05\day=01\hour=00\gdacs_all_events_24h_2026-05-01T00-26-36-327Z.xml |
| gdacs | all_events | all_events_current | xml_feed | .xml | rss_or_xml, unknown | 8 | data_raw\weather\gdacs\all_events\year=2026\month=05\day=01\hour=00\gdacs_all_events_current_2026-05-01T00-26-34-065Z.xml |
| gdacs | cyclones | cyclones_7d | hazard_events | .xml | rss_or_xml, unknown | 6 | data_raw\weather\gdacs\cyclones\year=2026\month=05\day=01\hour=00\gdacs_cyclones_7d_2026-05-01T00-26-36-966Z.xml |
| gdacs | earthquakes | earthquakes_24h | hazard_events | .xml | rss_or_xml, unknown | 8 | data_raw\weather\gdacs\earthquakes\year=2026\month=05\day=01\hour=00\gdacs_earthquakes_24h_2026-05-01T00-26-36-737Z.xml |
| gdacs | floods | floods_7d | hazard_events | .xml | rss_or_xml, unknown | 8 | data_raw\weather\gdacs\floods\year=2026\month=05\day=01\hour=00\gdacs_floods_7d_2026-05-01T00-26-37-175Z.xml |
| gdacs | volcanoes | volcano_map | geospatial_features | .geojson | geojson, unknown | 8 | data_raw\weather\gdacs\volcanoes\year=2026\month=05\day=01\hour=00\gdacs_volcano_map_2026-05-01T00-26-38-040Z.geojson |
| gdacs | volcanoes | volcano_news | hazard_events | .xml | rss_or_xml, unknown | 8 | data_raw\weather\gdacs\volcanoes\year=2026\month=05\day=01\hour=00\gdacs_volcano_news_2026-05-01T00-26-37-420Z.xml |
| gdacs | wildfires | wildfire_map | geospatial_features | .geojson | geojson, unknown | 8 | data_raw\weather\gdacs\wildfires\year=2026\month=05\day=01\hour=00\gdacs_wildfire_map_2026-05-01T00-26-38-257Z.geojson |
| nasa_earthdata_modis | collections | collections_modis | catalog_or_product_metadata | .json | json_object | 4 | data_raw\weather\nasa_earthdata_modis\collections\year=2026\month=05\day=01\hour=00\nasa_earthdata_modis_collections_modis_2026-05-01T00-46-33-991Z.json |
| nasa_earthdata_modis | granule_samples | sample_mod11a1_mod11a1_a2026118_h18v09_061_2026119101509_hdf | grid_or_binary_product | .hdf | binary_or_grid | 1 | data_raw\weather\nasa_earthdata_modis\granule_samples\year=2026\month=05\day=01\hour=00\nasa_earthdata_modis_sample_mod11a1_mod11a1_a2026118_h18v09_061_2026119101509_hdf_2026-05-01T00-46-35-451Z.hdf |
| nasa_earthdata_modis | granule_samples | sample_mod13a1_mod13a1_a2026097_h01v11_061_2026115000441_hdf | grid_or_binary_product | .hdf | binary_or_grid | 1 | data_raw\weather\nasa_earthdata_modis\granule_samples\year=2026\month=05\day=01\hour=00\nasa_earthdata_modis_sample_mod13a1_mod13a1_a2026097_h01v11_061_2026115000441_hdf_2026-05-01T00-46-39-125Z.hdf |
| nasa_earthdata_modis | granules | granules_MOD11A1 | catalog_or_product_metadata | .json | json_object | 4 | data_raw\weather\nasa_earthdata_modis\granules\year=2026\month=05\day=01\hour=00\nasa_earthdata_modis_granules_mod11a1_2026-05-01T00-46-34-501Z.json |
| nasa_earthdata_modis | granules | granules_MOD13A1 | catalog_or_product_metadata | .json | json_object | 4 | data_raw\weather\nasa_earthdata_modis\granules\year=2026\month=05\day=01\hour=00\nasa_earthdata_modis_granules_mod13a1_2026-05-01T00-46-35-110Z.json |
| nasa_firms | active_fires | MODIS_NRT_california_bay_area_1d | tabular_records | .csv | csv, unknown | 4 | data_raw\weather\nasa_firms\active_fires\year=2026\month=05\day=01\hour=00\nasa_firms_modis_nrt_california_bay_area_1d_2026-05-01T00-27-38-893Z.csv |
| nasa_firms | active_fires | MODIS_NRT_kolkata_region_1d | tabular_records | .csv | csv, unknown | 4 | data_raw\weather\nasa_firms\active_fires\year=2026\month=05\day=01\hour=00\nasa_firms_modis_nrt_kolkata_region_1d_2026-05-01T00-27-38-555Z.csv |
| nasa_firms | active_fires | VIIRS_SNPP_NRT_california_bay_area_1d | tabular_records | .csv | csv, unknown | 4 | data_raw\weather\nasa_firms\active_fires\year=2026\month=05\day=01\hour=00\nasa_firms_viirs_snpp_nrt_california_bay_area_1d_2026-05-01T00-27-38-249Z.csv |
| nasa_firms | active_fires | VIIRS_SNPP_NRT_kolkata_region_1d | tabular_records | .csv | csv, unknown | 4 | data_raw\weather\nasa_firms\active_fires\year=2026\month=05\day=01\hour=00\nasa_firms_viirs_snpp_nrt_kolkata_region_1d_2026-05-01T00-27-37-939Z.csv |
| nasa_firms | auth_status | mapkey_status | source_specific_json | .json | json_object, unknown | 4 | data_raw\weather\nasa_firms\auth_status\year=2026\month=05\day=01\hour=00\nasa_firms_mapkey_status_2026-05-01T00-27-36-858Z.json |
| nasa_gibs | tile_samples | MODIS_Terra_CorrectedReflectance_TrueColor_2012-07-09_sample_tile | grid_or_binary_product | .jpg | binary_or_grid | 2 | data_raw\weather\nasa_gibs\tile_samples\year=2026\month=05\day=01\hour=00\nasa_gibs_modis_terra_correctedreflectance_truecolor_2012_07_09_sample_tile_2026-05-01T00-26-07-856Z.jpg |
| nasa_gibs | wmts | epsg3857_best_capabilities | imagery_or_tile | .xml | rss_or_xml | 2 | data_raw\weather\nasa_gibs\wmts\year=2026\month=05\day=01\hour=00\nasa_gibs_epsg3857_best_capabilities_2026-05-01T00-25-56-709Z.xml |
| noaa_cyclone | jtwc_text | western_pacific_significant_tropical_weather | hazard_events | .txt | raw | 1 | data_raw\weather\noaa_cyclone\jtwc_text\year=2026\month=05\day=01\hour=00\noaa_cyclone_western_pacific_significant_tropical_weather_2026-05-01T00-57-00-348Z.txt |
| noaa_cyclone | nhc_active | current_storms | hazard_events | .json | json_object | 1 | data_raw\weather\noaa_cyclone\nhc_active\year=2026\month=05\day=01\hour=00\noaa_cyclone_current_storms_2026-05-01T00-56-59-358Z.json |
| noaa_cyclone | nhc_rss | atlantic_gis_rss | hazard_events | .xml | rss_or_xml | 1 | data_raw\weather\noaa_cyclone\nhc_rss\year=2026\month=05\day=01\hour=00\noaa_cyclone_atlantic_gis_rss_2026-05-01T00-56-59-784Z.xml |
| noaa_cyclone | nhc_rss | eastern_pacific_gis_rss | hazard_events | .xml | rss_or_xml | 1 | data_raw\weather\noaa_cyclone\nhc_rss\year=2026\month=05\day=01\hour=00\noaa_cyclone_eastern_pacific_gis_rss_2026-05-01T00-57-00-064Z.xml |
| noaa_dart | dart_realtime | dart_21413 | ocean_time_series | .txt | raw | 2 | data_raw\weather\noaa_dart\dart_realtime\year=2026\month=05\day=01\hour=00\noaa_dart_dart_21413_2026-05-01T00-26-28-517Z.txt |
| noaa_dart | stations | ndbc_active_stations | ocean_time_series | .xml | rss_or_xml | 2 | data_raw\weather\noaa_dart\stations\year=2026\month=05\day=01\hour=00\noaa_dart_ndbc_active_stations_2026-05-01T00-26-25-613Z.xml |
| noaa_goes | bucket_listing | noaa-goes19_root_listing | xml_feed | .xml | rss_or_xml | 3 | data_raw\weather\noaa_goes\bucket_listing\year=2026\month=05\day=01\hour=00\noaa_goes_noaa_goes19_root_listing_2026-05-01T00-46-33-813Z.xml |
| noaa_goes | netcdf_samples | noaa-goes19_OR_ABI-L2-CMIPF-M6C01_G19_s20261202300205_e20261202309513_c20261202309577_byte_sample | grid_or_binary_product | .nc | binary_or_grid | 1 | data_raw\weather\noaa_goes\netcdf_samples\year=2026\month=05\day=01\hour=00\noaa_goes_noaa_goes19_or_abi_l2_cmipf_m6c01_g19_s20261202300205_e20261202309513_c20261202309577_byte_sample_2026-05-01T00-46-34-360Z.nc |
| noaa_goes | product_listing | noaa-goes19_ABI-L2-CMIPF_listing | xml_feed | .xml | rss_or_xml | 3 | data_raw\weather\noaa_goes\product_listing\year=2026\month=05\day=01\hour=00\noaa_goes_noaa_goes19_abi_l2_cmipf_listing_2026-05-01T00-46-34-088Z.xml |
| noaa_marine | coops_predictions | 9414290_tide_predictions_recent | ocean_time_series | .json | json_object, unknown | 2 | data_raw\weather\noaa_marine\coops_predictions\year=2026\month=05\day=01\hour=00\noaa_marine_9414290_tide_predictions_recent_2026-05-01T00-57-00-877Z.json |
| noaa_marine | coops_station_metadata | 9414290_metadata | catalog_or_product_metadata | .json | json_object, unknown | 2 | data_raw\weather\noaa_marine\coops_station_metadata\year=2026\month=05\day=01\hour=00\noaa_marine_9414290_metadata_2026-05-01T00-56-59-411Z.json |
| noaa_marine | coops_water_level | 9414290_water_level_recent | hydrology_time_series | .json | json_object, unknown | 2 | data_raw\weather\noaa_marine\coops_water_level\year=2026\month=05\day=01\hour=00\noaa_marine_9414290_water_level_recent_2026-05-01T00-57-00-291Z.json |
| noaa_marine | ndbc_buoy | 46026_realtime | ocean_time_series | .txt | raw | 1 | data_raw\weather\noaa_marine\ndbc_buoy\year=2026\month=05\day=01\hour=00\noaa_marine_46026_realtime_2026-05-01T00-57-36-515Z.txt |
| noaa_marine | ndbc_latest | latest_observations | ocean_time_series | .txt | raw, unknown | 2 | data_raw\weather\noaa_marine\ndbc_latest\year=2026\month=05\day=01\hour=00\noaa_marine_latest_observations_2026-05-01T00-57-01-191Z.txt |
| noaa_nodd_gfs | bucket_listing | gfs_root_listing | weather_time_series | .xml | rss_or_xml | 3 | data_raw\weather\noaa_nodd_gfs\bucket_listing\year=2026\month=05\day=01\hour=00\noaa_nodd_gfs_gfs_root_listing_2026-05-01T00-46-32-939Z.xml |
| noaa_nodd_gfs | cycle_listing | gfs_cycle_20260430_12 | weather_time_series | .xml | rss_or_xml | 3 | data_raw\weather\noaa_nodd_gfs\cycle_listing\year=2026\month=05\day=01\hour=00\noaa_nodd_gfs_gfs_cycle_20260430_12_2026-05-01T00-46-33-798Z.xml |
| noaa_nodd_gfs | grib2_samples | gfs_pgrb2_byte_sample_20260430_12_f000 | weather_time_series | .grib2 | binary_or_grid | 1 | data_raw\weather\noaa_nodd_gfs\grib2_samples\year=2026\month=05\day=01\hour=00\noaa_nodd_gfs_gfs_pgrb2_byte_sample_20260430_12_f000_2026-05-01T00-46-34-339Z.grib2 |
| noaa_nodd_gfs | idx | gfs_pgrb2_idx_20260430_12_f000 | weather_time_series | .idx | raw, unknown | 3 | data_raw\weather\noaa_nodd_gfs\idx\year=2026\month=05\day=01\hour=00\noaa_nodd_gfs_gfs_pgrb2_idx_20260430_12_f000_2026-05-01T00-25-56-416Z.idx |
| noaa_nwps | docs | nwps_api_docs_html | hydrology_time_series | .html | html, unknown | 3 | data_raw\weather\noaa_nwps\docs\year=2026\month=05\day=01\hour=00\noaa_nwps_nwps_api_docs_html_2026-05-01T00-26-20-952Z.html |
| noaa_nwps | forecasts | forecast_ALBN6 | hydrology_time_series | .json | json_object | 3 | data_raw\weather\noaa_nwps\forecasts\year=2026\month=05\day=01\hour=00\noaa_nwps_forecast_albn6_2026-05-01T00-26-25-323Z.json |
| noaa_nwps | gauges | gauge_ALBN6 | catalog_or_product_metadata | .json | json_object, unknown | 3 | data_raw\weather\noaa_nwps\gauges\year=2026\month=05\day=01\hour=00\noaa_nwps_gauge_albn6_2026-05-01T00-26-23-341Z.json |
| noaa_nwps | observations | observed_ALBN6 | hydrology_time_series | .json | json_object | 3 | data_raw\weather\noaa_nwps\observations\year=2026\month=05\day=01\hour=00\noaa_nwps_observed_albn6_2026-05-01T00-26-24-024Z.json |
| noaa_nws | alerts | alerts_active_actual | geospatial_features | .geojson | geojson | 2 | data_raw\weather\noaa_nws\alerts\year=2026\month=05\day=01\hour=00\noaa_nws_alerts_active_actual_2026-05-01T00-25-50-096Z.geojson |
| noaa_nws | forecast | forecast_honolulu_us | catalog_or_product_metadata | .json | json_object | 2 | data_raw\weather\noaa_nws\forecast\year=2026\month=05\day=01\hour=00\noaa_nws_forecast_honolulu_us_2026-05-01T00-25-53-616Z.json |
| noaa_nws | forecast | forecast_new_york_us | catalog_or_product_metadata | .json | json_object | 2 | data_raw\weather\noaa_nws\forecast\year=2026\month=05\day=01\hour=00\noaa_nws_forecast_new_york_us_2026-05-01T00-25-51-842Z.json |
| noaa_nws | forecast | forecast_san_francisco_us | catalog_or_product_metadata | .json | json_object | 2 | data_raw\weather\noaa_nws\forecast\year=2026\month=05\day=01\hour=00\noaa_nws_forecast_san_francisco_us_2026-05-01T00-25-52-785Z.json |
| noaa_nws | forecast_hourly | forecast_hourly_honolulu_us | catalog_or_product_metadata | .json | json_object | 2 | data_raw\weather\noaa_nws\forecast_hourly\year=2026\month=05\day=01\hour=00\noaa_nws_forecast_hourly_honolulu_us_2026-05-01T00-25-53-937Z.json |
| noaa_nws | forecast_hourly | forecast_hourly_new_york_us | catalog_or_product_metadata | .json | json_object | 2 | data_raw\weather\noaa_nws\forecast_hourly\year=2026\month=05\day=01\hour=00\noaa_nws_forecast_hourly_new_york_us_2026-05-01T00-25-52-265Z.json |
| noaa_nws | forecast_hourly | forecast_hourly_san_francisco_us | catalog_or_product_metadata | .json | json_object | 2 | data_raw\weather\noaa_nws\forecast_hourly\year=2026\month=05\day=01\hour=00\noaa_nws_forecast_hourly_san_francisco_us_2026-05-01T00-25-53-117Z.json |
| noaa_nws | observation_stations | observation_stations_honolulu_us | catalog_or_product_metadata | .json | geojson | 2 | data_raw\weather\noaa_nws\observation_stations\year=2026\month=05\day=01\hour=00\noaa_nws_observation_stations_honolulu_us_2026-05-01T00-25-54-336Z.json |
| noaa_nws | observation_stations | observation_stations_new_york_us | catalog_or_product_metadata | .json | geojson | 2 | data_raw\weather\noaa_nws\observation_stations\year=2026\month=05\day=01\hour=00\noaa_nws_observation_stations_new_york_us_2026-05-01T00-25-52-740Z.json |
| noaa_nws | observation_stations | observation_stations_san_francisco_us | catalog_or_product_metadata | .json | geojson | 2 | data_raw\weather\noaa_nws\observation_stations\year=2026\month=05\day=01\hour=00\noaa_nws_observation_stations_san_francisco_us_2026-05-01T00-25-53-562Z.json |
| noaa_nws | points | point_metadata_honolulu_us | catalog_or_product_metadata | .json | json_object | 2 | data_raw\weather\noaa_nws\points\year=2026\month=05\day=01\hour=00\noaa_nws_point_metadata_honolulu_us_2026-05-01T00-25-53-592Z.json |
| noaa_nws | points | point_metadata_new_york_us | catalog_or_product_metadata | .json | json_object | 2 | data_raw\weather\noaa_nws\points\year=2026\month=05\day=01\hour=00\noaa_nws_point_metadata_new_york_us_2026-05-01T00-25-51-820Z.json |
| noaa_nws | points | point_metadata_san_francisco_us | catalog_or_product_metadata | .json | json_object | 2 | data_raw\weather\noaa_nws\points\year=2026\month=05\day=01\hour=00\noaa_nws_point_metadata_san_francisco_us_2026-05-01T00-25-52-764Z.json |
| noaa_radar | mrms_listing | mrms_root_listing | xml_feed | .xml | rss_or_xml | 1 | data_raw\weather\noaa_radar\mrms_listing\year=2026\month=05\day=01\hour=00\noaa_radar_mrms_root_listing_2026-05-01T00-57-01-218Z.xml |
| noaa_radar | mrms_samples | mrms_grib2_gz_byte_sample | grid_or_binary_product | .gz | binary_or_grid | 1 | data_raw\weather\noaa_radar\mrms_samples\year=2026\month=05\day=01\hour=00\noaa_radar_mrms_grib2_gz_byte_sample_2026-05-01T00-57-02-873Z.grib2.gz |
| noaa_radar | nexrad_level2_listing | KOKX_listing | xml_feed | .xml | rss_or_xml | 1 | data_raw\weather\noaa_radar\nexrad_level2_listing\year=2026\month=05\day=01\hour=00\noaa_radar_kokx_listing_2026-05-01T00-57-00-947Z.xml |
| noaa_radar | nexrad_level2_samples | KOKX_level2_byte_sample | source_specific_json | .bin | raw | 1 | data_raw\weather\noaa_radar\nexrad_level2_samples\year=2026\month=05\day=01\hour=00\noaa_radar_kokx_level2_byte_sample_2026-05-01T00-57-01-514Z.bin |
| noaa_spc | convective_outlooks | day1_categorical | geospatial_features | .geojson | geojson | 1 | data_raw\weather\noaa_spc\convective_outlooks\year=2026\month=05\day=01\hour=00\noaa_spc_day1_categorical_2026-05-01T00-56-59-387Z.geojson |
| noaa_spc | convective_outlooks | day1_hail | geospatial_features | .geojson | geojson | 1 | data_raw\weather\noaa_spc\convective_outlooks\year=2026\month=05\day=01\hour=00\noaa_spc_day1_hail_2026-05-01T00-57-01-042Z.geojson |
| noaa_spc | convective_outlooks | day1_tornado | geospatial_features | .geojson | geojson | 1 | data_raw\weather\noaa_spc\convective_outlooks\year=2026\month=05\day=01\hour=00\noaa_spc_day1_tornado_2026-05-01T00-57-00-267Z.geojson |
| noaa_spc | convective_outlooks | day1_wind | geospatial_features | .geojson | geojson | 1 | data_raw\weather\noaa_spc\convective_outlooks\year=2026\month=05\day=01\hour=00\noaa_spc_day1_wind_2026-05-01T00-57-03-117Z.geojson |
| open_meteo | forecast | forecast_honolulu_us | weather_time_series | .json | json_object | 3 | data_raw\weather\open_meteo\forecast\year=2026\month=05\day=01\hour=00\open_meteo_forecast_honolulu_us_2026-05-01T00-25-49-874Z.json |
| open_meteo | forecast | forecast_kolkata_in | weather_time_series | .json | json_object | 3 | data_raw\weather\open_meteo\forecast\year=2026\month=05\day=01\hour=00\open_meteo_forecast_kolkata_in_2026-05-01T00-25-47-183Z.json |
| open_meteo | forecast | forecast_new_york_us | weather_time_series | .json | json_object | 3 | data_raw\weather\open_meteo\forecast\year=2026\month=05\day=01\hour=00\open_meteo_forecast_new_york_us_2026-05-01T00-25-49-447Z.json |
| open_meteo | forecast | forecast_san_francisco_us | weather_time_series | .json | json_object | 3 | data_raw\weather\open_meteo\forecast\year=2026\month=05\day=01\hour=00\open_meteo_forecast_san_francisco_us_2026-05-01T00-25-49-660Z.json |
| openaq | latest | latest_co | air_quality_time_series | .json | json_object, unknown | 3 | data_raw\weather\openaq\latest\year=2026\month=05\day=01\hour=00\openaq_latest_co_2026-05-01T00-27-47-414Z.json |
| openaq | latest | latest_no2 | air_quality_time_series | .json | json_object, unknown | 3 | data_raw\weather\openaq\latest\year=2026\month=05\day=01\hour=00\openaq_latest_no2_2026-05-01T00-27-44-114Z.json |
| openaq | latest | latest_o3 | air_quality_time_series | .json | json_object, unknown | 3 | data_raw\weather\openaq\latest\year=2026\month=05\day=01\hour=00\openaq_latest_o3_2026-05-01T00-27-43-121Z.json |
| openaq | latest | latest_pm10 | air_quality_time_series | .json | json_object, unknown | 3 | data_raw\weather\openaq\latest\year=2026\month=05\day=01\hour=00\openaq_latest_pm10_2026-05-01T00-27-42-057Z.json |
| openaq | latest | latest_pm25 | air_quality_time_series | .json | json_object, unknown | 3 | data_raw\weather\openaq\latest\year=2026\month=05\day=01\hour=00\openaq_latest_pm25_2026-05-01T00-27-41-586Z.json |
| openaq | latest | latest_so2 | air_quality_time_series | .json | json_object, unknown | 3 | data_raw\weather\openaq\latest\year=2026\month=05\day=01\hour=00\openaq_latest_so2_2026-05-01T00-27-45-101Z.json |
| openaq | locations | locations_sample | catalog_or_product_metadata | .json | json_object, unknown | 3 | data_raw\weather\openaq\locations\year=2026\month=05\day=01\hour=00\openaq_locations_sample_2026-05-01T00-27-40-001Z.json |
| openaq | metadata | parameters | catalog_or_product_metadata | .json | json_object, unknown | 3 | data_raw\weather\openaq\metadata\year=2026\month=05\day=01\hour=00\openaq_parameters_2026-05-01T00-27-39-203Z.json |
| rainviewer | radar_index | weather_maps_index | source_specific_json | .json | json_object | 1 | data_raw\weather\rainviewer\radar_index\year=2026\month=05\day=01\hour=00\rainviewer_weather_maps_index_2026-05-01T00-57-00-014Z.json |
| rainviewer | radar_tile_samples | latest_radar_tile_sample | grid_or_binary_product | .png | binary_or_grid | 1 | data_raw\weather\rainviewer\radar_tile_samples\year=2026\month=05\day=01\hour=00\rainviewer_latest_radar_tile_sample_2026-05-01T00-57-00-227Z.png |
| reference_context | faa_nas | airport_status_information | xml_feed | .xml | rss_or_xml | 1 | data_raw\weather\reference_context\faa_nas\year=2026\month=05\day=01\hour=01\reference_context_airport_status_information_2026-05-01T01-01-39-378Z.xml |
| reference_context | nasa_cmr_reference | lis_lightning_collections | catalog_or_product_metadata | .json | json_object | 2 | data_raw\weather\reference_context\nasa_cmr_reference\year=2026\month=05\day=01\hour=01\reference_context_lis_lightning_collections_2026-05-01T01-01-38-296Z.json |
| reference_context | nasa_cmr_reference | viirs_night_lights_collections | catalog_or_product_metadata | .json | json_object | 2 | data_raw\weather\reference_context\nasa_cmr_reference\year=2026\month=05\day=01\hour=01\reference_context_viirs_night_lights_collections_2026-05-01T01-01-38-942Z.json |
| reference_context | openfema | disaster_declarations_sample | source_specific_json | .json | json_object, unknown | 2 | data_raw\weather\reference_context\openfema\year=2026\month=05\day=01\hour=01\reference_context_disaster_declarations_sample_2026-05-01T01-00-21-177Z.json |
| reference_context | osm | kolkata_critical_context_sample | reference_features | .json | json_object | 2 | data_raw\weather\reference_context\osm\year=2026\month=05\day=01\hour=01\reference_context_kolkata_critical_context_sample_2026-05-01T01-01-32-069Z.json |
| reference_context | soilgrids | kolkata_soil_properties_sample | reference_features | .json | json_object | 2 | data_raw\weather\reference_context\soilgrids\year=2026\month=05\day=01\hour=01\reference_context_kolkata_soil_properties_sample_2026-05-01T01-01-35-613Z.json |
| reference_context | terrain | srtm_elevation_sample | reference_features | .json | json_object, unknown | 2 | data_raw\weather\reference_context\terrain\year=2026\month=05\day=01\hour=01\reference_context_srtm_elevation_sample_2026-05-01T01-00-25-524Z.json |
| reference_context | usgs_faults | quaternary_faults_sample | hazard_events | .json | json_object | 1 | data_raw\weather\reference_context\usgs_faults\year=2026\month=05\day=01\hour=01\reference_context_quaternary_faults_sample_2026-05-01T01-01-35-056Z.json |
| reference_context | usgs_hydro_reference | watershed_boundary_sample | reference_features | .json | json_object, unknown | 2 | data_raw\weather\reference_context\usgs_hydro_reference\year=2026\month=05\day=01\hour=01\reference_context_watershed_boundary_sample_2026-05-01T01-00-21-270Z.json |
| smithsonian_gvp | volcano_reference | holocene_volcano_list_excel_xml | hazard_events | .xml | html | 2 | data_raw\weather\smithsonian_gvp\volcano_reference\year=2026\month=05\day=01\hour=00\smithsonian_gvp_holocene_volcano_list_excel_xml_2026-05-01T00-26-31-095Z.xml |
| smithsonian_gvp | volcano_reference | holocene_volcano_list_html | hazard_events | .html | html | 2 | data_raw\weather\smithsonian_gvp\volcano_reference\year=2026\month=05\day=01\hour=00\smithsonian_gvp_holocene_volcano_list_html_2026-05-01T00-26-31-084Z.html |
| smithsonian_gvp | weekly_reports | weekly_report_cap | hazard_events | .xml | html | 2 | data_raw\weather\smithsonian_gvp\weekly_reports\year=2026\month=05\day=01\hour=00\smithsonian_gvp_weekly_report_cap_2026-05-01T00-26-31-074Z.xml |
| smithsonian_gvp | weekly_reports | weekly_report_html | hazard_events | .html | html | 2 | data_raw\weather\smithsonian_gvp\weekly_reports\year=2026\month=05\day=01\hour=00\smithsonian_gvp_weekly_report_html_2026-05-01T00-26-30-220Z.html |
| smithsonian_gvp | weekly_reports | weekly_report_rss | hazard_events | .xml | rss_or_xml | 2 | data_raw\weather\smithsonian_gvp\weekly_reports\year=2026\month=05\day=01\hour=00\smithsonian_gvp_weekly_report_rss_2026-05-01T00-26-30-252Z.xml |
| usgs | earthquakes | earthquake_detail_1 | hazard_events | .json | json_object | 2 | data_raw\weather\usgs\earthquakes\year=2026\month=04\day=30\hour=20\usgs_earthquake_detail_1_2026-04-30T20-11-13-941Z.json |
| usgs | earthquakes | earthquake_detail_2 | hazard_events | .json | json_object | 2 | data_raw\weather\usgs\earthquakes\year=2026\month=04\day=30\hour=20\usgs_earthquake_detail_2_2026-04-30T20-11-14-400Z.json |
| usgs | earthquakes | earthquake_detail_3 | hazard_events | .json | json_object | 2 | data_raw\weather\usgs\earthquakes\year=2026\month=04\day=30\hour=20\usgs_earthquake_detail_3_2026-04-30T20-11-14-853Z.json |
| usgs | earthquakes | earthquakes_live_all_hour | geospatial_features | .geojson | geojson | 2 | data_raw\weather\usgs\earthquakes\year=2026\month=04\day=30\hour=20\usgs_earthquakes_live_all_hour_2026-04-30T20-11-13-349Z.geojson |
| usgs | volcano | volcano_elevated | hazard_events | .json | json_array | 2 | data_raw\weather\usgs\volcano\year=2026\month=04\day=30\hour=20\usgs_volcano_elevated_2026-04-30T20-11-18-173Z.json |
| usgs | volcano | volcano_recent_notices | hazard_events | .json | json_array | 2 | data_raw\weather\usgs\volcano\year=2026\month=04\day=30\hour=20\usgs_volcano_recent_notices_2026-04-30T20-11-18-461Z.json |
| usgs | volcano | volcano_status_geojson | geospatial_features | .geojson | geojson | 2 | data_raw\weather\usgs\volcano\year=2026\month=04\day=30\hour=20\usgs_volcano_status_geojson_2026-04-30T20-11-16-417Z.geojson |
| usgs | water | water_instant_values | reference_features | .json | usgs_water | 2 | data_raw\weather\usgs\water\year=2026\month=04\day=30\hour=20\usgs_water_instant_values_2026-04-30T20-11-15-147Z.json |
| usgs_earthquake | earthquakes | earthquake_detail_1 | hazard_events | .json | json_object | 2 | data_raw\weather\usgs_earthquake\earthquakes\year=2026\month=05\day=01\hour=00\usgs_earthquake_earthquake_detail_1_2026-05-01T00-26-11-109Z.json |
| usgs_earthquake | earthquakes | earthquake_detail_2 | hazard_events | .json | json_object | 2 | data_raw\weather\usgs_earthquake\earthquakes\year=2026\month=05\day=01\hour=00\usgs_earthquake_earthquake_detail_2_2026-05-01T00-26-11-389Z.json |
| usgs_earthquake | earthquakes | earthquake_detail_3 | hazard_events | .json | json_object | 2 | data_raw\weather\usgs_earthquake\earthquakes\year=2026\month=05\day=01\hour=00\usgs_earthquake_earthquake_detail_3_2026-05-01T00-26-11-661Z.json |
| usgs_earthquake | earthquakes | earthquakes_live_all_hour | geospatial_features | .geojson | geojson | 2 | data_raw\weather\usgs_earthquake\earthquakes\year=2026\month=05\day=01\hour=00\usgs_earthquake_earthquakes_live_all_hour_2026-05-01T00-26-09-684Z.geojson |
| usgs_earthquake | earthquakes | earthquakes_m45_day | geospatial_features | .geojson | geojson | 2 | data_raw\weather\usgs_earthquake\earthquakes\year=2026\month=05\day=01\hour=00\usgs_earthquake_earthquakes_m45_day_2026-05-01T00-26-12-207Z.geojson |
| usgs_earthquake | earthquakes | earthquakes_significant_day | geospatial_features | .geojson | geojson | 2 | data_raw\weather\usgs_earthquake\earthquakes\year=2026\month=05\day=01\hour=00\usgs_earthquake_earthquakes_significant_day_2026-05-01T00-26-11-935Z.geojson |
| usgs_volcano | alerts | hans_elevated_volcanoes | hazard_events | .json | json_array | 2 | data_raw\weather\usgs_volcano\alerts\year=2026\month=05\day=01\hour=00\usgs_volcano_hans_elevated_volcanoes_2026-05-01T00-26-32-868Z.json |
| usgs_volcano | api_docs | vsc_api_index | hazard_events | .html | html | 2 | data_raw\weather\usgs_volcano\api_docs\year=2026\month=05\day=01\hour=00\usgs_volcano_vsc_api_index_2026-05-01T00-26-33-760Z.html |
| usgs_volcano | notices | hans_recent_notices | hazard_events | .json | json_array | 2 | data_raw\weather\usgs_volcano\notices\year=2026\month=05\day=01\hour=00\usgs_volcano_hans_recent_notices_2026-05-01T00-26-33-163Z.json |
| usgs_volcano | volcano_reference | volcano_status_geojson | geospatial_features | .geojson | html | 2 | data_raw\weather\usgs_volcano\volcano_reference\year=2026\month=05\day=01\hour=00\usgs_volcano_volcano_status_geojson_2026-05-01T00-26-31-104Z.geojson |
| usgs_water | instant_values | legacy_instant_values_configured_sites | hydrology_time_series | .json | usgs_water | 2 | data_raw\weather\usgs_water\instant_values\year=2026\month=05\day=01\hour=00\usgs_water_legacy_instant_values_configured_sites_2026-05-01T00-26-14-480Z.json |
| usgs_water | metadata | ogc_collections | catalog_or_product_metadata | .json | json_object | 2 | data_raw\weather\usgs_water\metadata\year=2026\month=05\day=01\hour=00\usgs_water_ogc_collections_2026-05-01T00-26-12-354Z.json |
| worldpop | metadata | pop_categories | catalog_or_product_metadata | .json | json_object, unknown | 3 | data_raw\weather\worldpop\metadata\year=2026\month=05\day=01\hour=00\worldpop_pop_categories_2026-05-01T00-26-41-412Z.json |
| worldpop | metadata | root_datasets | catalog_or_product_metadata | .json | json_object, unknown | 3 | data_raw\weather\worldpop\metadata\year=2026\month=05\day=01\hour=00\worldpop_root_datasets_2026-05-01T00-26-38-881Z.json |
| worldpop | population_metadata | pop_wpgp_IND_2020 | catalog_or_product_metadata | .json | json_object, unknown | 3 | data_raw\weather\worldpop\population_metadata\year=2026\month=05\day=01\hour=00\worldpop_pop_wpgp_ind_2020_2026-05-01T00-26-42-103Z.json |
| worldpop | population_metadata | pop_wpgp_USA_2020 | catalog_or_product_metadata | .json | json_object, unknown | 3 | data_raw\weather\worldpop\population_metadata\year=2026\month=05\day=01\hour=00\worldpop_pop_wpgp_usa_2020_2026-05-01T00-26-43-065Z.json |


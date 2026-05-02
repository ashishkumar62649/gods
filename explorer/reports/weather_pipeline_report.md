# Weather Pipeline Stage 3-7 Report

Generated: 2026-05-02T21:43:52.136Z

## Stage 3 - Expanded Normalization

Expanded normalizers now cover Open-Meteo, USGS Earthquake, NOAA/NWS alerts, GDACS, OpenAQ, USGS Water, NASA FIRMS, NOAA/NWPS, NOAA DART, and USGS Volcano.

| Family | Latest JSONL Rows |
| --- | ---: |
| source_raw_files | 85 |
| weather_time_series | 9,324 |
| hazard_events | 485 |
| air_quality_time_series | 580 |
| hydrology_time_series | 7,526 |

Rejected rows: 20

## Stage 4 - Database Model

Added `0005_weather_intelligence_views.sql` with source-aware current-value and source-health views.

| Database Object | Rows |
| --- | ---: |
| source_raw_files | 338 |
| weather_time_series | 11,394 |
| hazard_events | 482 |
| air_quality_time_series | 580 |
| hydrology_time_series | 7,524 |
| best_current_values | 604 |
| latest_hazard_events | 469 |

## Stage 5 - Query/API Layer

API now includes table reads plus `best-current` and `nearby` intelligence endpoints.

- `/api/intel/best-current`
- `/api/intel/nearby?lat=38.95&lon=-77.13&radiusKm=250`
- `/api/intel/source-health`

## Stage 6 - Five-Tier Fetching

Tiered fetch command is available through `npm run fetch:weather:tier -- --tier N`, plus direct tier scripts.

Latest tiered run: tier 1, selected 6, dryRun=true

## Stage 7 - Production Workflow

- `npm run fetch:weather:tier1` through `npm run fetch:weather:tier5`
- `npm run normalize:weather:stage2`
- `npm run insert:weather:stage3`
- `npm run db:weather:views`
- `npm run report:weather`
- `npm run weather:refresh`

## Source Health

Canonical sources: 21; working=14, catalog_only=6, partial=0, credential_required=0, broken=1

| Tier | Source | Status | Success-like | Fetcher |
| --- | --- | --- | ---: | --- |
| 2 | open_meteo | working | 4 | open_meteo_fetcher.mjs |
| 1 | noaa_nws | working | 13 | noaa_nws_fetcher.mjs |
| 3 | noaa_ncei | working | 1 | climate_air_reference_fetcher.mjs |
| 2 | noaa_nodd_gfs | working | 4 | noaa_nodd_gfs_fetcher.mjs |
| 2 | nasa_gibs | working | 2 | nasa_gibs_fetcher.mjs |
| 2 | noaa_goes | working | 3 | noaa_goes_fetcher.mjs |
| 1 | nasa_firms | working | 5 | nasa_firms_fetcher.mjs |
| 1 | usgs_earthquake | working | 6 | usgs_earthquake_fetcher.mjs |
| 2 | usgs_water | working | 2 | usgs_water_fetcher.mjs |
| 2 | noaa_nwps | working | 4 | noaa_nwps_fetcher.mjs |
| 1 | noaa_dart | working | 2 | noaa_dart_fetcher.mjs |
| 3 | copernicus_era5_cds | catalog_only | 1 | climate_air_reference_fetcher.mjs |
| 3 | copernicus_cams | catalog_only | 1 | climate_air_reference_fetcher.mjs |
| 2 | openaq | working | 8 | openaq_fetcher.mjs |
| 3 | copernicus_land_clms | catalog_only | 2 | copernicus_land_clms_fetcher.mjs |
| 3 | nasa_earthdata_modis | catalog_only | 5 | nasa_earthdata_modis_fetcher.mjs |
| 4 | smithsonian_gvp | broken_feed | 0 | smithsonian_gvp_fetcher.mjs |
| 1 | usgs_volcano | working | 4 | usgs_volcano_fetcher.mjs |
| 1 | gdacs | working | 8 | gdacs_fetcher.mjs |
| 4 | copernicus_ems_glofas | catalog_only | 1 | climate_air_reference_fetcher.mjs |
| 4 | worldpop | catalog_only | 4 | worldpop_fetcher.mjs |

## Database Source Health

| Source | Status | Success | Failure | Latest Fetch |
| --- | --- | ---: | ---: | --- |
| worldpop | working | 12 | 0 | Sun May 03 2026 00:55:18 GMT+0530 (India Standard Time) |
| climate_air_reference | working | 11 | 0 | Sun May 03 2026 00:55:11 GMT+0530 (India Standard Time) |
| gdacs | working | 42 | 0 | Sun May 03 2026 00:55:11 GMT+0530 (India Standard Time) |
| usgs_volcano | working | 12 | 0 | Sun May 03 2026 00:55:07 GMT+0530 (India Standard Time) |
| smithsonian_gvp | partial | 2 | 13 | Sun May 03 2026 00:55:04 GMT+0530 (India Standard Time) |
| nasa_earthdata_modis | working | 19 | 0 | Sun May 03 2026 00:55:01 GMT+0530 (India Standard Time) |
| copernicus_land_clms | working | 7 | 0 | Sun May 03 2026 00:54:52 GMT+0530 (India Standard Time) |
| openaq | working | 24 | 0 | Sun May 03 2026 00:54:49 GMT+0530 (India Standard Time) |
| noaa_dart | working | 6 | 0 | Sun May 03 2026 00:54:42 GMT+0530 (India Standard Time) |
| noaa_nwps | partial | 12 | 2 | Sun May 03 2026 00:54:40 GMT+0530 (India Standard Time) |
| usgs_water | working | 6 | 0 | Sun May 03 2026 00:54:30 GMT+0530 (India Standard Time) |
| usgs_earthquake | working | 18 | 0 | Sun May 03 2026 00:54:28 GMT+0530 (India Standard Time) |

## Stage 3 Insert

Latest Stage 3 run 0399b38a-4c11-495f-b706-020f0a934199: inserted 7,757 rows/files.

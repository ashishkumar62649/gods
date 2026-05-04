# Data Pipelines

The v2 pipeline direction is Python-first:

```text
fetch -> raw audit -> normalize -> validate -> load database -> expose API -> render frontend
```

Generated outputs stay out of source folders:

- `data_raw/`: raw fetched files and source metadata.
- `data_processed/`: cleaned intermediates.
- `data_normalized/`: database-ready JSONL or staged files.

## Weather

Command:

```bash
npm --prefix explorer-v2 run pipeline:weather
```

Implemented:

- Open-Meteo current fetcher: `pipelines/weather/fetchers/open_meteo_fetcher.py`
- Weather normalizer: `pipelines/weather/normalizers/normalize_weather.py`
- Weather validator: `pipelines/weather/validators/validate_weather_records.py`
- Weather loader interface: `pipelines/weather/loaders/load_weather_to_postgres.py`
- Plan-only mode for tests: `python -m pipelines.weather.jobs.run_weather_pipeline --plan-only`

Current caveat:

- Non-dry-run weather DB loading needs raw file/fetch-run registration hardening for the active `weather_time_series` schema.

## Hazards

Command:

```bash
npm --prefix explorer-v2 run pipeline:hazards
```

Implemented:

- USGS Earthquake fetcher: `pipelines/weather/fetchers/usgs_earthquake_fetcher.py`
- Hazard normalizer: `pipelines/weather/normalizers/normalize_hazards.py`
- Hazard validator: `pipelines/weather/validators/validate_hazard_records.py`
- Hazard loader: `pipelines/weather/loaders/load_hazards_to_postgres.py`
- Plan-only mode for tests: `python -m pipelines.weather.jobs.run_hazard_pipeline --plan-only`

## Pending Source Families

The v1 JS weather system includes NOAA GFS/GOES/radar/SPC/cyclone/marine/NWPS/DART,
NASA GIBS/FIRMS/Earthdata MODIS, USGS water/volcano, Smithsonian GVP, GDACS,
RainViewer, OpenAQ, WorldPop, Copernicus CLMS, climate-air reference, and reference
context sources. These are tracked in `SOURCE_COVERAGE.md`.

## Loader Rules

- Use batch insert or COPY for large datasets.
- Upsert on stable source IDs/event IDs.
- Register source health, fetch run, raw URI, and record counts.
- Keep credentials in environment variables only.
- Mark missing credentials as blocked, not failed implementation.

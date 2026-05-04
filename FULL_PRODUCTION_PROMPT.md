You are working inside my repository named "god-eyes".

This project has two main versions:

1. explorer/
   - This is version 1.
   - It contains the old working logic for live flights, satellites, weather, hazards, maritime/intelligence, internet cables, visualizations, source fetchers, normalization logic, database files, and backend services.
   - Treat explorer/ as READ-ONLY reference.
   - Do not modify explorer/.
   - Do not delete explorer/.
   - Only copy useful logic from explorer/ into explorer-v2/.

2. explorer-v2/
   - This is the active production version.
   - The frontend has been rebuilt from scratch.
   - The backend, database, data pipelines, binary transport, and real-time visualization wiring must now be completed.
   - Work mainly inside explorer-v2/.

Your mission:

Complete explorer-v2 so that it reaches the functional level of explorer version 1, but with a cleaner production-grade architecture.

The final result should support:

- Real-time aircraft/flight visualization
- Real-time satellite visualization
- Satellite orbital trails and cinematic movement
- Weather intelligence visualization
- Volcano/hazard/earthquake/disaster intelligence
- Maritime/ship intelligence if present in v1
- Internet cable / infrastructure visualization if present in v1
- Source health panels
- Layer toggles
- Real-time panels wired to actual backend/database data
- Binary data delivery to frontend for heavy/high-volume datasets
- Database-backed storage for every important domain
- Python pipelines for fetching, normalizing, validating, and loading data
- Node backend API for serving frontend data
- React/Cesium frontend for cinematic visualization
- Production-ready folder structure, scripts, configs, and documentation

IMPORTANT AUTONOMOUS WORK RULES:

- Do not stop after making only partial changes.
- Continue working iteratively until all reachable acceptance criteria are complete.
- Do not ask me questions unless absolutely impossible to continue.
- Make best-effort architectural decisions yourself.
- When blocked by missing credentials, unavailable external APIs, or network restrictions, create the correct interface, config, mock fixture, documentation, and TODO note, then continue with all unblocked work.
- Use the browser/web research tool if available.
- Use the browser repeatedly when you need to understand current documentation, API formats, binary transport options, Cesium rendering patterns, database loading best practices, or source-specific data formats.
- Your loop should be:
  1. Inspect current code.
  2. Search/read docs if needed.
  3. Identify missing connection.
  4. Implement.
  5. Run tests/build/checks.
  6. Fix errors.
  7. Repeat until the system works end-to-end.
- Do not stop just because one test fails. Diagnose and fix it.
- Do not stop just because one module is complex. Split the work and continue.
- Do not leave broken imports.
- Do not leave dead placeholder routes when real v1 logic exists.
- Do not leave panels/toggles disconnected.
- Do not leave frontend mock data as the default when backend/database data exists.
- Do not keep secrets in the repository.
- Do not commit node_modules, venv, dist, logs, cache folders, or huge generated files as source.

Repository rules:

- explorer/ stays untouched.
- explorer-v2/ is the active project.
- _unnecessary/ is only for quarantined old files.
- Real secrets must be removed from active folders.
- Create .env.example files instead of real .env files.
- Large data should not live inside src/.
- Source code, generated data, and runtime cache must stay separated.

Target architecture:

Frontend:
- explorer-v2/frontend/
- React + TypeScript + Vite + Cesium
- Cinematic real-time visualization
- Layer toggles and panels wired to backend data
- No heavy JSON parsing for large datasets
- Use binary/vector/tiled formats where appropriate

Backend:
- explorer-v2/backend/
- Node.js / Express or existing Node server style
- Serves API endpoints for frontend
- Serves binary data for high-volume visualization
- Serves lightweight JSON only for metadata, UI panels, health, summaries, and config
- Reads from PostgreSQL/PostGIS/TimescaleDB and pipeline outputs

Pipelines:
- explorer-v2/pipelines/
- Python-first data pipelines
- Fetch external sources
- Normalize data
- Validate records
- Load into database
- Generate reports
- Keep old .mjs pipeline files only when needed for reference or until replaced

Database:
- explorer-v2/database/postgres/
- PostgreSQL + PostGIS + TimescaleDB where useful
- Migrations and seeds must be clean
- Every major domain should have proper database tables or views
- Pipeline loaders should insert into database efficiently

Data flow should become:

External APIs / Data Sources
    ↓
Python Fetchers
    ↓
data_raw/
    ↓
Python Normalizers
    ↓
data_normalized/
    ↓
Python Loaders
    ↓
PostgreSQL / PostGIS / TimescaleDB
    ↓
Node Backend
    ↓
Binary API / Vector Tiles / Realtime Stream
    ↓
React + Cesium Frontend

Required domains to inspect and wire from v1:

1. Flights / Aircraft
   - Inspect explorer/ for existing flight logic.
   - Copy/adapt backend flight services.
   - Wire aircraft index and airport index correctly.
   - Fix old path references.
   - Store useful flight data in database where appropriate.
   - Add/complete frontend flight renderer.
   - Add aircraft trails/tails.
   - Add panel data for selected aircraft.
   - Add toggles for flights, trails, altitude, speed, callsign, airport context.
   - Use binary or compact format for live aircraft positions if high volume.

2. Satellites
   - Inspect explorer/ for satellite fetching/orbit/rendering logic.
   - Copy/adapt satellite backend services.
   - Add database schema if missing.
   - Store TLE/source metadata where useful.
   - Add satellite frontend renderer.
   - Add orbital trails.
   - Add cinematic movement/interpolation.
   - Add selected satellite panel.
   - Add toggles for satellites, orbit trails, categories, altitude bands.
   - Use compact/binary transport for large satellite state lists.

3. Weather Intelligence
   - Inspect explorer/source-fetchers/weather/.
   - Inspect explorer/normalization/weather/.
   - Complete explorer-v2/pipelines/weather/ as Python-first.
   - Fetch weather data.
   - Normalize weather time series.
   - Validate weather records.
   - Load weather into database.
   - Add weather API routes.
   - Add frontend weather layers.
   - Add weather panel data.
   - Support current/best weather views from database.
   - Use tiled/vector/binary delivery for heavy geospatial weather layers.

4. Hazards / Disasters / Volcano / Earthquake
   - Inspect v1 hazard, emergency, volcano, earthquake, GDACS, USGS, Smithsonian, NASA FIRMS logic.
   - Create/complete Python fetchers.
   - Normalize hazards into consistent event schema.
   - Load hazard events into database.
   - Add backend hazard routes.
   - Add frontend hazard renderer.
   - Add hazard severity styling.
   - Add selected hazard panel.
   - Add toggles for earthquakes, volcanoes, wildfire, flood, cyclone, severe weather, disaster events.
   - Use binary/vector tiles where data volume is high.

5. Maritime / Ships
   - Inspect v1 maritime/ship logic.
   - Copy/adapt backend ship services.
   - Add database schema if missing.
   - Add frontend ship renderer if v1 supports it.
   - Add selected vessel panel.
   - Add toggles for maritime layer and vessel trails.
   - Use compact/binary transport if many ship positions are shown.

6. Internet Cables / Infrastructure
   - Inspect v1 infrastructure/internet cable logic.
   - Copy/adapt source files and backend logic.
   - Store cable/infrastructure geospatial features in PostGIS or static optimized data if appropriate.
   - Add backend routes for infrastructure.
   - Add frontend infrastructure/cable renderer.
   - Add panel for selected infrastructure/cable/landing point.
   - Add toggles for internet cables, landing points, critical infrastructure.
   - Prefer vector tiles / MVT / PMTiles / FlatGeobuf / compact binary for heavy line geometry.

7. Source Health
   - Inspect v1 source health logic.
   - Add database/source registry support.
   - Track source fetch status, last success, last failure, record counts, latency, and confidence.
   - Wire source health backend endpoint.
   - Wire source health frontend panel.
   - Add source health status badges in UI.

8. Panels and Toggles
   - Inspect current explorer-v2 frontend panels/toggles.
   - Wire every toggle to a real renderer/layer.
   - Wire every panel to selected entity data.
   - Remove fake default mock data from production path.
   - Mock data may remain only in frontend/src/data/mock/ or tests/fixtures/.
   - The UI should clearly support:
     - Flights
     - Flight trails
     - Satellites
     - Satellite orbit trails
     - Weather
     - Hazards
     - Volcanoes
     - Earthquakes
     - Maritime
     - Internet cables
     - Infrastructure
     - Source health
     - Search/location intelligence
     - Timeline/live mode where appropriate

Binary frontend data requirement:

For high-volume data, do not send huge JSON blobs to the frontend.

Implement the best practical binary/optimized transport for each domain:

- Real-time points such as aircraft/satellites/ships:
  Use MessagePack, Protocol Buffers, FlatBuffers, or compact binary arrays.
  Choose one consistent approach and document it.
  Frontend must decode efficiently.
  Avoid expensive JSON parsing loops for large live updates.

- Large geospatial lines/polygons such as internet cables, infrastructure, hazard boundaries, weather layers:
  Prefer Mapbox Vector Tiles/MVT, PMTiles, FlatGeobuf, GeoParquet-to-tile pipeline, or Cesium-compatible optimized formats.
  Use PostGIS ST_AsMVT where appropriate.
  Do not send full GeoJSON for huge layers.

- Time-series/weather data:
  Use compact query windows, aggregation, downsampling, and binary or columnar outputs where useful.
  Do not push full raw datasets to the browser.

- UI panels:
  JSON is acceptable for small selected-entity details, summaries, source health, and config.

Backend binary API expectations:

Create a clean backend API design such as:

- GET /api/health
- GET /api/sources/health
- GET /api/flights/live
- GET /api/flights/live.bin
- GET /api/flights/:id
- GET /api/satellites/live
- GET /api/satellites/live.bin
- GET /api/satellites/:id
- GET /api/weather/current
- GET /api/weather/tiles/:z/:x/:y.mvt
- GET /api/hazards/current
- GET /api/hazards/tiles/:z/:x/:y.mvt
- GET /api/maritime/live
- GET /api/maritime/live.bin
- GET /api/infrastructure/cables/tiles/:z/:x/:y.mvt
- GET /api/infrastructure/:id
- GET /api/intel/location
- GET /api/search

Exact routes may differ if the current code already has a better naming system, but keep the API clean and documented.

Frontend performance rules:

- Use requestAnimationFrame carefully.
- Avoid re-rendering React components for every entity movement.
- Keep Cesium entity updates outside unnecessary React state loops.
- Use refs/stores for high-frequency updates.
- Batch updates.
- Use interpolation for cinematic movement.
- Use level-of-detail where needed.
- Use clustering or thinning for huge point datasets.
- Use vector tiles or binary geometry for heavy layers.
- Add graceful loading states.
- Add error states when backend/source is unavailable.
- Do not freeze the browser.

Cinematic visualization requirements:

Flights:
- Smooth movement
- Trails/tails
- Heading-aware orientation where possible
- Altitude/speed visual cues if already present or easy to add
- Click/select aircraft to open panel

Satellites:
- Smooth orbital movement
- Orbit path/trail
- Category/source filtering
- Click/select satellite to open panel

Weather/hazards:
- Severity-based rendering
- Clear map symbols
- Click/select event to open panel
- Time freshness indicators

Internet cables/infrastructure:
- Clean line rendering
- Landing points if available
- Click/select cable or infrastructure item to open panel

Database completion requirements:

Inspect existing database files in explorer/ and explorer-v2/.

Create or complete migrations for:

- source_registry
- source_health
- aircraft/live_flights if appropriate
- airports/reference data
- satellites/TLE/current satellite states
- weather time series
- hazard events
- volcanic events
- earthquake events
- maritime vessels/positions if appropriate
- infrastructure/cables/landing points
- normalized observation/event tables
- materialized/current views where needed

Use PostGIS geometry columns for geospatial features.
Use indexes for time, geometry, source, entity ID.
Use TimescaleDB hypertables where useful for time-series if already supported.
Keep SQL migrations organized under:

explorer-v2/database/postgres/migrations/
explorer-v2/database/postgres/seeds/
explorer-v2/database/postgres/init/

Pipeline completion requirements:

For each source/domain migrated from v1:

- Create fetcher
- Create normalizer
- Create validator
- Create loader
- Create job runner
- Add logging
- Add source health update
- Add failure handling
- Add README notes
- Add test or smoke test where possible

Python pipeline structure should be:

explorer-v2/pipelines/
├── common/
│   ├── config.py
│   ├── paths.py
│   ├── logging.py
│   ├── http_client.py
│   ├── db.py
│   ├── geo_utils.py
│   ├── binary.py
│   └── source_health.py
│
├── flights/
│   ├── fetchers/
│   ├── normalizers/
│   ├── loaders/
│   ├── validators/
│   └── jobs/
│
├── satellites/
│   ├── fetchers/
│   ├── normalizers/
│   ├── loaders/
│   ├── validators/
│   └── jobs/
│
├── weather/
│   ├── fetchers/
│   ├── normalizers/
│   ├── loaders/
│   ├── validators/
│   └── jobs/
│
├── hazards/
│   ├── fetchers/
│   ├── normalizers/
│   ├── loaders/
│   ├── validators/
│   └── jobs/
│
├── maritime/
│   ├── fetchers/
│   ├── normalizers/
│   ├── loaders/
│   ├── validators/
│   └── jobs/
│
└── infrastructure/
    ├── fetchers/
    ├── normalizers/
    ├── loaders/
    ├── validators/
    └── jobs/

If the current explorer-v2 already has a different but clean pipeline structure, adapt carefully instead of blindly moving everything.

Backend cleanup requirements:

- Fix old v1 path references.
- Move large files out of backend/src/.
- Put backend reference data in backend/data/ or data_raw/reference/.
- Ensure backend starts from explorer-v2/backend/src/index.mjs.
- Ensure routes import services correctly.
- Ensure services read from database or clean reference data paths.
- Ensure binary endpoints set correct Content-Type.
- Ensure CORS/config is safe.
- Ensure errors are handled cleanly.
- Ensure source health is exposed.
- Ensure API docs are updated.

Frontend cleanup requirements:

- Remove backend-only dependencies from frontend package.json.
- Do not keep pg or database packages in frontend.
- Keep Cesium rendering code cleanly under frontend/src/earth or frontend/src/engine.
- Keep API clients under frontend/src/core/api.
- Keep entity types under frontend/src/core/types.
- Keep mock data under frontend/src/data/mock only.
- Wire app toggles to actual layers.
- Wire selected entity panels to actual API data.
- Ensure frontend build passes.
- Ensure no obvious browser freeze from large JSON data.

Testing and validation:

Run as many of these as possible:

- npm --prefix explorer-v2 run test
- npm --prefix explorer-v2 run build
- npm --prefix explorer-v2/frontend run build
- npm --prefix explorer-v2/backend run start or equivalent smoke check
- Python syntax checks for pipeline files
- Pipeline smoke jobs with sample data
- Database migration syntax checks if possible
- Frontend type check
- Backend route import check
- Search for broken old paths
- Search for remaining secrets
- Search for node_modules inside active project
- Search for huge files inside src/

Also add useful scripts to explorer-v2/package.json, for example:

- dev
- dev:frontend
- dev:backend
- build
- build:frontend
- check
- test
- pipeline:check
- pipeline:weather
- pipeline:all
- db:migrate
- db:seed

Documentation to update/create:

1. explorer-v2/README.md
   Include:
   - Project overview
   - How to run frontend
   - How to run backend
   - How to run database
   - How to run pipelines
   - Environment variables
   - Binary API explanation

2. explorer-v2/docs/CURRENT_STRUCTURE.md
   Explain the final folder structure.

3. explorer-v2/docs/API.md
   Document backend routes and binary endpoints.

4. explorer-v2/docs/DATA_PIPELINES.md
   Explain fetch → normalize → validate → load.

5. explorer-v2/docs/BINARY_TRANSPORT.md
   Explain which binary/vector format is used for each domain.

6. explorer-v2/docs/MIGRATION_FROM_V1.md
   Explain what was copied from explorer/ and where it went.

7. explorer-v2/_migration/README.md
   Track pending and rejected migration items.

Quality bar:

The result should feel production-ready:

- Clear folder structure
- Clean imports
- Real backend routes
- Real database-backed domains where possible
- Real pipeline structure
- No disconnected major UI panels
- No disconnected major toggles
- No large JSON payloads freezing the frontend
- No secrets
- No node_modules committed
- No broken scripts
- No obvious v1 path leftovers
- No giant data files inside src/
- No unexplained placeholder code where v1 already had real logic

Acceptance criteria:

The task is complete only when:

1. explorer/ is untouched.
2. explorer-v2 has clean frontend/backend/pipeline/database structure.
3. Flights from v1 are wired into v2 frontend/backend.
4. Satellites from v1 are wired into v2 frontend/backend.
5. Weather pipeline and visualization are wired as much as possible.
6. Hazard/volcano/earthquake/disaster logic is wired as much as possible.
7. Internet cable/infrastructure logic is wired if present in v1.
8. Panels and toggles control real layers/data.
9. Heavy data uses binary/vector/optimized delivery instead of huge JSON.
10. Database migrations/seeds exist for major domains.
11. Python pipeline structure exists and meaningful source logic is migrated.
12. Frontend build/type-check passes or any failure is documented with exact cause.
13. Backend import/start smoke check passes or any failure is documented with exact cause.
14. Old broken paths are fixed.
15. Documentation explains how to run and maintain the system.

Final response required from you:

When finished, give me:

1. What you completed.
2. What domains are now wired end-to-end.
3. What binary/optimized formats you used.
4. What database tables/migrations were added.
5. What pipelines were completed.
6. What frontend panels/toggles were wired.
7. What commands you ran and their results.
8. What remains blocked and why.
9. Exact files changed.
10. Exact next steps only if something is genuinely impossible due to missing credentials or unavailable external APIs.

Do not give a vague answer.
Do not say "production ready" unless builds/checks pass.
Do not stop at scaffolding.
Keep iterating until the implementation is complete or all remaining blockers are external and clearly documented.


ADDITIONAL NON-NEGOTIABLE INSTRUCTIONS FOR CODEX

Before implementing anything, deeply inspect the existing repository.

You must read and understand every relevant file in:

- explorer/
- explorer/server/
- explorer/server/routes/
- explorer/server/services/
- explorer/server/sources/
- explorer/server/normalize/
- explorer/src/earth/
- explorer/src/engine/
- explorer/source-fetchers/weather/
- explorer/normalization/weather/
- explorer/database/postgres/
- explorer-v2/

The goal is NOT to blindly copy explorer/ into explorer-v2.

The goal is:

Use explorer/ as the old working reference.
Understand what it achieved.
Then rebuild the same capabilities inside explorer-v2 using the new cleaner architecture.

The final explorer-v2 should behave like v1 where v1 had working functionality, but the implementation should be cleaner, more production-ready, better structured, database-backed, and optimized for the new frontend.

DO NOT:
- blindly copy old files without adapting them
- delete working logic
- replace real working functions with placeholders
- leave static fake layers disconnected from real data
- keep mock data as the production path
- skip database integration
- skip visualization wiring
- skip frontend panels
- skip binary/optimized transport
- say something is done when it is only scaffolded

You must build feature parity from v1 into v2.

Create a file:

explorer-v2/docs/V1_FEATURE_PARITY_MATRIX.md

In that file, document every working capability found in explorer/, including:

- flights
- aircraft trails
- aircraft details panel
- airport/reference data
- satellites
- satellite orbit trails
- satellite details panel
- maritime/ships
- internet cables
- infrastructure
- weather
- hazards
- earthquakes
- volcanoes
- fires
- storms/cyclones
- hydrology/water
- air quality
- source health
- layer toggles
- globe visualization managers
- renderers
- panels
- backend routes
- data sources
- data pipelines
- database files

For each capability, document:

- v1 source files
- v2 destination files
- current status
- whether it is wired to real data
- whether it is database-backed
- whether it has frontend visualization
- whether it has a panel/toggle
- whether it uses binary/vector/optimized transport
- remaining blocker if any

You must not finish until this matrix is complete and all possible items are implemented.

REAL DATA RULE

You are allowed to fetch real data.

Do not limit the implementation to samples only.
Do not build sample-only pipelines.
Do not create fake-only data paths.
Do not use tiny fixtures as the default production flow.

The pipelines must be designed to fetch real production data from the real sources.

If a source supports large data, implement the pipeline in a production-safe way:

- streaming downloads where possible
- chunked processing
- resumable downloads where possible
- retry and backoff
- source health tracking
- checksum or metadata tracking
- incremental loading
- deduplication
- database upserts
- batch insert or COPY
- memory-safe processing
- do not load huge files fully into frontend
- do not load huge files fully into memory unless unavoidable
- use raw/processed/normalized data stages

It is acceptable for real data to be very large.
Design the system to handle that.

The frontend must never receive huge raw JSON blobs.
Large real datasets must go through database, tiling, binary transport, aggregation, or streaming.

WEATHER SYSTEM REQUIREMENT

The weather system is not complete until all discovered v1 weather sources are handled properly in explorer-v2.

You must inspect these v1 areas carefully:

- explorer/source-fetchers/weather/
- explorer/normalization/weather/
- explorer/data_raw/weather/
- explorer/data_normalized/weather/
- explorer/database/postgres/
- explorer/server/routes/weatherIntel.mjs
- explorer/server/services/weatherIntelDb.mjs
- explorer/server/services/ClimateEngine.mjs
- explorer/src/earth/weather/
- explorer/src/earth/viewer/useWeatherScene.ts
- explorer/src/engine/WeatherRenderer.ts
- explorer/src/engine/WeatherInspectorRenderer.ts

The v1 weather/source system contains many source families. You must inspect them and rebuild them in v2, including but not limited to:

- Open-Meteo
- NOAA NWS alerts
- NOAA GFS / NODD GFS
- NOAA GOES
- NOAA radar
- NOAA SPC
- NOAA cyclone
- NOAA marine
- NOAA NWPS
- NOAA DART
- NASA GIBS
- NASA FIRMS
- NASA Earthdata MODIS
- USGS earthquakes
- USGS water
- USGS volcano
- Smithsonian GVP
- GDACS
- RainViewer
- OpenAQ
- WorldPop
- Copernicus land / CLMS
- climate air reference
- reference context sources
- any other source found in v1 manifests or fetcher files

For every weather/hazard source found in v1:

1. Create or complete a Python fetcher in explorer-v2.
2. Create or complete a normalizer.
3. Create or complete a validator.
4. Create or complete a database loader.
5. Store raw data under data_raw/.
6. Store processed/normalized output under data_processed/ or data_normalized/.
7. Load usable records into PostgreSQL/PostGIS/TimescaleDB.
8. Track source health.
9. Expose backend API or tile/binary endpoint.
10. Add globe visualization where meaningful.
11. Add panel data where meaningful.
12. Add layer toggle where meaningful.
13. Document the source in DATA_PIPELINES.md and V1_FEATURE_PARITY_MATRIX.md.

Weather is not complete if it only fetches files.
Weather is not complete if it only normalizes JSONL.
Weather is not complete if it is not loaded into the database.
Weather is not complete if it is not visible on the globe.
Weather is not complete if it is not shown in the panel.
Weather is not complete if it freezes the frontend.
Weather is not complete if it uses only sample data.

DATABASE-FIRST RULE

Every domain that produces durable intelligence should be database-backed.

Complete or add database schema/migrations for:

- source registry
- source health
- weather time series
- weather current/best views
- hazard events
- earthquake events
- volcano events
- fire events
- flood/hydrology events
- air quality observations
- storm/cyclone events
- satellite catalog
- satellite TLE/state snapshots
- aircraft/flight live snapshots where appropriate
- aircraft/airport reference data
- maritime vessels/positions where available
- infrastructure features
- internet cables
- cable landing points
- ports/seaports if available from v1 or source data
- airports
- any other working v1 domain

Use:

- PostGIS geometry columns for spatial features
- TimescaleDB/hypertables for high-volume time series if available
- indexes on entity IDs, source IDs, timestamps, and geometry
- materialized views or current views where useful
- source confidence/provenance fields
- upsert/deduplication logic

Do not leave the database as only one init file.
Do not leave pipelines disconnected from database.
Do not leave backend reading only static files if database tables exist.

REAL VISUALIZATION RULE

For every working visualization from v1, reconstruct it in v2.

Do not just copy the old code.
Understand the v1 behavior and rebuild it in the v2 structure.

Inspect and recreate/adapt behavior from files such as:

- explorer/src/earth/flights/
- explorer/src/earth/satellites/
- explorer/src/earth/maritime/
- explorer/src/earth/infrastructure/
- explorer/src/earth/weather/
- explorer/src/earth/viewer/
- explorer/src/engine/
- explorer/src/earth/infrastructure/CableSceneLayerManager.ts
- explorer/src/earth/viewer/useCableScene.ts
- explorer/src/earth/maritime/MaritimeLayerManager.ts
- explorer/src/earth/satellites/SatelliteSceneLayerManager.ts
- explorer/src/earth/weather/WeatherLayerManager.ts

The v2 frontend must show real connected layers for:

- flights
- aircraft trails/tails
- airports
- satellites
- satellite orbit trails
- maritime/ships if source is available
- internet cables
- cable landing points if data is available
- infrastructure
- weather
- earthquakes
- volcanoes
- fires
- floods/hydrology
- air quality
- storms/cyclones
- source health
- location intelligence

Each real layer must have:

- toggle
- renderer
- data source
- loading state
- error state
- selected entity panel where relevant
- source freshness indicator where relevant
- no mock production path
- optimized transport for large data

If a feature exists only as static v1 UI with no real data connection, do not promote it as complete.
Either connect it to real data or move it to a clearly marked experimental/mock area.

FRONTEND PANEL AND TOGGLE RULE

Every panel and toggle in explorer-v2 must be wired.

Inspect existing explorer-v2 panels/toggles and connect them to real data.

Panels must show real selected-entity details for:

- selected aircraft
- selected airport
- selected satellite
- selected ship/vessel
- selected internet cable
- selected cable landing point
- selected infrastructure asset
- selected weather cell/layer/observation
- selected hazard
- selected earthquake
- selected volcano
- selected fire
- selected storm/cyclone
- selected hydrology point
- selected air quality point
- selected source health item

Do not leave beautiful panels showing fake static information.

Mock data may exist only in:

- frontend/src/data/mock/
- tests/fixtures/
- docs examples

Mock data must not be the default production path.

BINARY / OPTIMIZED DATA RULE

The frontend should not freeze.

For every high-volume domain, use binary, vector, tiled, aggregated, or streaming transport.

Required approach:

1. Flights / aircraft:
   - Use compact binary or MessagePack/Protobuf/FlatBuffers for live aircraft position arrays.
   - Include only fields required for rendering in live updates.
   - Fetch details separately by ID for panel.
   - Maintain smooth interpolation/trails in frontend.

2. Satellites:
   - Use compact binary or MessagePack/Protobuf/FlatBuffers for live satellite state arrays.
   - Keep TLE/catalog metadata separate from live position state.
   - Fetch selected satellite detail separately.
   - Render orbit trails efficiently.

3. Maritime:
   - Use compact binary for vessel positions if high volume.
   - Use selected vessel JSON details separately.

4. Weather/hazards:
   - Use PostGIS vector tiles/MVT where appropriate.
   - Use aggregated current views for map layers.
   - Use binary/compact payloads for dense point layers.
   - Use JSON only for small metadata/panel/detail responses.

5. Internet cables/infrastructure:
   - Do not send massive GeoJSON to frontend.
   - Use MVT, PMTiles, FlatGeobuf, or another optimized geospatial format.
   - Use PostGIS ST_AsMVT where possible.
   - Use selected feature details endpoint for panel.

6. Time series:
   - Use query windows, downsampling, aggregation, and database views.
   - Do not push entire time-series history to browser.

Document the chosen transport per domain in:

explorer-v2/docs/BINARY_TRANSPORT.md

REAL DATA FETCH PERMISSION

You are allowed to run real fetchers.
You are allowed to fetch full data from sources.
You are allowed to create raw data directories.
You are allowed to load the database.
You are allowed to create large local generated data outputs during development.

But:

- generated data should not be treated as source code
- huge generated data should not live inside src/
- secrets must not be committed
- use .gitignore for raw/generated outputs
- write metadata/manifests for fetched data
- document how to reproduce fetches

If credentials are required:

- use environment variables
- update .env.example
- do not hardcode secrets
- if credentials are missing, implement the source interface and mark it blocked only by credential availability
- continue with all other open/no-auth sources

DO NOT STOP AT SCAFFOLDING

A file existing is not enough.
A route existing is not enough.
A toggle existing is not enough.
A pipeline folder existing is not enough.

A domain is complete only when:

- source data can be fetched or source is clearly credential-blocked
- raw data is stored
- data is normalized
- data is validated
- data is loaded into database
- backend exposes it
- frontend consumes it
- globe visualizes it
- panel shows selected details
- toggle controls it
- large data is optimized
- tests/smoke checks exist
- docs explain it

RECONSTRUCTION RULE

When moving v1 capability to v2:

1. Read the v1 files.
2. Understand what the feature does.
3. Identify the useful behavior.
4. Rebuild it inside the v2 architecture.
5. Improve naming, paths, types, state management, and performance.
6. Preserve the user-facing capability.
7. Do not preserve old messy structure.
8. Do not remove useful behavior because it is inconvenient.
9. Do not downgrade a real feature into a static placeholder.

The v2 implementation may be architecturally different, but the product capability should remain the same or better.

IMPORTANT V1 FEATURES TO PRESERVE

Preserve/rebuild the important behavior from v1, including:

- cinematic flight movement
- flight tails/trails
- flight details panel
- airport reference lookup
- satellite live/orbit movement
- satellite orbital trails
- satellite details panel
- maritime layer behavior
- infrastructure layer behavior
- internet cable scene behavior
- weather layer behavior
- weather inspector behavior
- hazard rendering
- source health logic
- location intelligence
- map layer managers
- renderers
- Cesium camera/viewer behavior
- UI toggles and mode controls
- source confidence/provenance where present

Do not remove a working v1 capability unless it is truly broken, unused, or impossible to support.
If you choose not to migrate something, document exactly why in V1_FEATURE_PARITY_MATRIX.md.

FULL WEATHER DATABASE AND VISUAL LAYER ACCEPTANCE

The weather system is complete only when:

1. All v1 weather fetchers have v2 equivalents or documented credential blockers.
2. No-auth weather sources can fetch real data.
3. Auth weather sources use env vars and clear blockers if credentials are absent.
4. Raw weather files are stored with metadata.
5. Normalized weather records are produced.
6. Weather/hazard/air/hydro records load into database.
7. Database current/best views exist.
8. Backend weather/hazard routes read from database.
9. Heavy weather/hazard layers are served as vector/binary/aggregated data.
10. Frontend globe shows weather/hazard layers.
11. Frontend panels show selected weather/hazard details.
12. Source health shows weather source status.
13. Docs explain how to run full real-data weather pipeline.
14. Smoke checks prove the flow works.

SOURCE COVERAGE REQUIREMENT

Create a source inventory file:

explorer-v2/docs/SOURCE_COVERAGE.md

For every source found in v1, document:

- source name
- domain
- v1 file
- v2 fetcher
- v2 normalizer
- v2 loader
- database table/view
- backend route
- frontend layer
- panel
- status
- credential requirement
- last smoke-test result

Do not finish without this source coverage file.

PRODUCTION HARDENING REQUIREMENT

Before final answer, run checks and fix failures where possible:

- search for old explorer/server/data paths
- search for old explorer/src paths inside v2
- search for mock data used by production panels
- search for TODOs in critical path
- search for huge files under src/
- search for secrets
- search for node_modules
- run frontend typecheck/build
- run backend import/start smoke check
- run Python syntax checks
- run pipeline smoke checks
- run database migration checks if possible
- run source inventory generation/check
- verify explorer/ was not modified

Do not claim completion if these checks fail.
If a check fails due to external blocker, document the exact blocker.

FINAL ACCEPTANCE CRITERIA EXTENSION

The project is not complete until:

1. v1 has been fully inspected.
2. V1_FEATURE_PARITY_MATRIX.md exists.
3. SOURCE_COVERAGE.md exists.
4. All working v1 visual features are recreated in v2.
5. All working v1 data domains are recreated in v2.
6. Weather data sources are completed beyond samples.
7. Weather database loading is completed.
8. Weather globe visualization is completed.
9. Weather panel wiring is completed.
10. Flights are live-data wired.
11. Satellites are live-data wired.
12. Maritime is wired if v1 source works.
13. Internet cables/infrastructure are wired if v1 source/data works.
14. Airports/seaports/ports are wired where source data exists.
15. All production toggles control real connected layers.
16. All production panels show real connected data.
17. Heavy data does not freeze frontend.
18. Binary/vector/optimized delivery is implemented for high-volume layers.
19. Database migrations support all major domains.
20. Pipeline jobs fetch real data, not only samples.
21. External blockers are documented precisely.
22. explorer/ remains untouched.
23. explorer-v2 is the production-ready implementation.

FINAL RESPONSE FORMAT EXTENSION

When finished, report:

1. Whether explorer/ stayed untouched.
2. What v1 files were studied.
3. What v1 capabilities were rebuilt in v2.
4. What was redesigned instead of copied.
5. What real data sources now fetch successfully.
6. What real data sources are credential-blocked.
7. What database tables/views were added.
8. What pipeline jobs now run on real data.
9. What globe layers are now connected.
10. What panels/toggles are now connected.
11. What binary/vector formats were implemented.
12. What frontend freeze protections were added.
13. What tests/checks/builds were run.
14. What still fails, if anything.
15. Exact changed files.
16. Exact remaining blockers only if they are external.

Do not provide vague progress.
Do not stop at "created structure".
Do not stop at "added TODO".
Do not say "complete" unless the data flows from real source → database → backend → optimized frontend → globe layer → panel.

You are working inside my project:

god-eyes/explorer-v2

Use RuFlo / Claude Flow MCP tools if available.
Use swarm, agents, memory, and task tracking if available.

Your task is to make the explorer-v2 frontend actually functional.

The frontend currently has many panels, buttons, toggles, controls, timeline elements, map UI elements, globe controls, layer controls, and information panels that look good visually but are static, disconnected, mocked, or incomplete.

You must inspect the entire frontend and backend, understand what every UI element is intended to do, and wire it to real behavior, real backend data, real database-backed data, or correct Cesium/globe functionality.

IMPORTANT:

Do not only fix the examples mentioned in this prompt.
The examples are only examples.
You must inspect every frontend file and find every static/disconnected/non-working UI control yourself.

Use explorer/ version 1 as read-only reference.
Do not modify explorer/.
Only study explorer/ to understand how similar functionality worked before.
Rebuild the functionality cleanly inside explorer-v2.

Main goal:

Make the frontend panels, toggles, timeline, globe controls, layer controls, search, selected entity panels, and visualization tools actually do their jobs.

The final frontend should not just look production-ready.
It should behave production-ready.

==================================================
PROJECT RULES
==================================================

1. Work inside explorer-v2/.
2. Do not modify explorer/.
3. Do not remove useful UI unless it is truly obsolete.
4. Do not leave static controls in the production path.
5. Do not use mock data as default production behavior.
6. Mock data may remain only under:
   - frontend/src/data/mock/
   - tests/fixtures/
   - clearly marked demo/dev mode
7. If a control cannot be connected because backend/database/API is missing, implement the required backend contract or document the exact blocker.
8. Do not silently delete buttons, toggles, panels, or controls just because they are hard to wire.
9. Every visible production UI element must have one of these statuses:
   - fully functional
   - connected but blocked by external credentials/source
   - moved to experimental/dev-only area
   - removed because it is invalid/obsolete, with reason documented

==================================================
FIRST STEP: FRONTEND UI INVENTORY
==================================================

Before implementing, create:

explorer-v2/docs/FRONTEND_FUNCTIONALITY_AUDIT.md

Inspect every frontend file under:

explorer-v2/frontend/src/

Also inspect relevant backend files under:

explorer-v2/backend/src/

Also inspect v1 reference files under:

explorer/src/
explorer/server/

In FRONTEND_FUNCTIONALITY_AUDIT.md, document every visible frontend feature/control/panel/toggle, including:

- control name
- file/component where it exists
- what it appears intended to do
- current status:
  - working
  - static only
  - mock only
  - partially wired
  - broken
  - unknown
- required data source
- required backend endpoint
- required Cesium/globe behavior
- required database table/view if needed
- final implementation status

Do not finish until this audit exists.

==================================================
CORE FRONTEND FEATURES TO WIRE
==================================================

You must inspect and wire all relevant UI, including but not limited to:

1. Globe navigation controls
   - north/orientation button
   - reset view
   - zoom controls
   - camera mode controls
   - follow selected object
   - home/world view
   - pitch/tilt/bearing indicators
   - compass behavior
   - current camera position display if present

2. Timeline controls
   - bottom timeline
   - current live time indicator
   - historical playback
   - future/forecast playback where supported
   - play/pause
   - speed control
   - scrubber
   - time window selector
   - live mode toggle
   - past-data query mode
   - forecast/future-data mode for weather/satellites where supported

3. Layer toggles
   - flights
   - flight trails/tails
   - airports
   - satellites
   - satellite orbit trails
   - maritime/ships
   - ship trails if available
   - weather
   - weather radar/layers
   - hazards
   - earthquakes
   - volcanoes
   - fires
   - floods/hydrology
   - air quality
   - storms/cyclones
   - internet cables
   - cable landing points
   - infrastructure
   - seaports/ports if available
   - source health
   - location intelligence
   - search results
   - any other existing frontend toggle

4. Panels
   - selected aircraft panel
   - selected airport panel
   - selected satellite panel
   - selected vessel/ship panel
   - selected weather observation/cell panel
   - selected hazard panel
   - selected earthquake panel
   - selected volcano panel
   - selected fire panel
   - selected flood/hydrology panel
   - selected air quality panel
   - selected storm/cyclone panel
   - selected internet cable panel
   - selected cable landing point panel
   - selected infrastructure panel
   - source health panel
   - search/location panel
   - timeline/event panel
   - layer settings panel
   - any existing dashboard/card/panel in the frontend

5. Search and selection
   - search by place
   - search by aircraft/callsign
   - search by airport
   - search by satellite
   - search by ship/vessel if available
   - search by hazard/location
   - search by cable/infrastructure if available
   - clicking globe entities opens correct panel
   - selected entity highlights on globe
   - selected entity data comes from backend/detail endpoint

6. Real-time and historical data
   - live aircraft position updates
   - live satellite position updates
   - live weather/hazard current data
   - historical time queries where database supports them
   - future/forecast time queries where source supports them
   - timeline must affect visible layers
   - UI must clearly show whether user is viewing live, historical, or forecast data

7. UI state management
   - toggles should update stores/state
   - stores should update renderers/layers
   - renderers should update Cesium
   - selected entity should update panels
   - timeline state should update backend queries
   - errors should update UI
   - loading states should update UI
   - no unnecessary full React re-render loops for high-frequency data

==================================================
EXAMPLE-SPECIFIC REQUIREMENTS
==================================================

These are examples, not the full task.

Timeline example:

The bottom timeline currently appears static.
It must become functional.

It should support:

- live mode
- historical mode
- forecast/future mode where supported
- scrubber interaction
- selected time range
- play/pause
- playback speed
- current timestamp display
- backend query parameters for time-based data
- layer updates when the timeline changes

Expected behavior:

- If user scrubs to past time, supported layers query historical data.
- If user returns to live, live update polling/streaming resumes.
- If user scrubs to future and the domain supports forecast/orbit prediction, show forecast/predicted data.
- If a domain does not support past/future, show clear UI message instead of silently doing nothing.

North button example:

The N/north button currently does not correctly show or reset north orientation.
It must work.

Expected behavior:

- It should reflect current globe heading/camera orientation.
- It should rotate/update as the user moves the globe if the design requires that.
- Clicking it should reset heading to north while preserving useful camera position/zoom where possible.
- It should use Cesium camera heading/orientation, not fake static UI.
- It should be tested manually or with a smoke check.

==================================================
BACKEND CONNECTION REQUIREMENTS
==================================================

The frontend must connect to backend APIs instead of static placeholders.

Inspect existing backend routes in:

explorer-v2/backend/src/routes/
explorer-v2/backend/src/services/

Create or adjust frontend API clients under:

explorer-v2/frontend/src/core/api/

Recommended frontend API clients:

- healthApi.ts
- sourceHealthApi.ts
- flightsApi.ts
- airportsApi.ts
- satellitesApi.ts
- weatherApi.ts
- hazardsApi.ts
- maritimeApi.ts
- infrastructureApi.ts
- searchApi.ts
- timelineApi.ts
- binaryApi.ts

Do not call backend APIs directly from random components.
Use a clean API client layer.

Use JSON only for small panel/detail/config data.

For large data:

- use existing binary/vector endpoints if available
- create frontend decoders where needed
- avoid loading huge JSON into React state
- batch Cesium updates
- keep high-frequency updates outside heavy React rendering

==================================================
BINARY / VECTOR DATA FRONTEND REQUIREMENTS
==================================================

For heavy datasets, frontend must not freeze.

Implement or complete frontend support for optimized formats:

1. Flights:
   - consume binary or compact endpoint if backend provides it
   - decode into renderable aircraft state
   - update Cesium efficiently
   - fetch selected aircraft detail separately

2. Satellites:
   - consume binary or compact endpoint if backend provides it
   - update satellite positions efficiently
   - render orbit trails efficiently
   - fetch selected satellite detail separately

3. Maritime:
   - consume compact/binary vessel position data if available
   - details fetched separately

4. Weather/hazards:
   - use vector tiles, MVT, compact endpoint, or aggregated API where available
   - do not load full raw weather data into browser
   - timeline queries should request only needed windows

5. Internet cables/infrastructure:
   - use vector tiles/MVT/optimized geospatial format if available
   - do not load massive GeoJSON into frontend production path
   - selected feature detail fetched separately

Document frontend binary/vector usage in:

explorer-v2/docs/FRONTEND_DATA_WIRING.md

==================================================
CESIUM / GLOBE BEHAVIOR REQUIREMENTS
==================================================

Inspect all Cesium-related frontend files.

Likely areas include:

- frontend/src/earth/
- frontend/src/engine/
- frontend/src/features/
- frontend/src/components/

You must ensure:

- Cesium viewer initializes cleanly
- layers can be added/removed by toggles
- renderers are not duplicated
- entity IDs are stable
- selected entities can be clicked
- selected entity opens correct panel
- trails/tails update efficiently
- camera controls work
- north/orientation works
- reset/home works
- timeline updates visual data
- live mode does not conflict with historical mode
- cleanup/dispose methods prevent memory leaks
- no uncontrolled render loops

==================================================
PANEL DATA REQUIREMENTS
==================================================

Panels must show real data.

For each selected entity panel:

- fetch or receive real selected entity data
- show loading state
- show error state
- show stale/fresh timestamp
- show source/provenance where available
- show confidence where available
- show coordinates/location
- show domain-specific fields
- include useful actions:
  - zoom to entity
  - follow entity where relevant
  - show history where relevant
  - show source info where relevant

Examples of useful panel fields:

Aircraft:
- callsign
- ICAO/ID
- latitude/longitude
- altitude
- speed
- heading
- origin/destination if available
- last update
- source

Satellite:
- name
- NORAD ID if available
- altitude
- velocity if available
- orbit/source
- last update
- next pass/predicted info if available

Weather:
- source
- parameter
- value
- units
- timestamp
- location
- confidence
- forecast/historical/live status

Hazard:
- type
- severity
- location
- time
- source
- affected area if available

Cable/infrastructure:
- name
- type
- landing points
- geometry/source
- selected segment info

Do not hardcode fake values.

==================================================
TIMELINE DATA MODEL REQUIREMENTS
==================================================

Create or complete a frontend timeline state model.

It should support:

- mode: live | historical | forecast
- currentTime
- startTime
- endTime
- playbackSpeed
- isPlaying
- supportedDomains
- unsupportedDomainMessages
- per-layer time capabilities

Create or update a store such as:

frontend/src/core/store/useTimelineStore.ts

or adapt the current store if one exists.

Timeline should affect:

- flights if historical snapshots are available
- satellites using orbital prediction/future positions if available
- weather using historical/current/forecast data
- hazards using event time ranges
- maritime if historical positions exist
- source health time if available

If backend lacks time-based data, add clear frontend/backlog documentation and graceful UI.

==================================================
FEATURE PARITY WITH V1
==================================================

Use explorer/ as reference.

Inspect v1 frontend behavior and rebuild equivalent behavior in v2.

Important v1 areas to inspect:

- explorer/src/earth/
- explorer/src/engine/
- explorer/src/components/
- explorer/src/features/
- explorer/src/app/
- explorer/src/data/
- explorer/server/routes/
- explorer/server/services/

Do not copy blindly.
Rebuild cleanly.

If v1 has a working renderer, panel, layer manager, or source connection, v2 should have equivalent capability adapted to the new structure.

Update:

explorer-v2/docs/V1_FEATURE_PARITY_MATRIX.md

Add frontend-specific status for each feature:

- v1 behavior
- v2 component
- v2 API
- v2 renderer/layer
- v2 panel
- v2 toggle
- real data status
- remaining blocker

==================================================
STATIC UI ELIMINATION RULE
==================================================

Search for static/fake/disconnected patterns in frontend, including:

- hardcoded demo values
- mock arrays used by production components
- fake timeline values
- fake status counts
- fake source health
- fake selected entity details
- buttons with no onClick
- toggles that only change CSS
- controls that do not affect Cesium/backend/store
- panels not connected to state/API
- TODO/FIXME in critical UI path
- empty functions
- console-only handlers
- placeholder text
- "coming soon" production UI
- static timestamps
- static north indicator
- static layer counts
- static chart data

For each one:

- wire it for real
- move it to mock/dev mode
- or remove it with documentation

==================================================
ERROR AND LOADING STATES
==================================================

Every data-driven UI must handle:

- loading
- empty data
- API error
- stale data
- unsupported timeline mode
- missing credentials/source unavailable
- backend offline
- decoding failure for binary data

Do not let the UI silently fail.

==================================================
PERFORMANCE REQUIREMENTS
==================================================

The frontend must remain responsive.

Implement:

- requestAnimationFrame throttling where needed
- entity update batching
- stable Cesium entity IDs
- minimal React state for high-frequency position updates
- refs or external stores for high-frequency Cesium updates
- debounced search
- debounced timeline scrub queries
- cancellation/abort for outdated API requests
- cleanup of intervals, listeners, Cesium layers, and data sources
- layer-level loading instead of full app loading
- level-of-detail or clustering where appropriate

Do not freeze the browser with:

- huge JSON
- huge GeoJSON
- frequent React setState loops
- re-creating Cesium viewer
- re-creating all entities every tick
- unbounded trails
- unbounded arrays in memory

==================================================
FILES TO CREATE OR UPDATE
==================================================

Create or update documentation:

- explorer-v2/docs/FRONTEND_FUNCTIONALITY_AUDIT.md
- explorer-v2/docs/FRONTEND_DATA_WIRING.md
- explorer-v2/docs/FRONTEND_TIMELINE.md
- explorer-v2/docs/V1_FEATURE_PARITY_MATRIX.md
- explorer-v2/docs/API.md if endpoints change

Create or update frontend code as needed under:

- explorer-v2/frontend/src/core/api/
- explorer-v2/frontend/src/core/store/
- explorer-v2/frontend/src/core/types/
- explorer-v2/frontend/src/earth/
- explorer-v2/frontend/src/engine/
- explorer-v2/frontend/src/components/
- explorer-v2/frontend/src/features/
- explorer-v2/frontend/src/data/
- explorer-v2/frontend/src/utils/

Create or update backend code as needed under:

- explorer-v2/backend/src/routes/
- explorer-v2/backend/src/services/
- explorer-v2/backend/src/store/
- explorer-v2/backend/src/core/

Do not put backend/database code inside frontend.

==================================================
VALIDATION CHECKS
==================================================

Run and fix as many as possible:

- npm --prefix explorer-v2/frontend run build
- npm --prefix explorer-v2/frontend run typecheck
- npm --prefix explorer-v2/backend run start or backend smoke check
- npm --prefix explorer-v2 run test
- npm --prefix explorer-v2 run build
- search for production mock usage
- search for buttons without handlers
- search for toggles not connected to stores/layers
- search for static timeline values
- search for static selected entity panel values
- search for huge JSON loaded by frontend
- search for direct database packages in frontend
- search for old v1 paths inside v2
- verify explorer/ was not modified

If scripts are missing, add reasonable scripts to package.json.

==================================================
ACCEPTANCE CRITERIA
==================================================

This task is complete only when:

1. FRONTEND_FUNCTIONALITY_AUDIT.md exists.
2. Every visible production UI control has been audited.
3. Static controls are wired, removed, or documented as experimental.
4. Timeline works for live/historical/forecast where data supports it.
5. North/orientation control works with Cesium camera.
6. Layer toggles actually show/hide real globe layers.
7. Panels show real backend/database data.
8. Selected globe entities open correct panels.
9. Search connects to real backend/data where available.
10. Live data updates do not freeze frontend.
11. Past data can be queried where backend/database supports it.
12. Future/forecast data works where domain supports it.
13. Unsupported modes show clear UI messages.
14. Large data uses optimized transport or safe aggregation.
15. Mock data is not used as production default.
16. Frontend build/typecheck passes or exact external blocker is documented.
17. Backend endpoint gaps are fixed or documented.
18. V1 frontend behavior is preserved where it was working.
19. explorer/ remains untouched.
20. Documentation explains what was wired and how it works.

==================================================
FINAL RESPONSE FORMAT
==================================================

When done, report:

1. Whether explorer/ stayed untouched.
2. What frontend controls were audited.
3. What controls were static and are now functional.
4. What panels are now wired to real data.
5. What toggles are now wired to real layers.
6. How the timeline now works.
7. How the north/orientation control now works.
8. What backend endpoints were added or changed.
9. What binary/vector/optimized frontend data paths were added.
10. What mock/static production paths were removed.
11. What performance protections were added.
12. What tests/builds/checks were run.
13. What still fails, if anything.
14. Exact changed files.
15. Exact remaining blockers, only if external or data-source dependent.

Do not give vague progress.
Do not stop at UI cleanup.
Do not stop at documentation.
Do not claim a control is functional unless it actually affects state, backend data, Cesium, or the correct panel.
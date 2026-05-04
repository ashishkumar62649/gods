PROJECT NORTH STAR PROMPT — GOD EYES / EXPLORER-V2

You are working inside my project:

god-eyes/explorer-v2

Use RuFlo / Claude Flow MCP tools, swarm, agents, memory, browser research, and task tracking if available.

This prompt explains what we are really building.

==================================================
WHAT THIS PROJECT IS
==================================================

God Eyes is not just a map app.

It is a browser-based spatial intelligence operating system.

The goal is to turn public, open, commercial, and real-time data sources into a live, replayable, queryable model of the physical world.

Think of it as:

- a real-time 3D globe
- an OSINT fusion engine
- a spatial intelligence cockpit
- a cinematic command center
- a live and historical earth event reconstruction system
- a physical-world data browser
- a timeline-based intelligence layer over the planet

The frontend is not only supposed to display markers.
The backend is not only supposed to serve APIs.
The database is not only storage.
The pipelines are not only fetch scripts.

Together, they should create a system where the user can see what is happening on Earth, understand how different signals relate to each other, scrub backward in time, inspect entities, and eventually reason over the world.

==================================================
INSPIRATION / PRODUCT DIRECTION
==================================================

Use the Spatial Intelligence / WorldView articles as product inspiration.

The key idea is:

When aircraft, satellites, ships, weather, hazards, infrastructure, cables, airspace events, source health, and timelines are layered together on the same globe, the combined picture becomes much more powerful than each source by itself.

We are building that kind of system.

But do not blindly copy another product.
Use those articles as a north star for product feel, capability, and ambition.

The system should feel like:

- Google Earth meets OSINT
- Palantir-style spatial fusion, but browser-native
- real-time public intelligence on a 3D globe
- a replayable 4D world model
- an analyst cockpit for live Earth systems
- cinematic but functional
- beautiful but data-real
- operational but understandable

==================================================
CORE THESIS
==================================================

The project thesis is:

The physical world should become queryable, replayable, and programmable.

The system should help the user answer:

- What is happening right now?
- What changed recently?
- What was happening at this location at this time?
- What signals overlap here?
- Which aircraft, satellites, ships, weather systems, hazards, and infrastructure are near this place?
- What sources support this?
- How fresh is the data?
- What is live, historical, forecasted, or inferred?
- What is missing, and is the absence itself meaningful?

The system should not just render data.
It should fuse data into situational awareness.

==================================================
IMPORTANT ETHICAL / SAFETY BOUNDARIES
==================================================

Build this as a lawful public-data spatial intelligence platform.

Use only:
- public data
- licensed data
- user-provided data
- properly authenticated APIs
- local development credentials provided by the user

Do not build features for:
- stalking individuals
- targeting people
- evading law enforcement
- weapon guidance
- real-time attack planning
- bypassing access controls
- hacking cameras, satellites, ships, aircraft, or infrastructure
- scraping private systems without permission

If a data source is sensitive, restricted, private, or credentialed, implement the proper interface and environment-variable config, but do not hardcode secrets or bypass access.

The product should emphasize:
- transparency
- disaster response
- logistics awareness
- environmental intelligence
- infrastructure awareness
- source provenance
- confidence
- responsible public-data analysis

==================================================
CURRENT REPOSITORY CONTEXT
==================================================

The repository has:

1. explorer/
   - Version 1.
   - Read-only reference.
   - Contains older working logic for flights, satellites, maritime, internet cables, weather, hazards, pipelines, backend services, renderers, and visualization ideas.
   - Do not modify this folder.
   - Study it deeply.

2. explorer-v2/
   - Active production version.
   - This is where the real system must be built.
   - Frontend is being rebuilt with a cleaner dark operational UI.
   - Backend, database, pipelines, binary transport, panels, toggles, and real visualization must be completed here.

You must not simply copy v1.
You must understand v1 and reconstruct the working capabilities inside v2 using the new architecture.

==================================================
TARGET ARCHITECTURE
==================================================

Frontend:
- React
- TypeScript
- Vite
- Cesium
- cinematic dark operational UI
- real globe layers
- real panels
- real toggles
- real timeline
- no static production controls
- no mock data as default production behavior

Backend:
- Node.js
- Express or current backend style
- clean API routes
- database-backed services
- binary/optimized endpoints for heavy data
- JSON only for small metadata and selected-entity details

Pipelines:
- Python-first
- fetch real data
- normalize data
- validate data
- load database
- track source health
- write manifests/reports
- handle large data safely

Database:
- PostgreSQL
- PostGIS
- TimescaleDB where useful
- source registry
- source health
- current/live views
- historical snapshot tables
- geospatial indexes
- time indexes
- domain tables for every important layer

Data transport:
- JSON only for small details/config/panels
- binary or compact format for high-volume live points
- vector tiles / MVT / optimized geospatial transport for heavy geometries
- aggregated/downsampled/time-windowed queries for timeline data

==================================================
THE EXPERIENCE WE WANT
==================================================

When the user opens God Eyes, they should see a live Earth intelligence cockpit.

The globe should show real connected layers such as:

- aircraft
- flight trails
- airports
- satellites
- satellite orbit trails
- ships/maritime
- internet cables
- cable landing points
- infrastructure
- weather
- radar/weather layers where available
- earthquakes
- volcanoes
- fires
- floods/hydrology
- air quality
- storms/cyclones
- source health
- location intelligence
- search results
- timeline events

The user should be able to:

- turn layers on/off
- click entities
- open real detail panels
- search locations/entities
- follow aircraft or satellites
- scrub time backward
- view live mode
- view last 24 hours first
- later expand to 7 days and full retained history
- view forecast/future where supported
- inspect source freshness
- inspect source confidence
- understand whether data is live, historical, forecasted, or inferred

==================================================
FRONTEND PRODUCT REQUIREMENTS
==================================================

The frontend must not be only visual decoration.

Every visible production control must do its job.

Examples:
- The bottom timeline must actually control time.
- The north button must actually reflect/reset Cesium camera orientation.
- Layer toggles must actually show/hide Cesium layers.
- Panels must show real selected-entity data.
- Search must query real backend/data where possible.
- Source health cards must show real source health.
- Counts and timestamps must be real.
- Loading and error states must be real.
- Unsupported modes must clearly explain why they are unavailable.

Do not leave beautiful static UI in production.

If something cannot be connected yet:
- implement the backend contract if possible
- or document the blocker
- or move it to dev/experimental mode

==================================================
TIMELINE / 4D WORLD MODEL
==================================================

The timeline is central to the product.

The system should support:

1. Live mode
   - show latest available world state
   - poll/stream/update real data
   - show freshness

2. Historical mode
   - start with last 24 hours
   - query stored snapshots/events
   - scrub backward
   - replay events
   - show what changed

3. Forecast/future mode
   - only for domains that support prediction or forecast
   - satellites can support orbit prediction
   - weather can support forecast
   - hazards only if forecast data exists
   - unsupported domains should show clear messages

Timeline should affect the globe layers, panels, and selected entity data.

==================================================
DATA DOMAINS TO REBUILD FROM V1 INTO V2
==================================================

Study v1 deeply and rebuild all working capabilities in v2.

Required domains:

1. Flights / Aircraft
- live aircraft
- aircraft trails
- aircraft details panel
- airport lookup
- historical snapshots at throttled intervals
- binary/compact live updates
- smooth Cesium movement

2. Satellites
- TLE/catalog data
- live satellite positions
- orbit paths/trails
- selected satellite panel
- future orbit prediction
- compact/binary state delivery
- cinematic orbital visualization

3. Weather
- real source fetching
- normalization
- database loading
- current/best views
- timeline support
- weather panels
- weather globe layers
- optimized delivery for heavy layers

4. Hazards / Disasters
- earthquakes
- volcanoes
- fires
- floods/hydrology
- storms/cyclones
- severe weather alerts
- air quality
- hazard panels
- severity styling
- source provenance
- database-backed events

5. Maritime
- ships/vessels if available from v1/source
- vessel positions
- ship trails if supported
- selected vessel panel
- maritime timeline where possible

6. Internet Cables / Infrastructure
- cable geometry
- landing points
- infrastructure assets
- seaports/ports if available
- vector tile or optimized rendering
- selected feature panels

7. Source Health
- every pipeline/source should report status
- last success
- last failure
- latency
- record counts
- source freshness
- confidence/provenance
- frontend source health panel

==================================================
WEATHER SYSTEM PRIORITY
==================================================

Weather is a major part of this project.

Do not stop at sample data.

The weather system must eventually fetch real data from all usable v1 sources, normalize it, validate it, load it into the database, and visualize it on the globe.

Study v1 weather folders carefully:

- source fetchers
- normalization
- database schema
- backend routes
- weather renderer
- weather inspector
- weather panels
- source manifests

Rebuild in v2 with Python-first pipelines and database-backed backend APIs.

Weather is not complete unless:

- real data can be fetched
- raw data is stored
- normalized data is created
- database tables/views are populated
- backend reads database
- frontend renders globe layers
- panels show selected weather/hazard data
- timeline can query supported time windows
- heavy data does not freeze the browser

==================================================
REAL DATA RULE
==================================================

Use real data, not only samples.

You may run real fetchers.
You may fetch large datasets.
You may create raw/processed/normalized outputs.
You may load the database.

But:
- do not put huge generated files in src/
- do not commit secrets
- do not use mock data as production default
- use .gitignore for generated outputs
- document how to reproduce data fetches
- use streaming/chunking/batching where needed
- use database COPY/bulk inserts where needed

If credentials are required:
- use environment variables
- update .env.example
- document the key requirement
- mark the source as credential-blocked
- continue with other no-key or available sources

==================================================
BINARY / OPTIMIZED TRANSPORT REQUIREMENT
==================================================

The frontend must not freeze.

For large/high-frequency data:

- do not send massive JSON blobs
- do not send huge GeoJSON to the browser
- do not store high-frequency live data directly in React state
- do not recreate thousands of Cesium entities every tick

Use:

- compact binary arrays
- MessagePack / Protobuf / FlatBuffers if appropriate
- vector tiles / MVT for geospatial layers
- PostGIS ST_AsMVT where useful
- downsampled timeline queries
- selected-entity detail endpoints
- batched Cesium updates
- stable entity IDs
- interpolation for cinematic movement

==================================================
VISUAL LANGUAGE
==================================================

Keep v2’s current dark operational UI direction.

Do not copy v1’s exact visual layout.

Use v1 for:
- behavior
- data logic
- renderer concepts
- panels/options that were useful
- layer ideas
- source wiring ideas

Use v2 for:
- cleaner visual system
- modern cockpit layout
- cinematic globe experience
- production-grade UX
- better structure
- better state management
- better performance

The UI should feel:
- dark
- precise
- cinematic
- operational
- analyst-grade
- readable
- high-density only where useful
- not cluttered
- not toy-like

==================================================
ANALYST LAYER / INTELLIGENCE FUSION
==================================================

The project should eventually move beyond raw visualization.

Where possible, build the foundation for intelligence fusion:

- source provenance
- confidence scoring
- event correlation
- geospatial joins
- time-window joins
- anomaly detection
- absence detection
- movement changes
- airspace clearing
- GPS degradation if data exists
- ship/aircraft route changes
- hazard proximity to infrastructure
- satellite pass over selected area
- weather impact around routes/assets

Do not fabricate intelligence.

Only infer when supported by data, and label it as inferred.

==================================================
DOCUMENTATION REQUIREMENTS
==================================================

Create or update:

- docs/PROJECT_NORTH_STAR.md
- docs/V1_FEATURE_PARITY_MATRIX.md
- docs/SOURCE_COVERAGE.md
- docs/FRONTEND_FUNCTIONALITY_AUDIT.md
- docs/FRONTEND_DATA_WIRING.md
- docs/BINARY_TRANSPORT.md
- docs/DATA_PIPELINES.md
- docs/API.md
- docs/DATABASE_SCHEMA.md
- docs/MIGRATION_FROM_V1.md

These docs should explain:

- what the project is
- what v1 had
- what v2 now has
- what sources exist
- what is real-data wired
- what is database-backed
- what is visualized
- what is panel-wired
- what is timeline-supported
- what uses binary/vector transport
- what remains blocked
- how to run everything

==================================================
CODING BEHAVIOR
==================================================

Do not stop at scaffolding.

Do not just create folders.
Do not just create empty routes.
Do not just create pretty UI.
Do not just write TODOs.
Do not mark a domain done if it is not connected end-to-end.

A domain is done only when the flow works:

source / fetcher
→ raw data
→ normalized data
→ validation
→ database
→ backend route
→ optimized frontend delivery
→ Cesium globe layer
→ selected entity panel
→ toggle/control
→ docs
→ smoke check

==================================================
VALIDATION
==================================================

Run checks and fix failures where possible:

- frontend build
- frontend typecheck
- backend smoke check
- backend route import check
- Python syntax checks
- pipeline smoke checks
- database migration check if available
- search for old broken v1 paths in v2
- search for mock production usage
- search for static controls
- search for secrets
- search for node_modules in active project
- search for huge files under src
- verify explorer/ was not modified

Do not claim production-ready unless checks pass.

==================================================
FINAL SUCCESS DEFINITION
==================================================

The project is moving in the right direction when:

- explorer/ remains read-only
- explorer-v2 becomes the real product
- v1 working capabilities are rebuilt cleanly
- frontend controls actually work
- backend serves real data
- pipelines fetch real data
- database stores real domains
- high-volume data is optimized
- globe layers are real
- panels are real
- timeline is real
- source health is real
- documentation is clear
- the system feels like a live spatial intelligence cockpit, not a static demo

The final product should make the user feel:

“I am looking at a living model of the world, not a map.”
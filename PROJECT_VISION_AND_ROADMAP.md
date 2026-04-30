# God Eyes: Project Vision and Roadmap

This document captures the original vision for God Eyes in a clean reference format.
Read this when you feel lost and need to remember what the project is becoming, why
it matters, and what to build next.

## 1. North Star

God Eyes is not meant to copy one existing website. The goal is to build an
open-source intelligence fusion platform: a common operating picture built from
public data.

The platform should answer:

- What is happening on Earth right now?
- What changed recently?
- What matters?
- Why does it matter?
- How do we know?
- What should we watch next?

The intelligence is not just the data. The intelligence comes from joining
different sources together by place, time, entity, confidence, and context.

Example:

```text
A cyclone is forecast near a coast
+ nearby ports
+ dense AIS ship traffic
+ airports in the storm path
+ high population exposure
+ recent evacuation news
= risk alert
```

That is the type of Palantir-like behavior God Eyes can build with open data:
not private surveillance, but public-interest intelligence from traceable sources.

## 2. Core Data Pipeline

The long-term system should follow this pipeline:

```text
Open data sources
  -> ingestion workers
  -> cleaning and normalization
  -> geo/time/entity database
  -> analytics and anomaly detection
  -> map layers, alerts, and investigation panels
```

Important rule:

```text
Frontend = visualization
Backend = intelligence
Database = memory
Source registry = trust
```

The frontend should not become the brain. The backend should join data, calculate
risk, detect anomalies, and produce clean intelligence products.

## 3. Current Practical Direction

Based on the current repo, do not start by adding 20 new datasets at once.
God Eyes already has a live Cesium globe, terrain, imagery, search, buildings,
flight feed, aircraft selection, camera modes, airport grid, transit overlays,
weather engine, maritime data, satellite data, and emergency squawk handling.

The next best step is to turn the existing app into a clean intelligence foundation.

Immediate priority order:

1. Finish the aviation intelligence UI.
2. Add a source health dashboard using `/api/health`.
3. Fix and verify weather UI wiring.
4. Performance-test the live layers.
5. Add a first `/api/intel/location` prototype.
6. Add USGS earthquakes.
7. Add NASA FIRMS fires.
8. Add GDELT events/news.
9. Add risk scoring.
10. Add watch zones.

## 4. Existing Repo Foundation

The current project already contains the beginning of the platform:

- Cesium 3D globe
- Base imagery picker
- Search and camera controls
- OSM buildings
- Live aircraft rendering
- Aircraft identity enrichment
- Military/LADD/PIA/emergency-related aircraft flags
- Emergency squawk tripwire
- Flight trails and camera focus
- Airport grid layers
- Maritime layers
- Satellite layers
- Transit overlays
- Weather/climate backend
- OpenWeatherMap to RainViewer fallback chain
- `/api/health` server status endpoint
- Graphify architecture report

This means the project should not reset. It should harden what already exists,
then add intelligence products step by step.

## 5. Open Data Source Map

### 5.1 Base Map, Geography, Borders, Roads, Buildings

| Source | Use |
| --- | --- |
| OpenStreetMap | Roads, buildings, railways, ports, airports, POIs, power lines, hospitals, schools |
| Natural Earth | Countries, coastlines, admin boundaries, rivers, populated places |
| Geofabrik OSM extracts | Country and region OSM downloads |
| Wikidata | Entity graph: countries, cities, organizations, people, facilities, aliases, identifiers |

Use in God Eyes:

- Base globe
- Search
- Entity lookup
- Relation graph
- "What is this place?" panel
- Roads, buildings, railways, airports, ports, hospitals, energy infrastructure

### 5.2 Weather, Climate, Satellite, Radar

| Source | Use |
| --- | --- |
| Open-Meteo | Current weather, forecast, temperature, humidity, wind, pressure |
| OpenWeatherMap | Global weather tile overlays |
| NOAA GFS | Global forecast model |
| DWD ICON | High-quality forecast model layers |
| NASA GIBS | Satellite imagery layers |
| NOAA GOES | Near-real-time satellite over the Americas |
| Himawari | Asia-Pacific satellite |
| Meteosat | Europe, Africa, Indian Ocean satellite |
| RainViewer | Easy radar overlay |
| NOAA MRMS / NEXRAD | Serious radar and precipitation analysis, mostly U.S. |

Use in God Eyes:

- Storms
- Flood risk
- Cloud cover
- Aviation weather
- Ship routing risk
- Wildfire conditions
- Current weather at clicked locations

### 5.3 Fires, Disasters, Earthquakes, Hazards

| Source | Use |
| --- | --- |
| NASA FIRMS | Near-real-time active fires from MODIS/VIIRS |
| USGS Earthquake API | Real-time earthquakes in GeoJSON |
| FEMA OpenFEMA | U.S. disaster declarations and emergency datasets |
| PreventionWeb | Global disaster-risk datasets |
| GDACS | Global disaster alerts |
| Copernicus EMS | Emergency mapping, flood/fire/disaster products |

Use in God Eyes:

- Emergency map
- Fire alerts
- Earthquake impact zones
- Infrastructure-at-risk scoring

### 5.4 Aviation Intelligence

| Source | Use |
| --- | --- |
| airplanes.live / ADS-B feeds | Live aircraft positions |
| OpenSky Network | ADS-B, Mode-S, ADS-C, FLARM, VHF air traffic data |
| OurAirports | Airports, runways, countries, regions |
| FAA / DOT / BTS | U.S. aviation, airport, delay, safety, transportation datasets |
| ICAO/IATA public metadata | Airport and airline reference data, license varies |

Use in God Eyes:

- Live aircraft
- Airport intelligence
- Flight disruption detection
- Aircraft behavior anomalies
- Weather-risk overlays
- Emergency squawk alerts

Example:

```text
Flight path crosses severe storm
+ altitude change
+ diversion toward alternate airport
= possible weather diversion
```

### 5.5 Maritime, Ships, Ports, Fishing

| Source | Use |
| --- | --- |
| Global Fishing Watch | Fishing activity, vessel presence, AIS-derived datasets |
| MarineCadastre AIS | U.S. AIS vessel traffic |
| NOAA marine data | Coastal and ocean planning layers |
| OpenStreetMap | Ports, docks, terminals, ferry routes |
| UN / World Bank port and trade data | Strategic trade context |

Use in God Eyes:

- Vessels
- Port congestion
- Fishing activity
- Dark-fleet hints
- Sanctions-risk research
- Disaster impact on shipping

Important: AIS can be spoofed or switched off, so treat it as a signal, not truth.

### 5.6 Public Transit, Roads, Rail, Mobility

| Source | Use |
| --- | --- |
| Mobility Database | Global GTFS, GTFS-Realtime, GBFS feeds |
| GTFS feeds | Transit routes, stops, schedules, realtime vehicle positions |
| OpenRailwayMap | Railway infrastructure from OSM |
| OpenStreetMap | Roads, bridges, tunnels, railways |
| Data.Transportation.gov | U.S. rail, roads, bridges, pipelines, aviation, transit, maritime |

Use in God Eyes:

- Transit overlays
- Evacuation route analysis
- Infrastructure dependency
- Station and rail disruptions

### 5.7 Energy, Power, Fuel, Electricity

| Source | Use |
| --- | --- |
| EIA Open Data | Energy production, consumption, prices, electricity, petroleum, gas |
| OpenInfraMap / OSM | Power lines, substations, pipelines, telecom towers |
| ENTSO-E Transparency Platform | European electricity generation, load, transmission |
| NESO Data Portal | Great Britain electricity system data |
| Open Charge Map | EV charging locations |
| NREL / OpenEI | Energy resources and datasets |

Use in God Eyes:

- Power-grid visualization
- Energy market dashboard
- Outage risk from storms/fires
- Fuel-price intelligence

### 5.8 Population, Humanitarian, Health, Vulnerability

| Source | Use |
| --- | --- |
| WorldPop | High-resolution gridded population |
| HDX / Humanitarian Data Exchange | Crisis data, admin boundaries, health, displacement, food security |
| UN OCHA CODs | Common operational datasets for humanitarian response |
| WHO data | Health indicators |
| World Bank indicators | Poverty, development, infrastructure, health, economy |
| Meta Data for Good | Population movement and disaster maps, availability varies |

Use in God Eyes:

- Impact estimation
- Disaster exposure
- People-affected calculations
- Vulnerability scoring

### 5.9 Conflict, Protests, News, Narratives

| Source | Use |
| --- | --- |
| GDELT | Global news events, tone, themes, entities, locations |
| ACLED | Political violence and protest events |
| UCDP | Conflict event data |
| ReliefWeb | Humanitarian reports |
| Wikipedia Current Events | Structured event monitoring |
| News RSS feeds | Local context and verification |

Use in God Eyes:

- Event layer
- Protest/conflict monitoring
- Entity extraction
- "What changed in this region?" summaries

Important: never treat news/event feeds as confirmed truth. Score them by source
reliability, confidence, and corroboration.

### 5.10 Economy, Trade, Supply Chain

| Source | Use |
| --- | --- |
| World Bank Open Data | Development, infrastructure, trade, economy |
| IMF Data API | GDP, inflation, unemployment, balance of payments, fiscal indicators |
| UN Comtrade | Global import/export trade data |
| OECD Data | Country-level economic/social indicators |
| FAOSTAT | Food and agriculture production/trade |
| EIA | Energy markets |
| PortWatch / World Bank | Maritime trade disruption indicators, where available |

Use in God Eyes:

- Country risk
- Supply-chain maps
- Commodity exposure
- Port disruption impact

### 5.11 Land, Agriculture, Environment

| Source | Use |
| --- | --- |
| Copernicus Land Monitoring Service | Land cover, vegetation, water cycle, ground motion |
| Sentinel / Copernicus Open Access | Satellite imagery |
| Landsat / USGS | Long-term satellite imagery |
| MODIS / VIIRS | Vegetation, fires, night lights, atmosphere |
| FAO / FAOSTAT | Agriculture |
| NASA Earthdata | Earth science datasets |

Use in God Eyes:

- Crop stress
- Drought
- Land-cover change
- Floodplain analysis
- Environmental risk

## 6. Core Intelligence Modules

### 6.1 Geo Entity Engine

Everything important should become an entity:

- Aircraft
- Ship
- Airport
- Port
- Power plant
- Substation
- Hospital
- Bridge
- City
- Storm
- Earthquake
- Fire
- News event
- Conflict event

Each entity should eventually contain:

- `id`
- `name`
- `aliases`
- `type`
- `lat/lon/geometry`
- `time`
- `source`
- `confidence`
- `relationships`
- `last_updated`

### 6.2 Event Fusion

Turn raw feeds into events:

- `weather_alert`
- `fire_detected`
- `earthquake_detected`
- `flight_diversion`
- `ship_slowdown`
- `port_congestion`
- `conflict_event`
- `protest_event`
- `power_risk`
- `flood_risk`

### 6.3 Risk Scoring

For each region or asset:

```text
risk = hazard x exposure x vulnerability x confidence
```

Example:

```text
Wildfire near power line
+ high wind gusts
+ nearby population
+ dry vegetation
= elevated infrastructure and public safety risk
```

### 6.4 Anomaly Detection

Look for unusual behavior:

- Aircraft emergency squawk
- Aircraft sudden descent
- Aircraft route diversion
- Ship stops outside port
- Ship turns off AIS near restricted area
- Port traffic drops suddenly
- News mentions explosion near infrastructure
- Fire appears near airport or power station
- Earthquake near dam or nuclear plant

### 6.5 Investigation Panel

When a user clicks a place, show:

- What is here?
- What is happening now?
- What changed recently?
- What assets are nearby?
- What risks affect this location?
- Which sources agree?
- Which sources disagree?

This panel is where the project becomes powerful.

## 7. Backend Intelligence Products

Build a data product, not just an app. The backend should produce reusable
intelligence outputs that the UI consumes.

Recommended future endpoints:

- `/api/intel/global-situation`
- `/api/intel/region-summary?bbox=...`
- `/api/intel/asset-risk?id=...`
- `/api/intel/event-timeline?id=...`
- `/api/intel/watch-zone-alerts?id=...`
- `/api/intel/source-health`
- `/api/intel/anomalies`
- `/api/intel/location?lat=...&lon=...`

Example response shape:

```json
{
  "summary": "Moderate weather disruption risk near Kolkata.",
  "severity": "medium",
  "confidence": 0.72,
  "time_window": "next_24h",
  "evidence": [
    { "source": "Open-Meteo", "signal": "heavy rain forecast" },
    { "source": "OpenSky", "signal": "high aircraft density nearby" },
    { "source": "OurAirports", "signal": "major airport within 30 km" }
  ],
  "recommended_watch": [
    "Track precipitation movement",
    "Monitor flight diversions",
    "Check airport delay signals"
  ]
}
```

## 8. Suggested Long-Term Server Architecture

The future backend could evolve toward:

```text
explorer/server/intel/
  sources/
    aviation/
      opensky.ts
      ourairports.ts
    maritime/
      globalFishingWatch.ts
      marineCadastre.ts
    weather/
      openMeteo.ts
      gfs.ts
      icon.ts
      rainviewer.ts
      nasaGibs.ts
    hazards/
      firms.ts
      usgsEarthquakes.ts
      fema.ts
    geo/
      osm.ts
      naturalEarth.ts
      wikidata.ts
    news/
      gdelt.ts
      acled.ts
      reliefweb.ts
    population/
      worldpop.ts
      hdx.ts
    economy/
      worldbank.ts
      imf.ts
      uncomtrade.ts

  normalize/
    normalizeAircraft.ts
    normalizeShip.ts
    normalizePlace.ts
    normalizeEvent.ts
    normalizeWeather.ts

  fusion/
    entityResolution.ts
    geoJoin.ts
    timeJoin.ts
    confidenceScore.ts
    relationshipBuilder.ts

  analytics/
    riskScoring.ts
    anomalyDetection.ts
    impactEstimator.ts
    routeRisk.ts
    assetExposure.ts

  api/
    layers.ts
    entities.ts
    events.ts
    alerts.ts
    search.ts
    timeline.ts
```

Do not build all of this now. This is a direction map.

## 9. Future Database Stack

When the project outgrows memory maps and flat files:

| Component | Purpose |
| --- | --- |
| PostgreSQL + PostGIS | Geospatial entities and events |
| TimescaleDB | Time-series telemetry and weather |
| Redis | Live cache and short TTL data |
| DuckDB | Local analytics on CSV, Parquet, and large files |
| MinIO / S3 | Raw GRIB, GeoTIFF, CSV, Parquet storage |
| Meilisearch / Typesense | Fast search |
| Neo4j or RDF store | Optional relationship graph |

## 10. Frontend Product Shape

The frontend should become:

- Cesium globe
- Live layers
- Timeline scrubber
- Entity inspector
- Risk heatmaps
- Event feed
- Source confidence badges
- Watch zones
- Investigation workspace

Signature feature:

```text
Explain this place
```

When clicked, it should generate:

- Current situation
- Recent changes
- Nearby assets
- Active hazards
- Source confidence
- What to watch next

## 11. Build Roadmap

### Version 1: World Viewer

Goal: make the globe stable and beautiful.

- Base map
- Search
- Camera controls
- Layer toggles
- Click location inspector
- Basic source badges

### Version 2: Live Public Data

Goal: show real-time Earth activity.

- Weather current/forecast
- Radar
- Flights
- Earthquakes
- Fires
- Airports
- Population estimate
- Recent news/events

### Version 3: Fusion Engine

Goal: connect data together.

- Nearby assets
- Nearby hazards
- Source confidence
- Event timelines
- Risk scores
- "What is happening here?" panel

### Version 4: Alerts and Watch Zones

Goal: make it proactive.

- Custom regions
- Alert rules
- 24-hour change detection
- Source health dashboard
- Anomaly detection
- Notification feed

### Version 5: Investigation Workspace

Goal: make it feel like an intelligence tool.

- Intel notebook
- Saved investigations
- Evidence cards
- Relationship graph
- Scenario simulation
- AI summaries with citations

## 12. First 30-Day Target

Build one killer flow:

```text
Click anywhere on Earth
  -> show weather
  -> nearby flights
  -> nearby airports
  -> nearby fires
  -> nearby earthquakes
  -> nearby population
  -> latest news
  -> risk score
  -> evidence list
```

This single flow proves the whole concept.

## 13. Next 7-Day Execution Plan

Focus only on this for the next week:

| Day | Target |
| --- | --- |
| 1-2 | FlightDetailsPanel badges and better aircraft intelligence card |
| 3 | `/api/health` UI dashboard |
| 4 | Weather layer verification |
| 5 | FPS and performance testing |
| 6-7 | `/api/intel/location` prototype |

The best immediate move is to finish the aviation intelligence UI first.
The backend already has much of the data; the frontend needs to expose it
beautifully and reliably.

## 14. Aviation Intelligence UI Plan

Update the aircraft details experience to show:

- `is_military`
- `is_ladd`
- `is_pia`
- `owner_operator`
- `registration`
- `aircraft_type`
- `squawk`
- `source`
- `last_seen`
- `confidence`

Add badges:

- `MILITARY`
- `LADD`
- `PIA`
- `EMERGENCY`
- `ESTIMATED`
- `UNKNOWN OWNER`

Turn aircraft selection into an intelligence card:

- Aircraft identity
- Current position
- Speed, heading, altitude
- Owner/operator
- Military, privacy, emergency flags
- Nearest airport
- Weather around aircraft
- Route if known
- Risk/anomaly notes
- Source and last updated

## 15. Weather Verification Plan

Before adding GFS, ICON, NOAA, or extra satellite datasets, verify the current
weather stack.

First weather goal:

- Radar layer works
- Cloud layer works
- Temperature layer works
- Wind layer works
- Pressure layer works
- UI shows active weather source
- Fallback source is visible

Current intended source chain:

1. OpenWeatherMap if `OWM_API_KEY` is configured and validated.
2. RainViewer if OWM is unavailable.
3. Previous persisted climate state if refresh fails.
4. Error only if no usable source exists.

## 16. Performance Test Plan

Before adding more layers, test:

- Flights ON at global zoom
- Flights ON + airports ON
- Flights ON + weather ON
- Flights ON + transit ON
- Selected aircraft tracking for 5 minutes
- Memory usage after 15 minutes
- FPS at global zoom and city zoom

If FPS drops below 30, add:

- Zoom-based thinning
- Viewport filtering
- Clustering
- Entity pooling
- Reduced update frequency for far objects

## 17. First New Intelligence Sources

After the existing layers are stable, add these first:

1. USGS earthquakes
2. NASA FIRMS fires
3. GDELT events/news

Why these first:

- They are event-based.
- They are easy to display on a map.
- They are immediately useful.
- They support the first real location intelligence flow.

Possible early routes:

- `/api/events/earthquakes`
- `/api/events/fires`
- `/api/events/news`
- `/api/intel/location?lat=...&lon=...`

## 18. High-Value Intelligence Combinations

### Disaster Intelligence

```text
NASA FIRMS
+ Open-Meteo wind
+ WorldPop population
+ OSM roads/hospitals
+ GDELT local news
= wildfire impact map
```

### Aviation Intelligence

```text
OpenSky / ADS-B
+ OurAirports
+ weather radar
+ GFS/ICON wind
+ GDELT airport news
= flight disruption intelligence
```

### Maritime Intelligence

```text
Global Fishing Watch
+ weather/ocean
+ OSM ports
+ UN Comtrade
+ news
= shipping and trade risk map
```

### Conflict and Humanitarian Intelligence

```text
ACLED
+ GDELT
+ HDX
+ WorldPop
+ OSM hospitals/roads
= humanitarian risk dashboard
```

### Infrastructure Risk

```text
OSM power lines/substations
+ EIA energy context
+ weather hazards
+ fires/earthquakes
+ population
= critical infrastructure exposure map
```

## 19. Intel Notebook

Add an investigation notebook later.

User saves:

```text
Observation: Cyclone risk near Bay of Bengal
Evidence: weather forecast + satellite + population layer
Notes: possible risk to Kolkata and Chittagong ports
Status: watching
```

System later updates:

```text
New update: precipitation forecast intensified
New affected assets: 2 airports, 4 ports, 18M people in exposure zone
Confidence changed: 0.64 -> 0.78
```

This turns God Eyes from a viewer into an investigation workspace.

## 20. Provenance and Trust

Every object should have a provenance trail:

```text
Raw source
  -> normalized record
  -> fused entity/event
  -> alert
  -> UI card
```

Example:

```text
NASA FIRMS fire point
  -> normalized as hazard_event
  -> joined with OSM power line
  -> generated infrastructure_risk_alert
  -> displayed on map
```

Every dataset should track:

- `source_name`
- `source_url`
- `license`
- `attribution_required`
- `commercial_allowed`
- `update_frequency`
- `confidence`

## 21. Unknown, Stale, and Degraded States

A serious intelligence system must admit when data is weak.

Show statuses like:

- Live
- Delayed
- Stale
- Partial coverage
- No data
- Conflicting sources
- Low confidence

This is especially important for:

- Radar
- AIS
- ADS-B
- Satellite
- Conflict/news data

## 22. Simulation Mode

Later, add simple scenario simulation:

- What if this storm moves 100 km west?
- What if this port closes?
- What if this airport is unavailable?
- What if wind gusts exceed 80 km/h?

Start with geometry intersections:

```text
hazard polygon intersects assets + population grid = estimated exposure
```

## 23. Source Plugin Model

Design every future data source as a plugin:

```ts
interface SourcePlugin {
  id: string;
  category: string;
  fetch(): Promise<RawRecord[]>;
  normalize(raw: RawRecord[]): Promise<NormalizedRecord[]>;
  schedule: string;
  license: string;
}
```

This keeps source expansion controlled and avoids hardcoding every feed into the
main server.

## 24. Legal and Ethical Guardrails

Build God Eyes as a public-interest open-data intelligence system, not a
surveillance tool.

Good uses:

- Disaster response
- Weather risk
- Transport disruption
- Infrastructure exposure
- Humanitarian awareness
- Environmental monitoring
- Supply-chain risk
- Research

Avoid:

- Tracking private individuals
- Doxxing
- Targeting people
- Weaponizing location data
- Bypassing access controls
- Scraping restricted systems
- Claiming certainty from weak signals

Every claim should be traceable to source data, and weak signals should be marked
with confidence, uncertainty, and provenance.

## 25. Recommended Starting Source Stack

Start with this exact source list:

- OpenStreetMap
- Natural Earth
- Wikidata
- OpenSky / ADS-B feeds
- OurAirports
- Open-Meteo
- OpenWeatherMap
- RainViewer
- NASA FIRMS
- USGS Earthquakes
- GDELT
- WorldPop
- HDX
- Global Fishing Watch
- Mobility Database / GTFS
- EIA Open Data
- World Bank
- UN Comtrade
- IMF Data
- Copernicus Land
- NASA GIBS

The magic is not having one perfect dataset. The magic is:

- Same place
- Same time
- Same entity
- Multiple independent sources
- Confidence scoring
- Pattern detection
- Clear visualization

## 26. Memory Anchor

When you feel lost, remember this:

God Eyes starts as a beautiful live Earth viewer, but it becomes powerful when
the backend connects open data into evidence-backed intelligence products.

Do not chase every dataset immediately. Build one strong loop at a time:

```text
collect -> normalize -> join -> score -> explain -> visualize
```

The next concrete project step should usually be the smallest thing that makes
the app more trustworthy, more explainable, or more useful to an investigator.

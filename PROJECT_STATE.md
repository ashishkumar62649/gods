# God Eyes Explorer - Project State

## 1. Project Goal

Build a Cesium-based 3D Earth explorer with:
- smooth globe navigation
- place search
- imagery switching
- 3D buildings
- landmark orbiting
- live intelligence layers: flights, ships, weather/climate, transit
- later: satellites, events, visual modes, premium cinematic polish

Current product direction:
- control-first now
- cinematic/premium polish in layers
- no Google Photorealistic 3D Tiles yet
- 3D-only for now; 2D mode was intentionally removed

---

## 2. Main Project Path

Project root:
- `E:\ashis\god eyes`

Frontend source:
- `E:\ashis\god eyes\explorer\src\earth\viewer\Viewer.tsx`
- `E:\ashis\god eyes\explorer\src\earth\viewer\useFlightData.ts`
- `E:\ashis\god eyes\explorer\src\earth\viewer\useClimateData.ts`
- `E:\ashis\god eyes\explorer\src\earth\viewer\useWeatherScene.ts`
- `E:\ashis\god eyes\explorer\src\earth\viewer\useMetroScene.ts`
- `E:\ashis\god eyes\explorer\src\earth\viewer\useRailwayScene.ts`
- `E:\ashis\god eyes\explorer\src\earth\viewer\useMaritimeData.ts`
- `E:\ashis\god eyes\explorer\src\earth\viewer\LayerSidebar.tsx`
- `E:\ashis\god eyes\explorer\src\earth\viewer\DevStatusPanel.tsx`
- `E:\ashis\god eyes\explorer\src\earth\viewer\cameraUtils.ts`
- `E:\ashis\god eyes\explorer\src\earth\viewer\viewerConfig.ts`
- `E:\ashis\god eyes\explorer\src\earth\viewer\viewerTypes.ts`
- `E:\ashis\god eyes\explorer\src\earth\viewer\imageryOptions.ts`
- `E:\ashis\god eyes\explorer\src\earth\flights\flights.ts`
- `E:\ashis\god eyes\explorer\src\earth\flights\flightLayers.ts`
- `E:\ashis\god eyes\explorer\src\earth\flights\flightVisuals.ts`
- `E:\ashis\god eyes\explorer\src\earth\flights\ui\FlightDetailsPanel.tsx`
- `E:\ashis\god eyes\explorer\src\earth\flights\ui\FlightDeckHud.tsx`
- `E:\ashis\god eyes\explorer\src\earth\weather\weather.ts`
- `E:\ashis\god eyes\explorer\src\earth\weather\WeatherLayerManager.ts`
- `E:\ashis\god eyes\explorer\src\earth\maritime\maritime.ts`
- `E:\ashis\god eyes\explorer\src\earth\metro\MetroLayerManager.ts`
- `E:\ashis\god eyes\explorer\src\earth\rail\RailwayLayerManager.ts`
- `E:\ashis\god eyes\explorer\src\earth\rail\TransitImageryLayerManager.ts`

Backend (modular, in `explorer/server/`):
- `E:\ashis\god eyes\explorer\server\index.mjs`                        ← entry point
- `E:\ashis\god eyes\explorer\server\config\constants.mjs`             ← all config (incl. OWM_API_KEY)
- `E:\ashis\god eyes\explorer\server\store\flightCache.mjs`            ← in-memory store
- `E:\ashis\god eyes\explorer\server\services\normalizer.mjs`          ← schema transform
- `E:\ashis\god eyes\explorer\server\services\fetchers.mjs`            ← position fetcher
- `E:\ashis\god eyes\explorer\server\services\intelFetcher.mjs`        ← intelligence layer
- `E:\ashis\god eyes\explorer\server\services\gfwService.mjs`          ← Global Fishing Watch (ships)
- `E:\ashis\god eyes\explorer\server\services\shipFetcher.mjs`         ← ship data fetcher
- `E:\ashis\god eyes\explorer\server\services\ClimateEngine.mjs`       ← weather/climate SSOT engine
- `E:\ashis\god eyes\explorer\server\routes\climate.mjs`               ← /api/climate/state route
- `E:\ashis\god eyes\explorer\server\models\ClimateState.mjs`          ← SSOT read/write
- `E:\ashis\god eyes\explorer\server\data\climate-state.json`          ← persisted climate state

Config / env:
- `E:\ashis\god eyes\explorer\.env`
- `E:\ashis\god eyes\explorer\.env.example`
- `E:\ashis\god eyes\explorer\vite.config.ts`
- `E:\ashis\god eyes\explorer\package.json`

Project state file:
- `E:\ashis\god eyes\PROJECT_STATE.md`

---

## 3. Current Architecture

### Frontend

The frontend is centered around `Viewer.tsx`.

It currently owns:
- Cesium viewer creation
- terrain setup
- imagery setup (via `imageryOptions.ts`)
- search/geocoder logic
- zoom tuning
- buildings loading and visibility
- orbit logic
- flight layer lifecycle (via `FlightSceneLayerManager`)
- weather/climate layer lifecycle (via `WeatherLayerManager` + `useWeatherScene`)
- metro/railway transit layer lifecycle (via `useMetroScene`, `useRailwayScene`)
- maritime data polling (via `useMaritimeData`)
- HUD/sidebar state
- developer status panel

Scene/layer hook decomposition (each hook manages one layer):
- `useFlightData.ts` — polling & flight state
- `useClimateData.ts` — weather polling against `/api/climate/state` (every 60s)
- `useWeatherScene.ts` — `WeatherLayerManager` lifecycle in the Cesium viewer
- `useMetroScene.ts` — `MetroLayerManager` lifecycle
- `useRailwayScene.ts` — `RailwayLayerManager` lifecycle
- `useMaritimeData.ts` — ship feed polling

### Backend — Multi-Layer Intelligence Engine

#### Aviation (Layer 1 + Layer 2)

**Layer 1 — Position Feed (every 5 seconds)**
- Source: `https://globe.airplanes.live/data/aircraft.json.gz`
- Static GZIP CDN snapshot (~9,000–10,000 aircraft globally)
- Decompressed using a magic-byte check (0x1f 0x8b = GZIP header)
- Records stamped with LOCAL ingest time (not CDN `data.now` which is stale)
- All records normalized to `GodsEyeFlight` schema via `normalizeReadsb()`
- Stored in `flightCache` (Map<icao_hex, GodsEyeFlight>)

**Layer 2 — Intelligence Feed (every 10 seconds)**
- Source: `https://api.adsb.lol`
- Categorical endpoints polled concurrently via `Promise.allSettled`:
  - `/v2/mil`      → Military aircraft (265 records typically)
  - `/v2/pia`      → Privacy ICAO addresses (6 records)
  - `/v2/ladd`     → LADD-filtered / VIP / corporate jets (348+ records)
  - `/v2/sqk/7700` → Global emergency squawk monitor
- Stored in `rawIntelStore` (Map<icao_hex, IntelRecord>) — NOT normalized
- Merged at query time via `mergeIntel(flight)` in `/api/flights`

**Expansion Port (optional)**
- `CUSTOM_API_URL` + `CUSTOM_API_KEY` in `.env` activates a third source
- Silently no-ops if not configured

#### Climate / Weather Engine

A dedicated backend climate service that acts as the single source of truth (SSOT) for weather tile URLs delivered to the frontend.

**Primary source — OpenWeatherMap (OWM)**
- Requires `OWM_API_KEY` in `.env`
- Tiles served as `https://tile.openweathermap.org/map/{layer}/{z}/{x}/{y}.png?appid=...`
- Layers: `precipitation_new`, `temp_new`, `clouds_new`, `wind_new`, `pressure_new`
- Validated by probing a sample tile before committing

**Fallback source — RainViewer**
- Used when OWM key is missing, returns 401/429/500, or network fails
- Fetches `https://api.rainviewer.com/public/weather-maps.json` for latest radar frame
- Covers precipitation only; remaining layers fall back to `cesium-native://` (Cesium built-in)

**Refresh loop**
- Every 10 minutes (`CLIMATE_REFRESH_INTERVAL_MS`)
- State is persisted to `server/data/climate-state.json` via `ClimateState.mjs`
- On failure: previous persisted SSOT is served (no outage)

**API**
- `GET /api/climate/state` → returns latest `ClimateStateSnapshot`
- Frontend polls this every 60s via `useClimateData`

#### Maritime (Ships)

- `gfwService.mjs` — Global Fishing Watch integration
- `shipFetcher.mjs` — ship position fetcher
- `useMaritimeData.ts` — frontend React hook for polling ship data

#### Transit Overlays

Camera-altitude-gated imagery overlays using `TransitImageryLayerManager` base class:

| Manager | Overlay Kind | Max Altitude |
|---|---|---|
| `RailwayLayerManager` | `railway` | 8,000 km |
| `MetroLayerManager` | `metro` | 300 km |

---

## 4. GodsEyeFlight Schema

The canonical data schema used throughout frontend and backend:

```typescript
interface FlightRecord {
  // Identity
  id_icao: string;
  callsign: string | null;
  registration: string | null;
  aircraft_type: string | null;
  description: string | null;
  owner_operator: string | null;
  country_origin: string | null;

  // Telemetry
  latitude: number;
  longitude: number;
  altitude_baro_m: number;
  altitude_geom_m: number | null;
  velocity_mps: number | null;
  heading_true_deg: number | null;
  heading_mag_deg: number | null;
  vertical_rate_mps: number | null;
  on_ground: boolean;

  // Avionics
  squawk: string | null;
  nav_target_alt_m: number | null;
  nav_target_heading: number | null;
  emergency_status: string | null;

  // Intelligence flags
  is_military: boolean;
  is_interesting: boolean;
  is_pia: boolean;
  is_ladd: boolean;
  is_estimated: boolean;

  // System
  data_source: string;
  timestamp: number;
}
```

**Frontend field mapping (from old schema):**

| Old field             | New field           |
|-----------------------|---------------------|
| `id`                  | `id_icao`           |
| `altitudeMeters`      | `altitude_baro_m`   |
| `speedMetersPerSecond`| `velocity_mps`      |
| `headingDegrees`      | `heading_true_deg`  |
| `originCountry`       | `country_origin`    |

---

## 5. Climate State Snapshot Schema

```typescript
interface ClimateStateSnapshot {
  timestamp: string;          // ISO 8601
  activeSource: 'OWM' | 'FALLBACK';
  precipitationUrl: string;   // XYZ tile URL or cesium-native://
  temperatureUrl: string;
  cloudsUrl: string;
  windUrl: string;
  pressureUrl: string;
}
```

Weather layer IDs: `precipitation`, `temperature`, `clouds`, `wind`, `pressure`

---

## 6. Backend API Contract

### `GET /api/flights`

```json
{
  "flights": [ ...GodsEyeFlight[] ],
  "meta": {
    "count": 9014,
    "timestamp": 1745000000000,
    "lastSweepAt": "2026-04-24T...",
    "lastOpenSkyCount": 0,
    "lastDarkFleetCount": 9014,
    "lastDarkFleetSource": "airplanes.live CDN",
    "intelRecords": 619,
    "intelMil": 265,
    "intelPia": 6,
    "intelLadd": 348,
    "intelEmerg": 0,
    "intelSweepAt": "2026-04-24T..."
  }
}
```

### `GET /api/climate/state`

```json
{
  "timestamp": "2026-04-24T...",
  "activeSource": "OWM",
  "precipitationUrl": "https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png?appid=...",
  "temperatureUrl": "...",
  "cloudsUrl": "...",
  "windUrl": "...",
  "pressureUrl": "..."
}
```

### `GET /api/health`

Returns uptime, sweep count, store size, active source, intel stats, climate engine stats.

### Available lazy-lookup helpers (not polled, called on-demand)

- `fetchByHex(hex)` → `/v2/hex/{hex}`
- `fetchByRegistration(reg)` → `/v2/registration/{reg}`
- `fetchByCallsign(call)` → `/v2/callsign/{call}`
- `fetchAirportInfo(icao)` → `/api/0/airport/{icao}`
- `fetchRouteSet(callsign)` → `/api/0/routeset`

---

## 7. Current UI Structure

### Left Sidebar

Top-level sections:
- `Base`
- `Intel`
- `Visual`
- `System`

### Base Section

Implemented:
- `Imagery` (via `imageryOptions.ts`)
- `Buildings`
- `Orbit`

Placeholder:
- `Boundaries`
- `Labels`

### Intel Section

Implemented:
- `Flights` (with live count and source label)
- `Flight Feed` status card
- `Aviation Grid` (Airports: Major, Regional, Local, etc.)
- `SIGINT Infrastructure` (HFDL, Comms stations)
- `Ships` (maritime layer via GFW)
- `Weather / Climate` layers (precipitation, temperature, clouds, wind, pressure)
- `Transit` overlays (Railway, Metro)

Placeholder:
- `Satellites`
- `Events`
- `Airspace`
- `Interference`

### HUD Elements

- Search bar (top-left)
- Left-bottom quick actions
- Custom home button
- Dev status panel
- Right-side flight details panel
- Cockpit HUD (altitude, speed, heading, callsign, route)

---

## 8. Stable Working Systems

These are currently stable — treat carefully:

- terrain is working correctly
- mountains render in 3D
- OSM buildings ground correctly on terrain
- buildings default to OFF
- buildings toggle repaint bug is fixed
- search generally works (including Tokyo exact-area override)
- zoom system is good
- orbit no longer rotates the whole globe
- stop-on-interaction works
- imagery picker works from Base section (via `imageryOptions.ts`)
- 2D mode has been removed cleanly
- flight feed loads and updates
- flights no longer disappear on a single missed snapshot
- flight dots/icons render on the globe
- selecting a flight opens the right-side detail panel
- Focus / Track / Chase / Cockpit modes working
- selected-flight camera preserves user's view angle
- flight icon heading no longer rotates with camera
- 60fps smooth dead-reckoning via Error Vector Decay
- dynamic aviation grid (airports) with categorized visibility
- oceanic coasting: `is_estimated: true` flights render at 40% opacity
- null/NaN position guard prevents Cesium RangeError crash
- Climate Engine boots with OWM → RainViewer fallback chain
- Weather tiles served via `/api/climate/state` (refreshed every 10 min)
- Transit imagery layers (Railway, Metro) with camera-altitude gating

Important rules:
- do not casually change zoom, terrain, or buildings unless there is a clear bug
- do not change the field names in GodsEyeFlight schema without updating ALL consumers
- do not break the ClimateEngine fallback chain (OWM → RainViewer → error)

---

## 9. Important Implemented Logic

### Flight Schema Migration (Completed)

All frontend files have been migrated from the legacy single-source schema to the `GodsEyeFlight` multi-source schema:
- `flights.ts` — FlightRecord interface + fetchFlightSnapshot envelope
- `flightLayers.ts` — all rendering references updated
- `flightVisuals.ts` — all visual helper references updated
- `FlightDetailsPanel.tsx` — UI updated
- `FlightDeckHud.tsx` — field names updated
- `cameraUtils.ts` — heading field updated
- `Viewer.tsx` — id_icao used everywhere

### Backend Timestamp Fix (Critical)

The CDN's `data.now` field is a cached server-side timestamp that can be 60–120 seconds old. The stale-flight purge uses `STALE_FLIGHT_TIMEOUT_MS = 30s`. If feed timestamps were used, ALL flights would be immediately purged as stale.

**Fix:** Local ingest time (`Date.now() / 1000`) is always stamped onto every record in `fetchPrimaryRadar()`, overriding any feed timestamp.

### Intelligence Merge (Query-Time)

`mergeIntel(flight)` in `intelFetcher.mjs` is called per-flight at serve time, enriching with:
- `is_military`, `is_pia`, `is_ladd`, `is_emergency`, `intel_source`
- Null-fill for `callsign`, `registration`, `aircraft_type`, `description`, `owner_operator`

It returns a new object — the original `flightStore` record is never mutated.

### Null/NaN Guard (Cesium Crash Prevention)

The `syncFlights` loop, `buildFlightApiCartesian`, and `updateTargetApiPosition` all use `Number.isFinite()` checks. Any flight with null/NaN lat-lon is skipped before reaching Cesium primitives.

### Error Vector Decay Kinematics

Custom 60fps motion algorithm:
1. Dead-reckoning projects next position from heading + speed
2. On new API snapshot, gap between rendered and truth is stored as correction vector
3. Correction vector decays to zero over ~1s while dead-reckoning continues from truth
4. Result: smooth glide into new trajectory with zero backwards jumps

### Climate Engine — Source Priority Chain

1. **OWM**: Validated by probing tile 0/0/0. If key is present and tile returns 200 → use OWM.
2. **Fallback (RainViewer)**: Used on OWM 401 (no key), 429 (rate limit), 500, or network error.
3. **Error**: If both fail, previous persisted SSOT in `climate-state.json` is served.
4. Frontend polls `/api/climate/state` every 60s and applies returned XYZ tile URLs to `WeatherLayerManager`.

### Transit Imagery — Camera Altitude Gating

`TransitImageryLayerManager` base class hides/shows the Cesium imagery layer based on camera altitude:
- Railway: visible from ground level up to 8,000 km
- Metro: visible from ground level up to 300 km (city-scale only)

---

## 10. Known Bugs / Open Issues

1. **Military/LADD badges not yet shown in UI** — backend flags `is_military`, `is_ladd` are populated and sent to frontend but `FlightDetailsPanel` has not been updated to display them as visual badges yet.

2. **Flight occlusion fix needs user retest** — opposite-side flights should no longer draw through Earth (fix was applied) but user has not confirmed.

3. **`sourceLabel` in sidebar** — currently shows `"Fused · N flights"` or `"OpenSky · N flights"`. Still only OpenSky-style label since dark fleet = intel layer, not a second position source.

4. **Flight performance and density not fully tuned** — 9,000+ flights rendered globally. Clustering, regional thinning not implemented.

5. **Custom API Expansion Port untested** — skeleton is in place; no real custom API has been connected.

6. **OWM key not yet tested end-to-end** — `OWM_API_KEY` must be set in `.env`. If missing, ClimateEngine silently falls back to RainViewer (precipitation only).

---

## 11. Immediate Next Steps

### Priority 1 — UI Enrichment
- Update `FlightDetailsPanel.tsx` to show `is_military`, `is_ladd`, `is_pia`, `owner_operator`, `registration` badges from the new schema fields
- These are already arriving in the frontend data — just need UI to display them

### Priority 2 — Weather UI Wiring
- Confirm weather toggles in `LayerSidebar.tsx` properly drive `weatherToggles` state into `useWeatherScene`
- Test OWM tile overlay live on globe (set `OWM_API_KEY` in `.env`)

### Priority 3 — Verify Rendering
- Live test: toggle Flights ON and confirm 9,000+ dots appear on globe
- Confirm military aircraft (`is_military: true`) are visually distinct from civilian
- Test Railway and Metro overlays at appropriate zoom levels

### Priority 4 — Performance
- Monitor FPS at global zoom with 9,000+ flights
- Implement regional thinning if frame rate drops below 30fps

### Later
- Satellites layer
- Visual modes (Night Vision, Thermal, CRT, Cinematic)
- System monitoring panels
- Selected-flight 3D aircraft model

---

## 12. Local Run / Verification Workflow

```bash
# Terminal 1 — Backend (port 8788)
cd "E:\ashis\god eyes\explorer"
npm run dev:flights

# Terminal 2 — Frontend (port 5174)
cd "E:\ashis\god eyes\explorer"
npm run dev
```

Expected boot log for backend:
```
🛰️  GOD'S EYE — Multi-Layer Radar Online
   Port    : 8788
   Layer 1 : airplanes.live CDN  (every 5s)
   Layer 2 : adsb.lol intel feed (every 10s)

[Primary Radar] ✓ 9,014 targets ingested
[Sweep #1] Store: 9,014 flights | Ingested: 9,014 | Intel: 0 records
[Intel] Intelligence loop started (every 10s)
[Intel #1] Store: 619 records | MIL: 265 | PIA: 6 | LADD: 348 | EMERG: 0
[Climate] Initial refresh complete — activeSource: OWM
```

---

## 13. Build Status

- `npm run build` in `E:\ashis\god eyes\explorer` passes with zero TypeScript errors
- Vite bundle: ~399 kB gzipped JS, 49 kB CSS
- All modules transform cleanly
- Last successful commit: `095cc83` — "Update project files, ignore large data exports"
- 26 files changed in last commit, 1570 insertions

---

## 14. Key Files Reference

| File | Purpose |
|------|---------|
| `server/index.mjs` | Server entry, HTTP routes, boot sequence |
| `server/config/constants.mjs` | PORT, intervals, feed URLs, OWM_API_KEY |
| `server/store/flightCache.mjs` | In-memory Map, upsertFlight, removeStaleFlights |
| `server/services/normalizer.mjs` | normalizeReadsb, normalizeOpenSky, normalizeCustomApi |
| `server/services/fetchers.mjs` | fetchPrimaryRadar (GZIP CDN), fetchCustomRadar |
| `server/services/intelFetcher.mjs` | startIntelLoop, mergeIntel, rawIntelStore, lazy lookups |
| `server/services/gfwService.mjs` | Global Fishing Watch ship data integration |
| `server/services/shipFetcher.mjs` | Ship position fetcher |
| `server/services/ClimateEngine.mjs` | OWM→RainViewer fallback, 10-min refresh loop, SSOT |
| `server/routes/climate.mjs` | GET /api/climate/state handler |
| `server/models/ClimateState.mjs` | readLatestClimateState / writeLatestClimateState |
| `server/data/climate-state.json` | Persisted climate SSOT |
| `src/earth/flights/flights.ts` | FlightRecord interface, fetchFlightSnapshot |
| `src/earth/flights/flightLayers.ts` | FlightSceneLayerManager, syncFlights, tickPositions |
| `src/earth/flights/flightVisuals.ts` | Icon resolution, altitude colors, oceanic coasting |
| `src/earth/viewer/useFlightData.ts` | React hook, polling, FlightFeedState |
| `src/earth/viewer/useClimateData.ts` | React hook, weather polling every 60s |
| `src/earth/viewer/useWeatherScene.ts` | WeatherLayerManager lifecycle in Cesium viewer |
| `src/earth/viewer/useMetroScene.ts` | MetroLayerManager lifecycle |
| `src/earth/viewer/useRailwayScene.ts` | RailwayLayerManager lifecycle |
| `src/earth/weather/weather.ts` | ClimateStateSnapshot types, fetch helpers |
| `src/earth/weather/WeatherLayerManager.ts` | Cesium imagery layer management for weather |
| `src/earth/metro/MetroLayerManager.ts` | Metro transit overlay (max 300km altitude) |
| `src/earth/rail/RailwayLayerManager.ts` | Railway overlay (max 8,000km altitude) |
| `src/earth/rail/TransitImageryLayerManager.ts` | Base class for altitude-gated transit overlays |
| `src/earth/maritime/maritime.ts` | Maritime/ship data types and fetch |
| `src/earth/viewer/Viewer.tsx` | Cesium globe, all layer orchestration |
| `src/earth/viewer/cameraUtils.ts` | Focus/Track/Chase/Cockpit camera logic |
| `src/earth/viewer/imageryOptions.ts` | Imagery provider definitions |
| `explorer/.env` | CUSTOM_API_URL, CUSTOM_API_KEY, OWM_API_KEY (optional) |

---

## 15. Project Knowledge Graph

This project uses `graphify` for maintaining a knowledge graph of the codebase.
The output is located in `graphify-out/`.
- Always consult `graphify-out/GRAPH_REPORT.md` for architecture and codebase questions.
- Navigate `graphify-out/wiki/index.md` if it exists instead of reading raw files.
- Run `graphify update .` after modifying code files in any session to keep the graph current.

Last graphify run: **2026-04-24** — 105 files · 3473 nodes · 10707 edges · 67 communities

---

## 16. Recommended New Chat Orientation (2 sentences)

God's Eye is a Cesium 3D globe with a fully modular multi-layer intelligence backend: aviation (airplanes.live CDN every 5s + adsb.lol intel every 10s merged into `GodsEyeFlight` schema with 60fps Error Vector Decay kinematics), a Climate Engine (OWM→RainViewer fallback, 10-min SSOT refresh, served at `/api/climate/state`), maritime ship tracking (GFW), and camera-altitude-gated transit overlays (Railway ≤8,000km, Metro ≤300km). Immediate next tasks: display `is_military`/`is_ladd`/`owner_operator` badges in `FlightDetailsPanel`, verify weather tile wiring with a live OWM key, and confirm Railway/Metro overlays render at correct zoom levels.

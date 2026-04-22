# God Eyes Explorer - Project State

## 1. Project Goal

Build a Cesium-based 3D Earth explorer with:
- smooth globe navigation
- place search
- imagery switching
- 3D buildings
- landmark orbiting
- live intelligence layers, starting with flights
- later: satellites, ships, events, visual modes, premium cinematic polish

Current product direction:
- control-first now
- cinematic/premium polish in layers
- no Google Photorealistic 3D Tiles yet
- 3D-only for now; 2D mode was intentionally removed

## 2. Main Project Path

Project root:
- `E:\ashis\god eyes`

Main application files:
- `E:\ashis\god eyes\explorer\src\earth\Viewer.tsx`
- `E:\ashis\god eyes\explorer\src\earth\SearchBox.tsx`
- `E:\ashis\god eyes\explorer\src\earth\FlightDetailsPanel.tsx`
- `E:\ashis\god eyes\explorer\src\earth\flights.ts`
- `E:\ashis\god eyes\explorer\src\app.css`

Flight proxy / backend:
- `E:\ashis\god eyes\explorer\server\flights-proxy.mjs`

Config / env:
- `E:\ashis\god eyes\explorer\.env`
- `E:\ashis\god eyes\explorer\.env.example`
- `E:\ashis\god eyes\explorer\vite.config.ts`
- `E:\ashis\god eyes\explorer\package.json`

This project state file:
- `E:\ashis\god eyes\PROJECT_STATE.md`

## 3. Current Architecture

### Frontend

The frontend is still centered around `Viewer.tsx`.

It currently owns:
- Cesium viewer creation
- terrain setup
- imagery setup
- search/geocoder logic
- zoom tuning
- buildings loading and visibility
- orbit logic
- flight layer lifecycle and rendering
- HUD/sidebar state
- developer status panel

Support components / helpers now exist:
- `SearchBox.tsx`
- `FlightDetailsPanel.tsx`
- `flights.ts`

### Backend

There is now a lightweight local flight proxy:
- `server/flights-proxy.mjs`

It currently handles:
- local HTTP server for `/api/flights`
- OpenSky OAuth client-credentials token flow
- anonymous OpenSky fallback when credentials are absent
- in-memory snapshot caching
- in-memory rolling flight store for feed stabilization
- normalization of OpenSky state vectors into internal flight records
- short retention for recently-missing flights
- last-good-live-snapshot reuse on transient OpenSky failures
- mock fallback only when no live snapshot is available yet

This is a local development backend, not a deployed production service yet.

## 4. Current UI Structure

### Left Sidebar

The main left glass sidebar is now the primary control surface.

Top-level sections:
- `Base`
- `Intel`
- `Visual`
- `System`

### Base Section

Current implemented controls:
- `Imagery`
- `Buildings`
- `Orbit`

Current placeholder controls:
- `Boundaries`
- `Labels`

### Intel Section

Current implemented controls:
- `Flights`
- `Flight Feed` status card

Current placeholder controls:
- `Satellites`
- `Ships`
- `Events`
- `Airspace`
- `Interference`

### Other HUD Elements

Current implemented HUD:
- search bar at top-left outside sidebar
- left-bottom quick actions
- custom home button
- dev status trigger/panel
- right-side selected flight details panel
- selected-flight `Focus` and `Track` actions in the flight panel

## 5. Stable Working Systems

These are currently considered working and should be treated carefully:

- terrain is working correctly
- mountains render in 3D
- OSM buildings ground correctly on terrain
- buildings default to `OFF`
- buildings toggle repaint bug is fixed
- search generally works
- zoom system is good and user had previously approved it
- orbit no longer rotates the whole globe
- stop-on-interaction works
- imagery picker works from the Base section
- 2D mode has been removed cleanly
- flight feed loads and updates
- flights no longer disappear immediately on a single missed snapshot
- flight dots/icons are rendering on the globe
- selecting a flight opens the right-side detail panel
- selected-flight `Focus` / `Track` controls are working
- selected-flight camera now preserves the user's current view angle
- flight icon heading no longer rotates with camera movement

Important rule:
- do not casually change zoom, terrain, or buildings setup unless there is a clear bug

## 6. Important Implemented Logic

### Terrain

Current terrain setup in `Viewer.tsx`:
- `const WORLD_TERRAIN = Terrain.fromWorldTerrain();`
- passed into `<ResiumViewer terrain={WORLD_TERRAIN} />`

This solved the old floating/sinking buildings problem.

### Buildings

Buildings load with:
- `createOsmBuildingsAsync({ showOutline: false })`

Important settings in place:
- `preloadWhenHidden = true`
- `preloadFlightDestinations = true`
- `preferLeaves = true`
- `maximumScreenSpaceError = 8`
- `foveatedScreenSpaceError = false`

Buildings visibility is controlled by:
- manual toggle
- auto-buildings mode for landmark experience
- altitude gate: `BUILDINGS_ALTITUDE_THRESHOLD = 300_000`

### Zoom

Zoom is altitude-aware and should still be left alone unless there is a real bug.

Current altitude tiers:
- under `15_000 m`: very fine
- `15_000 m` to `500_000 m`: balanced
- above `500_000 m`: faster global movement

### Orbit

Current orbit implementation:
- target-centered
- uses `camera.lookAt(target, new HeadingPitchRange(...))`
- RAF-based loop
- FPS-independent speed using `dt`

Important orbit refs/state:
- `orbitTargetRef`
- `orbitLandmarkHeightRef`
- `orbitRangeRef`
- `orbitSessionIdRef`
- `pendingAutoOrbitRevRef`

Current orbit behavior:
- manual orbit uses fresh screen-center pick
- landmark orbit refines target after landing
- stop-on-interaction cancels orbit and temporary landmark experience

### Search

Search uses:
- `IonGeocoderService`

The app does not blindly trust `results[0]`.
It uses custom ranking in `flyToPlace()`.

Important ranking behavior:
- supports the `state of ...` to `strait of ...` query variant
- broad query detection for country/state/sea/strait etc.
- penalizes islands for plain place searches
- penalizes water-feature names for plain place searches
- biases against point results for plain place queries
- favors compact rectangle results for plain place queries
- exact non-water rectangle override is present for city-like searches such as `Tokyo`

This exact-area override is important and should be preserved.

### Flights

The flight system is now partially implemented.

Frontend behavior:
- `Flights` toggle in `Intel`
- polling-based refresh
- zoom-based rendering:
  - far out: dots
  - closer in: plane icons
- click-to-select
- selected flight label
- right-side detail panel
- selected-flight `Focus`
- selected-flight `Track`
- selected-flight `Chase` (camera follows strictly behind)
- selected-flight `Cockpit` (camera rides on plane, 360° free-look, includes data HUD)
- de-emphasis of non-selected flights

Current flight data flow:
- frontend fetches `/api/flights`
- proxy fetches OpenSky `/states/all`
- proxy normalizes raw state vectors into internal records
- proxy keeps recently-missing flights alive for a short grace window
- proxy reuses the last good live snapshot on transient feed failure
- frontend drives smooth 60fps motion via `viewer.scene.preRender` and direct primitive mutation (bypassing React)
- frontend uses **Error Vector Decay** kinematics to smoothly absorb incoming delayed API positions without backwards jumping.
- route arcs are generated dynamically as geodesic parabolas anchored to the aircraft's live position.
- flights are rendered using highly performant `PointPrimitiveCollection`, `BillboardCollection`, and `PolylineCollection`

Internal flight record shape currently supports:
- `id`
- `callsign`
- `latitude`
- `longitude`
- `altitudeMeters`
- `headingDegrees`
- `speedMetersPerSecond`
- `timestamp`
- optional current field: `originCountry`

Current rendering states:
- `dot`
- `icon`
- `selected highlight`

`selected 3D model` is intentionally not implemented yet.

## 7. Current User-Verified Status

### User-verified working

Confirmed by the user in this chat:
- flight toggle works
- exact number of flights is showing
- flight feed updates in real time
- dots are visible
- icons are visible when zooming in
- selected flight panel appears
- selected-flight `Focus` / `Track` works
- selected-flight `Chase` mode keeps camera fixed behind the plane
- selected-flight `Cockpit` mode lets the user freely look 360° while the plane moves
- flight motion is smooth at 60fps using dead reckoning prediction
- selected-flight camera no longer forces a default tilt
- flight icon heading no longer changes incorrectly when the camera rotates

### Previously user-verified working systems

- terrain is stable
- buildings grounding is fixed
- buildings toggle is working
- search is working, including Tokyo fix
- zoom is good
- orbit is functional
- stop-on-interaction works
- imagery panel is working

## 8. Latest Implemented Fixes

### Flight occlusion fix

Problem observed:
- flights on the far side of the globe were still visible through Earth

Fix applied:
- removed the force-always-visible depth override from flight points/billboards/labels

Expected result:
- opposite-side flights should no longer show through the globe

### Icon direction fix

Problem observed:
- the plane icon was not clearly reading as "moving in this direction"

Fix applied:
- replaced the temporary symmetric icon with a more directional aircraft silhouette
- adjusted billboard rotation to use negative heading
- locked icon heading to globe-up so camera rotation no longer fakes aircraft turning

Expected result:
- icon direction should read naturally and stay tied to the actual flight heading

Note:
- a small visual nose-angle offset tweak may still be wanted later

### Flight color polish

Problem observed:
- normal flight colors were too washed out / not premium enough
- selected flight yellow did not fit the product direction

Fix applied:
- normal flights: brighter premium ice-cyan
- dimmed flights: softer low-opacity cyan
- selected flight: mint/tech accent instead of yellow

### Selected-flight box cleanup

Problem observed:
- Cesium's default selection UI created an unwanted rectangle/top strip feel
- selected state did not feel premium

Fix applied:
- `selectionIndicator={false}`
- `infoBox={false}`
- custom bracket-style selected flight marker
- clearer label background

Expected result:
- default Cesium green box / default info UI should no longer appear

### Tracking, Chase, and Cockpit Modes

New capability added:
- selected flights now have a one-shot `Focus` camera action
- selected flights now have a `Track` toggle for a live follow view
- the unstable drone mode was split into two dedicated views:
  - `Chase` mode: camera stays locked exactly behind the aircraft.
  - `Cockpit` mode: camera rides exactly on the aircraft coordinate. Includes an immersive top-center HUD (Altitude, Speed, Heading, Callsign, Route) and allows 360-degree free-look via drag.

Behavior:
- tracking stops cleanly on deselect
- tracking stops when flights are turned off
- tracking stops on manual non-HUD interaction (except dragging during Cockpit mode, which controls the look angle)
- home/search/orbit actions cancel tracking before taking over the camera
- focus/track preserves the user's current camera angle instead of forcing a default chase tilt

### 60 FPS Error Vector Decay Kinematics

New capability added:
- primitive mutation loop attached to `viewer.scene.preRender`
- planes no longer jump/teleport across the globe every 15 seconds
- replaced simple lerp with true Error Vector Decay logic so dead-reckoning never backtracks.

Behavior:
- every frame, calculates elapsed time since last server update
- projects new Cartesian3 coordinate using heading, speed, and haversine logic
- absorbs API jumps into a correction vector that smoothly decays to zero.
- assigns position directly to Cesium `Point` and `Billboard` primitives
- completely bypasses React `useState` for 60fps performance without vDOM thrashing

### Flight-feed stabilization and full valid-flight return

New backend behavior added:
- removed the old `MAX_RETURNED_FLIGHTS = 1800` cap
- backend now keeps recently-missing flights alive briefly instead of dropping them immediately
- backend now keeps the last good live snapshot if OpenSky has a transient failure

Expected result:
- fewer abrupt disappearances between polls
- valid live flights are no longer artificially capped at 1800 by the proxy

### Flight Trails, Parabolic Arcs & Unified Lifecycle

New capability added:
- Flight trails (historical path drawing) are now fully implemented.
- `updateSelectedTrailGluePoint` gracefully connects historical trace data to the live predicted flight position.
- Replaced static origin-to-destination route splines with Dynamic Parabolic Future-Path Arcs that anchor to the plane's live nose and curve to the destination.
- Unified Trail and Arc lifecycle: enabling the Route Arc will force the historical trail to render even if the Trail button is off, ensuring a complete past-to-future path.
- Compilation errors and trace API mismatches have been resolved.
- Flight details UI appropriately handles camera mode tracking states.

## 9. Known Bugs / Open Issues

### Bugs still active or still awaiting retest

1. **Flight occlusion fix needs user retest**
- Code has been patched so opposite-side flights should no longer draw through Earth
- user has not yet confirmed the new behavior after the fix

2. **Selected-flight visual polish may still need another pass**
- The default Cesium selection UI has been disabled and replaced with a custom selected marker
- this treatment may still want one more premium polish pass

3. **Arctic / polar base-imagery seam is visible in screenshots**
- this appears to be imagery-provider behavior, not flight-layer logic
- not currently treated as a flight bug
- may need later map-style/provider evaluation if the user cares about polar views

4. **Flight performance and density are not fully tuned yet**
- hard backend flight cap was removed
- clustering, regional thinning, and more advanced density management are not implemented yet
- full valid-flight return may need stronger far-zoom simplification if globe performance drops

5. **Flight motion is visually predicted, not operationally exact**
- current movement is short-horizon client-side prediction between sparse OpenSky updates
- it looks more alive, but it is not "perfect real-time truth"

## 10. Work Left

### Flight work left

Immediate next steps:
- verify the latest occlusion / selected-marker polish with the user
- tune icon rotation offset if needed
- tune colors if the user still wants a different palette

Short-term flight improvements:
- performance tuning for full-world all-flight rendering
- richer feed-health messaging
- stronger thinning / performance policy for global density

Later flight phases:
- metadata enrichment for selected flights only
- optional origin/destination provider
- provider-agnostic adapter expansion
- selected-flight 3D aircraft model
- later: aircraft class / exact aircraft-type mapping

### Other product work left

Still not implemented:
- satellites
- ships
- events
- airspace
- interference
- visual modes beyond placeholders
- system monitoring panels beyond placeholders
- cinematic/premium final polish pass across the whole UI

## 11. Local Run / Verification Workflow

To run locally:

In terminal 1:
- `cd "E:\ashis\god eyes\explorer"`
- `npm run dev:flights`

In terminal 2:
- `cd "E:\ashis\god eyes\explorer"`
- `npm run dev`

Expected local services:
- Vite app: `http://localhost:5174`
- flight proxy: `http://localhost:8788`

## 12. OpenSky Status

OpenSky is now integrated in local development.

Current local auth behavior:
- OAuth client credentials are supported in `.env`
- anonymous mode also works when credentials are missing
- mock fallback exists only when no cached live snapshot is available yet

Important security note:
- credentials live in local `.env`
- do **not** commit secrets into source control
- if credentials were shared broadly, rotating them later is a good idea

## 13. Verification Notes

Latest verified technical status in this chat:
- `npm run build` in `E:\ashis\god eyes\explorer` passed after the selected-flight camera patch
- `npm run build` in `E:\ashis\god eyes\explorer` passed again after the flight-feed stabilization / no-cap proxy patch
- local flight proxy successfully returned:
  - `source: opensky`
  - `authMode: oauth`
  - real live flight data

Last major user-observed state before the latest polish / stabilization pass:
- flights were visible and updating
- dots/icons were rendering
- selected flight panel was showing
- user reported visual issues with:
  - opposite-side flights visible through globe
  - icon direction feel
  - color palette
  - selected-flight box style
  - forced camera tilt during selected-flight focus/track
  - planes disappearing too abruptly between snapshots

Those issues were patched in code; camera behavior was then user-confirmed as good, while occlusion / selection styling still remain worth retesting.

## 14. Key Files

- `E:\ashis\god eyes\explorer\src\earth\Viewer.tsx`
- `E:\ashis\god eyes\explorer\src\earth\SearchBox.tsx`
- `E:\ashis\god eyes\explorer\src\earth\FlightDetailsPanel.tsx`
- `E:\ashis\god eyes\explorer\src\earth\flights.ts`
- `E:\ashis\god eyes\explorer\src\app.css`
- `E:\ashis\god eyes\explorer\server\flights-proxy.mjs`
- `E:\ashis\god eyes\explorer\.env`
- `E:\ashis\god eyes\PROJECT_STATE.md`

## 15. Recommended Next Chat Starting Point

If a new chat needs a short orientation, use this:

The explorer is now a 3D-only Cesium globe with working terrain, imagery switching, buildings, search, orbit, and a first live flight layer. Flights come from a local OpenSky-backed proxy, rendering as dots/icons through highly performant primitives, rather than generic entities. Flights feature 60fps smooth dead-reckoning motion. They support selection with a right-side detail panel, include `Focus`, `Track`, `Chase`, and an immersive `Cockpit` mode with a custom HUD and 360° free-look. The last active work involved building out the smooth motion loops and interactive tracking views. Next steps involve optional trail/path generation, richer feed-health messaging, and global scaling polish.

## 16. Project Knowledge Graph

This project uses `graphify` for maintaining a knowledge graph of the codebase.
The output is located in `graphify-out/`.
- Always consult `graphify-out/GRAPH_REPORT.md` for architecture and codebase questions.
- Navigate `graphify-out/wiki/index.md` if it exists instead of reading raw files.
- Run `graphify update .` after modifying code files in any session to keep the graph current.



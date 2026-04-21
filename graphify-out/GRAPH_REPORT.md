# Graph Report - .  (2026-04-21)

## Corpus Check
- Corpus is ~42,309 words - fits in a single context window. You may not need a graph.

## Summary
- 99 nodes · 147 edges · 20 communities detected
- Extraction: 90% EXTRACTED · 10% INFERRED · 0% AMBIGUOUS · INFERRED: 14 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Flight Scene Visuals|Flight Scene Visuals]]
- [[_COMMUNITY_Flight UI & Formatting|Flight UI & Formatting]]
- [[_COMMUNITY_Viewer Core Navigation|Viewer Core Navigation]]
- [[_COMMUNITY_Flight Proxy Server|Flight Proxy Server]]
- [[_COMMUNITY_Proxy Airport Data|Proxy Airport Data]]
- [[_COMMUNITY_Flight Path Interactivity|Flight Path Interactivity]]
- [[_COMMUNITY_Proxy OpenSky Feed|Proxy OpenSky Feed]]
- [[_COMMUNITY_Old Globe Camera|Old Globe Camera]]
- [[_COMMUNITY_Proxy Data Normalization|Proxy Data Normalization]]
- [[_COMMUNITY_App Entry|App Entry]]
- [[_COMMUNITY_Old Globe Lights|Old Globe Lights]]
- [[_COMMUNITY_Old Globe Scene|Old Globe Scene]]
- [[_COMMUNITY_Vite Configuration|Vite Configuration]]
- [[_COMMUNITY_Vite Configuration|Vite Configuration]]
- [[_COMMUNITY_Vite Configuration|Vite Configuration]]
- [[_COMMUNITY_Vite Configuration|Vite Configuration]]
- [[_COMMUNITY_Vite Configuration|Vite Configuration]]
- [[_COMMUNITY_Vite Configuration|Vite Configuration]]
- [[_COMMUNITY_Vite Configuration|Vite Configuration]]
- [[_COMMUNITY_Vite Configuration|Vite Configuration]]

## God Nodes (most connected - your core abstractions)
1. `FlightSceneLayerManager` - 19 edges
2. `pollForViewer()` - 10 edges
3. `fetchRouteForCallsign()` - 5 edges
4. `refreshSnapshot()` - 4 edges
5. `fetchOpenSkySnapshot()` - 4 edges
6. `loadAirportIndex()` - 4 edges
7. `normalizeAirportRow()` - 4 edges
8. `toFiniteNumber()` - 4 edges
9. `getCameraCartographic()` - 4 edges
10. `stabilizeFlights()` - 3 edges

## Surprising Connections (you probably didn't know these)
- `pollForViewer()` --calls--> `getFlightRenderMode()`  [INFERRED]
  explorer\src\earth\Viewer.tsx → explorer\src\earth\flights.ts
- `FlightDetailsPanel()` --calls--> `getAirportDisplayCode()`  [INFERRED]
  explorer\src\earth\FlightDetailsPanel.tsx → explorer\src\earth\flights.ts
- `loadFlights()` --calls--> `fetchFlightSnapshot()`  [INFERRED]
  explorer\src\earth\Viewer.tsx → explorer\src\earth\flights.ts
- `getFlightCameraTarget()` --calls--> `predictFlightPosition()`  [INFERRED]
  explorer\src\earth\Viewer.tsx → explorer\src\earth\flights.ts
- `CameraRig()` --calls--> `useIdleRotation()`  [INFERRED]
  old-hero-globe\src\scene\CameraRig.jsx → old-hero-globe\src\hooks\useIdleRotation.js

## Communities

### Community 0 - "Flight Scene Visuals"
Cohesion: 0.27
Nodes (3): FlightSceneLayerManager, getFlightDisplayName(), pollForViewer()

### Community 1 - "Flight UI & Formatting"
Cohesion: 0.13
Nodes (7): FlightDetailsPanel(), fetchFlightSnapshot(), getAirportDisplayCode(), getFlightRenderMode(), predictFlightPosition(), getFlightCameraTarget(), loadFlights()

### Community 2 - "Viewer Core Navigation"
Cohesion: 0.22
Nodes (7): eventCameFromHud(), flyObliqueToDestination(), flyObliqueToPoint(), getCameraCartographic(), stopFromInteraction(), stopFromPointerMove(), updateZoomForAltitude()

### Community 3 - "Flight Proxy Server"
Cohesion: 0.24
Nodes (4): buildMockFlights(), buildMockSnapshot(), getFlightSnapshot(), refreshSnapshot()

### Community 4 - "Proxy Airport Data"
Cohesion: 0.29
Nodes (8): buildAirportCodes(), extractRouteCodes(), fetchRouteForCallsign(), loadAirportIndex(), normalizeAirportCode(), normalizeAirportRow(), normalizeCallsign(), serializeAirport()

### Community 5 - "Flight Path Interactivity"
Cohesion: 0.33
Nodes (4): buildRouteArcPositions(), buildTrailPositions(), isFlightPickId(), sampleArcSegment()

### Community 6 - "Proxy OpenSky Feed"
Cohesion: 0.5
Nodes (4): appendTrailPoint(), fetchOpenSkySnapshot(), getOpenSkyHeaders(), stabilizeFlights()

### Community 7 - "Old Globe Camera"
Cohesion: 0.5
Nodes (2): CameraRig(), useIdleRotation()

### Community 8 - "Proxy Data Normalization"
Cohesion: 1.0
Nodes (3): normalizeHeading(), normalizeOpenSkyState(), toFiniteNumber()

### Community 9 - "App Entry"
Cohesion: 0.67
Nodes (1): App()

### Community 10 - "Old Globe Lights"
Cohesion: 1.0
Nodes (0): 

### Community 11 - "Old Globe Scene"
Cohesion: 1.0
Nodes (0): 

### Community 12 - "Vite Configuration"
Cohesion: 1.0
Nodes (0): 

### Community 13 - "Vite Configuration"
Cohesion: 1.0
Nodes (0): 

### Community 14 - "Vite Configuration"
Cohesion: 1.0
Nodes (0): 

### Community 15 - "Vite Configuration"
Cohesion: 1.0
Nodes (0): 

### Community 16 - "Vite Configuration"
Cohesion: 1.0
Nodes (0): 

### Community 17 - "Vite Configuration"
Cohesion: 1.0
Nodes (0): 

### Community 18 - "Vite Configuration"
Cohesion: 1.0
Nodes (0): 

### Community 19 - "Vite Configuration"
Cohesion: 1.0
Nodes (0): 

## Knowledge Gaps
- **Thin community `Old Globe Lights`** (2 nodes): `Lights()`, `Lights.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Old Globe Scene`** (2 nodes): `Scene.jsx`, `Scene()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Vite Configuration`** (1 nodes): `vite.config.d.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Vite Configuration`** (1 nodes): `vite.config.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Vite Configuration`** (1 nodes): `vite.config.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Vite Configuration`** (1 nodes): `main.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Vite Configuration`** (1 nodes): `vite-env.d.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Vite Configuration`** (1 nodes): `vite.config.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Vite Configuration`** (1 nodes): `main.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Vite Configuration`** (1 nodes): `constants.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `pollForViewer()` connect `Flight Scene Visuals` to `Flight UI & Formatting`, `Viewer Core Navigation`?**
  _High betweenness centrality (0.113) - this node is a cross-community bridge._
- **Why does `FlightSceneLayerManager` connect `Flight Scene Visuals` to `Flight Path Interactivity`?**
  _High betweenness centrality (0.078) - this node is a cross-community bridge._
- **Why does `getFlightDisplayName()` connect `Flight Scene Visuals` to `Flight UI & Formatting`?**
  _High betweenness centrality (0.046) - this node is a cross-community bridge._
- **Are the 8 inferred relationships involving `pollForViewer()` (e.g. with `.setFlightsVisible()` and `.setAirportsVisible()`) actually correct?**
  _`pollForViewer()` has 8 INFERRED edges - model-reasoned connections that need verification._
- **Should `Flight UI & Formatting` be split into smaller, more focused modules?**
  _Cohesion score 0.13 - nodes in this community are weakly interconnected._
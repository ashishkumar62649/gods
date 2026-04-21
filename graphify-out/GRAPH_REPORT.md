# Graph Report - E:\ashis\god eyes  (2026-04-21)

## Corpus Check
- Corpus is ~32,308 words - fits in a single context window. You may not need a graph.

## Summary
- 84 nodes · 97 edges · 18 communities detected
- Extraction: 92% EXTRACTED · 8% INFERRED · 0% AMBIGUOUS · INFERRED: 8 edges (avg confidence: 0.79)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Viewer Camera and Globe Controls|Viewer Camera and Globe Controls]]
- [[_COMMUNITY_Product Direction and Core Features|Product Direction and Core Features]]
- [[_COMMUNITY_Flight Proxy Backend|Flight Proxy Backend]]
- [[_COMMUNITY_Flight Data Utilities|Flight Data Utilities]]
- [[_COMMUNITY_Flight Intel Experience|Flight Intel Experience]]
- [[_COMMUNITY_Legacy Camera Rig Orbit|Legacy Camera Rig Orbit]]
- [[_COMMUNITY_Legacy Earth Texture|Legacy Earth Texture]]
- [[_COMMUNITY_Application Entry Points|Application Entry Points]]
- [[_COMMUNITY_Legacy Lighting|Legacy Lighting]]
- [[_COMMUNITY_Legacy Scene Composition|Legacy Scene Composition]]
- [[_COMMUNITY_Explorer Vite Type Stub|Explorer Vite Type Stub]]
- [[_COMMUNITY_Explorer Vite Config JS|Explorer Vite Config JS]]
- [[_COMMUNITY_Explorer Vite Config TS|Explorer Vite Config TS]]
- [[_COMMUNITY_Explorer Main Entry|Explorer Main Entry]]
- [[_COMMUNITY_Explorer Vite Env Types|Explorer Vite Env Types]]
- [[_COMMUNITY_Legacy Vite Config|Legacy Vite Config]]
- [[_COMMUNITY_Legacy Main Entry|Legacy Main Entry]]
- [[_COMMUNITY_Legacy Constants|Legacy Constants]]

## God Nodes (most connected - your core abstractions)
1. `Cesium 3D Earth Explorer` - 10 edges
2. `Flight Layer` - 6 edges
3. `refreshSnapshot()` - 4 edges
4. `fetchOpenSkySnapshot()` - 4 edges
5. `getCameraCartographic()` - 4 edges
6. `normalizeOpenSkyState()` - 3 edges
7. `buildMockSnapshot()` - 3 edges
8. `toFiniteNumber()` - 3 edges
9. `normalizeHeading()` - 3 edges
10. `flyObliqueToDestination()` - 3 edges

## Surprising Connections (you probably didn't know these)
- `Legacy Hero Globe Prototype` --semantically_similar_to--> `Cesium 3D Earth Explorer`  [INFERRED] [semantically similar]
  old-hero-globe\public\textures\README.txt → PROJECT_STATE.md
- `OpenSky Network` --conceptually_related_to--> `Flight Layer`  [INFERRED]
  explorer\server\flights-proxy.mjs → PROJECT_STATE.md
- `pollForViewer()` --calls--> `getFlightRenderMode()`  [INFERRED]
  explorer\src\earth\Viewer.tsx → explorer\src\earth\flights.ts
- `loadFlights()` --calls--> `fetchFlightSnapshot()`  [INFERRED]
  explorer\src\earth\Viewer.tsx → explorer\src\earth\flights.ts
- `getFlightCameraTarget()` --calls--> `predictFlightPosition()`  [INFERRED]
  explorer\src\earth\Viewer.tsx → explorer\src\earth\flights.ts

## Hyperedges (group relationships)
- **Core Globe Experience** — feature_smooth_globe_navigation, feature_place_search, feature_imagery_switching, feature_3d_buildings, feature_landmark_orbiting [EXTRACTED 0.95]

## Communities

### Community 0 - "Viewer Camera and Globe Controls"
Cohesion: 0.19
Nodes (9): getFlightRenderMode(), eventCameFromHud(), flyObliqueToDestination(), flyObliqueToPoint(), getCameraCartographic(), pollForViewer(), stopFromInteraction(), stopFromPointerMove() (+1 more)

### Community 1 - "Product Direction and Core Features"
Cohesion: 0.13
Nodes (9): Legacy Hero Globe Prototype, Control-first now, premium polish layered later, 3D Buildings, Cesium 3D Earth Explorer, Imagery Switching, Landmark Orbiting, Place Search, Smooth Globe Navigation (+1 more)

### Community 2 - "Flight Proxy Backend"
Cohesion: 0.24
Nodes (10): buildMockFlights(), buildMockSnapshot(), fetchOpenSkySnapshot(), getFlightSnapshot(), getOpenSkyHeaders(), normalizeHeading(), normalizeOpenSkyState(), refreshSnapshot() (+2 more)

### Community 3 - "Flight Data Utilities"
Cohesion: 0.2
Nodes (4): fetchFlightSnapshot(), predictFlightPosition(), getFlightCameraTarget(), loadFlights()

### Community 4 - "Flight Intel Experience"
Cohesion: 0.29
Nodes (5): Local Flight Proxy, Flight Layer, Live Intelligence Layers, Selected Flight Focus and Track Controls, OpenSky Network

### Community 5 - "Legacy Camera Rig Orbit"
Cohesion: 0.5
Nodes (2): CameraRig(), useIdleRotation()

### Community 6 - "Legacy Earth Texture"
Cohesion: 0.5
Nodes (1): NASA Blue Marble Imagery

### Community 7 - "Application Entry Points"
Cohesion: 0.67
Nodes (1): App()

### Community 8 - "Legacy Lighting"
Cohesion: 1.0
Nodes (0): 

### Community 9 - "Legacy Scene Composition"
Cohesion: 1.0
Nodes (0): 

### Community 10 - "Explorer Vite Type Stub"
Cohesion: 1.0
Nodes (0): 

### Community 11 - "Explorer Vite Config JS"
Cohesion: 1.0
Nodes (0): 

### Community 12 - "Explorer Vite Config TS"
Cohesion: 1.0
Nodes (0): 

### Community 13 - "Explorer Main Entry"
Cohesion: 1.0
Nodes (0): 

### Community 14 - "Explorer Vite Env Types"
Cohesion: 1.0
Nodes (0): 

### Community 15 - "Legacy Vite Config"
Cohesion: 1.0
Nodes (0): 

### Community 16 - "Legacy Main Entry"
Cohesion: 1.0
Nodes (0): 

### Community 17 - "Legacy Constants"
Cohesion: 1.0
Nodes (0): 

## Knowledge Gaps
- **3 isolated node(s):** `God Eyes Explorer`, `Control-first now, premium polish layered later`, `Legacy Hero Globe Prototype`
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Legacy Lighting`** (2 nodes): `Lights()`, `Lights.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Legacy Scene Composition`** (2 nodes): `Scene.jsx`, `Scene()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Explorer Vite Type Stub`** (1 nodes): `vite.config.d.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Explorer Vite Config JS`** (1 nodes): `vite.config.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Explorer Vite Config TS`** (1 nodes): `vite.config.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Explorer Main Entry`** (1 nodes): `main.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Explorer Vite Env Types`** (1 nodes): `vite-env.d.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Legacy Vite Config`** (1 nodes): `vite.config.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Legacy Main Entry`** (1 nodes): `main.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Legacy Constants`** (1 nodes): `constants.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Flight Layer` connect `Flight Intel Experience` to `Viewer Camera and Globe Controls`, `Flight Proxy Backend`, `Flight Data Utilities`?**
  _High betweenness centrality (0.282) - this node is a cross-community bridge._
- **Why does `Cesium 3D Earth Explorer` connect `Product Direction and Core Features` to `Viewer Camera and Globe Controls`, `Flight Intel Experience`?**
  _High betweenness centrality (0.143) - this node is a cross-community bridge._
- **What connects `God Eyes Explorer`, `Control-first now, premium polish layered later`, `Legacy Hero Globe Prototype` to the rest of the system?**
  _3 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Product Direction and Core Features` be split into smaller, more focused modules?**
  _Cohesion score 0.13 - nodes in this community are weakly interconnected._
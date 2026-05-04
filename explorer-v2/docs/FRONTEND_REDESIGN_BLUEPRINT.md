# GODS Explorer Frontend Redesign Blueprint

## Version Strategy

`explorer/` is Version 1. It remains intact and serves as the reference implementation for proven Cesium, camera, search, and aircraft motion behavior.

`explorer version 2/` is Version 2. It is a new frontend-first app built from scratch visually, with a cinematic intelligence cockpit UI powered by mock data first.

Hard rule: **V2 frontend is new, but V1 motion/search/camera/flight behavior is protected and must be reused.**

## V2 Goal

Build a premium dark GODS Explorer intelligence dashboard with:

- full-screen 3D Cesium Earth
- glassmorphic dark panels
- top command bar
- left vertical icon rail
- left layer/control panel
- right intelligence panel
- bottom timeline dock
- status footer
- blue/cyan primary highlights
- orange/red/yellow/green severity system
- compact high-density intelligence cards
- cinematic mock map overlays and markers

The UI must be complete with typed mock data first. Later backend/database data should plug in through adapters.

## Protected V1 Logic To Reuse

Camera/search/orbit behavior:

- `explorer/src/engine/MapRenderer.ts`
- `explorer/src/engine/ViewerCameraController.ts`
- `explorer/src/earth/viewer/cameraUtils.ts`
- `explorer/src/earth/viewer/viewerConfig.ts`
- `explorer/src/earth/search/SearchBox.tsx`
- `explorer/src/core/store/useMapStore.ts`

Flight motion and rendering behavior:

- `explorer/src/earth/flights/flights.ts`
- `explorer/src/earth/flights/flightVisuals.ts`
- `explorer/src/earth/flights/flightLayers.ts`
- `explorer/src/earth/flights/tar1090.generated.ts`
- `explorer/src/earth/viewer/useFlightScene.ts`

Preserve:

- same Cesium easing
- same home camera position
- same staged/oblique search fly-to
- same auto-orbit after search
- same altitude-based zoom behavior
- same aircraft prediction/smoothing
- same selected-flight focus and flight-deck camera behavior
- same scroll/zoom feel
- same search result ranking

Do not rewrite the math for camera motion, flight interpolation, prediction, orbit, or zoom tuning. Copy or adapt the V1 logic so V2 compiles independently.

## V2 Screens

Implement four mode-based screens inside one fullscreen `AppShell`, not routes:

1. World Overview
2. Asset Intelligence
3. Watch Zones & Alerts
4. Location Intelligence

## Reference Screenshots

- World Overview: `C:/Users/ashis/Downloads/ChatGPT Image May 3, 2026, 05_40_24 AM.png`
- Asset Intelligence: `C:/Users/ashis/Downloads/ChatGPT Image May 3, 2026, 05_40_18 AM.png`
- Watch Zones & Alerts: `C:/Users/ashis/Downloads/ChatGPT Image May 3, 2026, 05_40_06 AM.png`
- Location Intelligence: `C:/Users/ashis/Downloads/ChatGPT Image May 3, 2026, 05_39_40 AM.png`

## V2 Architecture

Recommended source structure:

```text
src/
  App.tsx
  main.tsx
  app.css
  app/
    AppShell.tsx
    appModes.ts
    appTypes.ts
    theme/
      tokens.css
      glass.css
      layout.css
      typography.css
  components/
    shell/
    cards/
    controls/
    map-overlays/
  earth/
    CesiumStage.tsx
    CesiumMount.tsx
    mockMapEntities.ts
    viewerBridge.ts
    viewer/
    flights/
  engine/
  features/
    world-overview/
    asset-intelligence/
    watch-zones/
    location-intelligence/
  store/
  data/
    adapters/
    contracts/
  utils/
```

## Global Layout

The shell should render:

```tsx
<div className="god-app-shell">
  <CesiumStage />
  <TopBar />
  <LeftIconRail />
  {mode === 'world-overview' && <WorldOverviewScreen />}
  {mode === 'asset-intelligence' && <AssetIntelligenceScreen />}
  {mode === 'watch-zones' && <WatchZonesScreen />}
  {mode === 'location-intelligence' && <LocationIntelligenceScreen />}
  <FloatingMapControls />
  <StatusFooter />
</div>
```

React panels sit above the globe using fixed or absolute positioning.

## Core Design Tokens

Use shared CSS variables for all panels and controls:

```css
:root {
  --god-bg: #040914;
  --god-bg-soft: #07111f;
  --god-panel: rgba(8, 18, 33, 0.78);
  --god-panel-strong: rgba(6, 13, 27, 0.9);
  --god-panel-soft: rgba(10, 24, 43, 0.62);
  --god-border: rgba(125, 170, 255, 0.16);
  --god-border-strong: rgba(96, 165, 250, 0.32);
  --god-text: #eaf2ff;
  --god-text-soft: #a8b7d6;
  --god-text-muted: #7282a3;
  --god-blue: #3b82f6;
  --god-cyan: #22d3ee;
  --god-green: #22c55e;
  --god-yellow: #eab308;
  --god-orange: #f97316;
  --god-red: #ef4444;
  --god-purple: #a855f7;
  --god-radius-sm: 10px;
  --god-radius-md: 14px;
  --god-radius-lg: 18px;
  --god-radius-xl: 24px;
  --god-shadow-panel: 0 20px 60px rgba(0, 0, 0, 0.45);
  --god-shadow-blue: 0 0 30px rgba(59, 130, 246, 0.22);
  --god-blur: blur(18px);
}
```

## Data Rules

- Components never read raw API/database shapes.
- Components only read frontend contracts.
- Mock data must match frontend contracts.
- Adapters convert backend data into frontend contracts later.
- Cesium entities should be created from map entity contracts.
- No business logic inside visual cards.
- No random CSS values scattered through components.
- Use one severity system everywhere.

## Implementation Order

1. Create `explorer version 2/`.
2. Copy Vite/React/TypeScript/Cesium setup from V1.
3. Copy protected V1 motion kernel into V2 and adapt imports only.
4. Build the V2 shell, theme, Zustand stores, and mock data adapters.
5. Implement World Overview.
6. Implement Asset Intelligence.
7. Implement Watch Zones & Alerts.
8. Implement Location Intelligence.
9. Add screenshot-like mock overlays.
10. Run `npm run build` inside `explorer version 2`.

## Acceptance Criteria

- V2 builds independently with `npm run build`.
- V2 renders a full-screen cinematic GODS Explorer UI.
- Cesium globe renders behind the UI.
- Mode switching works for all four screens.
- All panel data comes from typed mock data or adapters.
- V2 camera/search/scroll/flight motion preserves V1 behavior.
- V1 remains untouched.
- No backend/PostgreSQL/Docker integration is required for this frontend pass.

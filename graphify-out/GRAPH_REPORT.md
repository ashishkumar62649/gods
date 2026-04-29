# Graph Report - E:\ashis\god eyes  (2026-04-30)

## Corpus Check
- 114 files · ~484,541 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 924 nodes · 1894 edges · 79 communities detected
- Extraction: 92% EXTRACTED · 8% INFERRED · 0% AMBIGUOUS · INFERRED: 152 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 57|Community 57]]
- [[_COMMUNITY_Community 58|Community 58]]
- [[_COMMUNITY_Community 59|Community 59]]
- [[_COMMUNITY_Community 60|Community 60]]
- [[_COMMUNITY_Community 61|Community 61]]
- [[_COMMUNITY_Community 62|Community 62]]
- [[_COMMUNITY_Community 63|Community 63]]
- [[_COMMUNITY_Community 64|Community 64]]
- [[_COMMUNITY_Community 65|Community 65]]
- [[_COMMUNITY_Community 66|Community 66]]
- [[_COMMUNITY_Community 67|Community 67]]
- [[_COMMUNITY_Community 68|Community 68]]
- [[_COMMUNITY_Community 69|Community 69]]
- [[_COMMUNITY_Community 70|Community 70]]
- [[_COMMUNITY_Community 71|Community 71]]
- [[_COMMUNITY_Community 72|Community 72]]
- [[_COMMUNITY_Community 73|Community 73]]
- [[_COMMUNITY_Community 74|Community 74]]
- [[_COMMUNITY_Community 75|Community 75]]
- [[_COMMUNITY_Community 76|Community 76]]
- [[_COMMUNITY_Community 77|Community 77]]
- [[_COMMUNITY_Community 78|Community 78]]

## God Nodes (most connected - your core abstractions)
1. `FlightSceneLayerManager` - 43 edges
2. `initMap()` - 36 edges
3. `earlyInitPage()` - 35 edges
4. `SatelliteSceneLayerManager` - 32 edges
5. `Filter()` - 28 edges
6. `refreshSelected()` - 21 edges
7. `refreshFilter()` - 21 edges
8. `refresh()` - 19 edges
9. `selectPlaneByHex()` - 16 edges
10. `MapRenderer` - 16 edges

## Surprising Connections (you probably didn't know these)
- `Filter()` --calls--> `fetchOpenSkySnapshot()`  [INFERRED]
  E:\ashis\god eyes\tmp-adsblol-script.js → E:\ashis\god eyes\explorer\server\flights-proxy.mjs
- `Filter()` --calls--> `fetchRouteForCallsign()`  [INFERRED]
  E:\ashis\god eyes\tmp-adsblol-script.js → E:\ashis\god eyes\explorer\server\flights-proxy.mjs
- `Filter()` --calls--> `fetchTraceForIcao24()`  [INFERRED]
  E:\ashis\god eyes\tmp-adsblol-script.js → E:\ashis\god eyes\explorer\server\flights-proxy.mjs
- `Filter()` --calls--> `buildAirportCodes()`  [INFERRED]
  E:\ashis\god eyes\tmp-adsblol-script.js → E:\ashis\god eyes\explorer\server\flights-proxy.mjs
- `Filter()` --calls--> `buildAirportCodes()`  [INFERRED]
  E:\ashis\god eyes\tmp-adsblol-script.js → E:\ashis\god eyes\explorer\server\services\airportIndex.mjs

## Communities

### Community 0 - "Community 0"
Cohesion: 0.03
Nodes (185): active(), adjust_baro_alt(), adjust_geom_alt(), adjustInfoBlock(), afterFirstFetch(), autoSelectClosest(), baseExportFilenameForAircrafts(), buttonActive() (+177 more)

### Community 1 - "Community 1"
Cohesion: 0.05
Nodes (29): flyObliqueToDestination(), flyObliqueToPoint(), getCameraCartographic(), getCockpitCameraPose(), getFlightCameraTarget(), handleEmergencyClick(), FlightDetailsPanel(), buildFlightApiCartesian() (+21 more)

### Community 2 - "Community 2"
Cohesion: 0.05
Nodes (58): buildAircraftType(), buildHeaderIndex(), createAircraftCsvStream(), getAircraftIdentity(), initAircraftIndex(), isMilitaryOperator(), looksLikeHeaderRow(), normalizeIcao24() (+50 more)

### Community 3 - "Community 3"
Cohesion: 0.09
Nodes (18): centralAngleRadians(), findNextSignalTransitionSeconds(), getNearestGroundStation(), getSelectedSatelliteSignalStatus(), groundStationToCartesian(), hasLineOfSight(), SatelliteRenderer, buildPredictedPathPositions() (+10 more)

### Community 4 - "Community 4"
Cohesion: 0.08
Nodes (38): syncClimate(), syncInfrastructure(), syncSatellites(), syncTelemetry(), fetchInfrastructureSnapshot(), fetchInfrastructureSnapshot(), isRecord(), readArrayPayload() (+30 more)

### Community 5 - "Community 5"
Cohesion: 0.08
Nodes (40): airportTypePriorityBonus(), appendTrailPoint(), bearingDegrees(), buildAirportCodes(), buildMockFlights(), buildMockSnapshot(), deriveManufacturerFromDescription(), estimateRouteFromLiveFlight() (+32 more)

### Community 6 - "Community 6"
Cohesion: 0.09
Nodes (25): extractSegments(), fetchSubseaCables(), fetchWithTimeout(), normalizeCableFeature(), safeStr(), stableCableId(), addIntelligenceNode(), distanceToSegmentMeters() (+17 more)

### Community 7 - "Community 7"
Cohesion: 0.11
Nodes (29): altitudeColor(), clamp(), formatNumber(), getEmergencyFlightIconImage(), getFlightAltitudeColorCss(), getFlightFamilyLabel(), getFlightIconDimensions(), getFlightIconImage() (+21 more)

### Community 8 - "Community 8"
Cohesion: 0.11
Nodes (5): ViewerCameraController, fetchPointWeather(), WeatherInspectorRenderer, isNativeWeatherUrl(), WeatherLayerManager

### Community 9 - "Community 9"
Cohesion: 0.14
Nodes (23): buildAirportCodes(), emptyAirportIndex(), isRouteCandidateAirport(), loadAirportIndex(), normalizeAirportCode(), normalizeAirportRow(), serializeAirport(), toFiniteNumber() (+15 more)

### Community 10 - "Community 10"
Cohesion: 0.13
Nodes (20): buildIntelligenceMeta(), buildOrbitMeta(), classifyConstellation(), classifyMission(), getSatrecCache(), normalizeSatellite(), propagateNow(), startOrbitPropagationLoop() (+12 more)

### Community 11 - "Community 11"
Cohesion: 0.19
Nodes (20): appendRows(), assertGfwResponse(), buildPendingSnapshot(), buildReportWindow(), buildSectorPolygon(), fetchPresenceReport(), fetchPresenceReportForSector(), fetchTradePresenceRows() (+12 more)

### Community 12 - "Community 12"
Cohesion: 0.14
Nodes (5): CableSceneLayerManager, extractCablePickId(), getPulse(), headingToRotation(), InfrastructureRenderer

### Community 13 - "Community 13"
Cohesion: 0.17
Nodes (3): buildImageryOptions(), MapRenderer, pickBestGeocoderResult()

### Community 14 - "Community 14"
Cohesion: 0.23
Nodes (5): buildTransitImageryProvider(), getLayerAlpha(), isConfigured(), normalizeMapTilerMapId(), TransitRenderer

### Community 15 - "Community 15"
Cohesion: 0.26
Nodes (4): applyPointStyle(), buildVesselRenderId(), extractMaritimePickId(), MaritimeLayerManager

### Community 16 - "Community 16"
Cohesion: 0.24
Nodes (6): toggleLayer(), buildTransitImageryProvider(), getMissingTransitConfig(), isConfigured(), normalizeMapTilerMapId(), TransitImageryLayerManager

### Community 17 - "Community 17"
Cohesion: 0.27
Nodes (9): fetchAirportInfo(), fetchByCallsign(), fetchByHex(), fetchByRegistration(), fetchRouteSet(), fetchWithTimeout(), ingestEndpoint(), runIntelSweep() (+1 more)

### Community 18 - "Community 18"
Cohesion: 0.27
Nodes (5): buildHome(), flyIntoHome(), initializeViewer(), tuneScene(), WeatherRenderer

### Community 19 - "Community 19"
Cohesion: 0.27
Nodes (5): escapeRegExp(), extractBalanced(), extractNumberLiteral(), extractObject(), extractStringLiteral()

### Community 20 - "Community 20"
Cohesion: 0.29
Nodes (0): 

### Community 21 - "Community 21"
Cohesion: 0.4
Nodes (0): 

### Community 22 - "Community 22"
Cohesion: 0.5
Nodes (0): 

### Community 23 - "Community 23"
Cohesion: 0.67
Nodes (0): 

### Community 24 - "Community 24"
Cohesion: 0.67
Nodes (1): MetroLayerManager

### Community 25 - "Community 25"
Cohesion: 0.67
Nodes (1): RailwayLayerManager

### Community 26 - "Community 26"
Cohesion: 0.67
Nodes (0): 

### Community 27 - "Community 27"
Cohesion: 1.0
Nodes (0): 

### Community 28 - "Community 28"
Cohesion: 1.0
Nodes (0): 

### Community 29 - "Community 29"
Cohesion: 1.0
Nodes (0): 

### Community 30 - "Community 30"
Cohesion: 1.0
Nodes (0): 

### Community 31 - "Community 31"
Cohesion: 1.0
Nodes (0): 

### Community 32 - "Community 32"
Cohesion: 1.0
Nodes (0): 

### Community 33 - "Community 33"
Cohesion: 1.0
Nodes (0): 

### Community 34 - "Community 34"
Cohesion: 1.0
Nodes (0): 

### Community 35 - "Community 35"
Cohesion: 1.0
Nodes (0): 

### Community 36 - "Community 36"
Cohesion: 1.0
Nodes (0): 

### Community 37 - "Community 37"
Cohesion: 1.0
Nodes (0): 

### Community 38 - "Community 38"
Cohesion: 1.0
Nodes (0): 

### Community 39 - "Community 39"
Cohesion: 1.0
Nodes (0): 

### Community 40 - "Community 40"
Cohesion: 1.0
Nodes (0): 

### Community 41 - "Community 41"
Cohesion: 1.0
Nodes (0): 

### Community 42 - "Community 42"
Cohesion: 1.0
Nodes (0): 

### Community 43 - "Community 43"
Cohesion: 1.0
Nodes (0): 

### Community 44 - "Community 44"
Cohesion: 1.0
Nodes (0): 

### Community 45 - "Community 45"
Cohesion: 1.0
Nodes (0): 

### Community 46 - "Community 46"
Cohesion: 1.0
Nodes (0): 

### Community 47 - "Community 47"
Cohesion: 1.0
Nodes (0): 

### Community 48 - "Community 48"
Cohesion: 1.0
Nodes (0): 

### Community 49 - "Community 49"
Cohesion: 1.0
Nodes (0): 

### Community 50 - "Community 50"
Cohesion: 1.0
Nodes (0): 

### Community 51 - "Community 51"
Cohesion: 1.0
Nodes (0): 

### Community 52 - "Community 52"
Cohesion: 1.0
Nodes (0): 

### Community 53 - "Community 53"
Cohesion: 1.0
Nodes (0): 

### Community 54 - "Community 54"
Cohesion: 1.0
Nodes (0): 

### Community 55 - "Community 55"
Cohesion: 1.0
Nodes (0): 

### Community 56 - "Community 56"
Cohesion: 1.0
Nodes (0): 

### Community 57 - "Community 57"
Cohesion: 1.0
Nodes (0): 

### Community 58 - "Community 58"
Cohesion: 1.0
Nodes (0): 

### Community 59 - "Community 59"
Cohesion: 1.0
Nodes (0): 

### Community 60 - "Community 60"
Cohesion: 1.0
Nodes (0): 

### Community 61 - "Community 61"
Cohesion: 1.0
Nodes (0): 

### Community 62 - "Community 62"
Cohesion: 1.0
Nodes (0): 

### Community 63 - "Community 63"
Cohesion: 1.0
Nodes (0): 

### Community 64 - "Community 64"
Cohesion: 1.0
Nodes (0): 

### Community 65 - "Community 65"
Cohesion: 1.0
Nodes (0): 

### Community 66 - "Community 66"
Cohesion: 1.0
Nodes (0): 

### Community 67 - "Community 67"
Cohesion: 1.0
Nodes (0): 

### Community 68 - "Community 68"
Cohesion: 1.0
Nodes (0): 

### Community 69 - "Community 69"
Cohesion: 1.0
Nodes (0): 

### Community 70 - "Community 70"
Cohesion: 1.0
Nodes (0): 

### Community 71 - "Community 71"
Cohesion: 1.0
Nodes (0): 

### Community 72 - "Community 72"
Cohesion: 1.0
Nodes (0): 

### Community 73 - "Community 73"
Cohesion: 1.0
Nodes (0): 

### Community 74 - "Community 74"
Cohesion: 1.0
Nodes (0): 

### Community 75 - "Community 75"
Cohesion: 1.0
Nodes (0): 

### Community 76 - "Community 76"
Cohesion: 1.0
Nodes (0): 

### Community 77 - "Community 77"
Cohesion: 1.0
Nodes (0): 

### Community 78 - "Community 78"
Cohesion: 1.0
Nodes (0): 

## Knowledge Gaps
- **Thin community `Community 27`** (2 nodes): `App()`, `App.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 28`** (2 nodes): `endpoints.ts`, `readEnv()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 29`** (2 nodes): `useWeatherInspectStore.ts`, `levelFromAltitude()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 30`** (2 nodes): `maritime.ts`, `fetchMaritimeSnapshot()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 31`** (2 nodes): `DevStatusPanel()`, `DevStatusPanel.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 32`** (2 nodes): `useBuildingsTileset.ts`, `useBuildingsTileset()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 33`** (2 nodes): `useCableScene.ts`, `useCableScene()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 34`** (2 nodes): `useClimateData.ts`, `useClimateData()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 35`** (2 nodes): `useFlightData.ts`, `useFlightData()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 36`** (2 nodes): `useFlightScene.ts`, `useFlightScene()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 37`** (2 nodes): `useInfrastructureData.ts`, `useInfrastructureData()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 38`** (2 nodes): `useInteractionGuards.ts`, `useInteractionGuards()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 39`** (2 nodes): `useMaritimeData.ts`, `useMaritimeData()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 40`** (2 nodes): `useMaritimeScene.ts`, `useMaritimeScene()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 41`** (2 nodes): `useMetroScene.ts`, `useMetroScene()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 42`** (2 nodes): `useOrbitControls.ts`, `useOrbitControls()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 43`** (2 nodes): `useRailwayScene.ts`, `useRailwayScene()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 44`** (2 nodes): `useSatelliteData.ts`, `useSatelliteData()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 45`** (2 nodes): `useSatelliteScene.ts`, `useSatelliteScene()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 46`** (2 nodes): `useViewerSetup.ts`, `useViewerSetup()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 47`** (2 nodes): `useWeatherScene.ts`, `useWeatherScene()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 48`** (2 nodes): `EarthDashboard.tsx`, `EarthDashboard()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 49`** (2 nodes): `ClimatePanel()`, `ClimatePanel.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 50`** (2 nodes): `SatelliteHud.tsx`, `SatelliteHud()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 51`** (2 nodes): `SearchPanel.tsx`, `SearchPanel()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 52`** (2 nodes): `TelemetryPanel.tsx`, `TelemetryPanel()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 53`** (2 nodes): `TransitPanel.tsx`, `TransitPanel()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 54`** (2 nodes): `WeatherReticle.tsx`, `altitudeOpacity()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 55`** (1 nodes): `start.ps1`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 56`** (1 nodes): `vite.config.d.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 57`** (1 nodes): `vite.config.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 58`** (1 nodes): `vite.config.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 59`** (1 nodes): `main.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 60`** (1 nodes): `vite-env.d.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 61`** (1 nodes): `constants.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 62`** (1 nodes): `theme.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 63`** (1 nodes): `useClimateStore.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 64`** (1 nodes): `useInfrastructureStore.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 65`** (1 nodes): `useMapStore.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 66`** (1 nodes): `useSatelliteStore.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 67`** (1 nodes): `useTelemetryStore.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 68`** (1 nodes): `useTransitStore.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 69`** (1 nodes): `tar1090.generated.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 70`** (1 nodes): `FlightDeckHud.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 71`** (1 nodes): `SatelliteDetailsPanel.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 72`** (1 nodes): `ImageryFlyout.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 73`** (1 nodes): `viewerConfig.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 74`** (1 nodes): `viewerTypes.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 75`** (1 nodes): `IRenderer.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 76`** (1 nodes): `WeatherInspectorOverlay.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 77`** (1 nodes): `WeatherLayerAccordion.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 78`** (1 nodes): `run_detect_updates.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Filter()` connect `Community 4` to `Community 0`, `Community 2`, `Community 5`, `Community 6`, `Community 7`, `Community 8`, `Community 9`, `Community 10`, `Community 12`, `Community 13`, `Community 16`?**
  _High betweenness centrality (0.448) - this node is a cross-community bridge._
- **Why does `resolveFlightIconPreset()` connect `Community 7` to `Community 4`?**
  _High betweenness centrality (0.067) - this node is a cross-community bridge._
- **Why does `reaper()` connect `Community 0` to `Community 8`, `Community 3`?**
  _High betweenness centrality (0.050) - this node is a cross-community bridge._
- **Are the 27 inferred relationships involving `Filter()` (e.g. with `fetchOpenSkySnapshot()` and `fetchRouteForCallsign()`) actually correct?**
  _`Filter()` has 27 INFERRED edges - model-reasoned connections that need verification._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.03 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._
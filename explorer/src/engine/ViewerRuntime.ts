import {
  Cartesian3,
  Terrain,
  Viewer as CesiumViewer,
} from 'cesium';
import { buildHome } from '../earth/viewer/cameraUtils';
import { FLIGHT_EASING, HOME_VIEW } from '../earth/viewer/viewerConfig';
import { InfrastructureRenderer } from './InfrastructureRenderer';
import { HazardRenderer } from './HazardRenderer';
import { IntelLocationRenderer } from './IntelLocationRenderer';
import { MapRenderer } from './MapRenderer';
import { SatelliteRenderer } from './SatelliteRenderer';
import { TelemetryRenderer } from './TelemetryRenderer';
import { TransitRenderer } from './TransitRenderer';
import { ViewerCameraController } from './ViewerCameraController';
import { WeatherRenderer } from './WeatherRenderer';
import { WeatherInspectorRenderer } from './WeatherInspectorRenderer';

export function initializeViewer(container: HTMLElement | string) {
  const viewerOptions: CesiumViewer.ConstructorOptions = {
    baseLayerPicker: false,
    geocoder: false,
    animation: false,
    timeline: false,
    infoBox: false,
    homeButton: false,
    navigationHelpButton: false,
    sceneModePicker: false,
    baseLayer: false,
    // Cesium World Terrain — required for 3D mountain/valley relief and
    // for OSM Buildings to clamp correctly to the terrain surface.
    terrain: Terrain.fromWorldTerrain(),
  };
  const viewer = new CesiumViewer(container, viewerOptions);

  tuneScene(viewer);
  flyIntoHome(viewer);

  const mapRenderer = new MapRenderer();
  const weatherRenderer = new WeatherRenderer();
  const transitRenderer = new TransitRenderer();
  const telemetryRenderer = new TelemetryRenderer();
  const satelliteRenderer = new SatelliteRenderer();
  const infrastructureRenderer = new InfrastructureRenderer();
  const hazardRenderer = new HazardRenderer();
  const intelLocationRenderer = new IntelLocationRenderer();
  const weatherInspectorRenderer = new WeatherInspectorRenderer();
  const cameraController = new ViewerCameraController();

  mapRenderer.attach(viewer);
  weatherRenderer.attach(viewer);
  transitRenderer.attach(viewer);
  telemetryRenderer.attach(viewer);
  satelliteRenderer.attach(viewer);
  infrastructureRenderer.attach(viewer);
  hazardRenderer.attach(viewer);
  intelLocationRenderer.attach(viewer);
  weatherInspectorRenderer.attach(viewer);
  cameraController.attach(viewer);

  return {
    viewer,
    destroy: () => {
      cameraController.detach();
      weatherInspectorRenderer.detach();
      intelLocationRenderer.detach();
      hazardRenderer.detach();
      infrastructureRenderer.detach();
      satelliteRenderer.detach();
      telemetryRenderer.detach();
      transitRenderer.detach();
      weatherRenderer.detach();
      mapRenderer.detach();
      viewer.destroy();
    },
  };
}

function tuneScene(viewer: CesiumViewer): void {
  const controller = viewer.scene.screenSpaceCameraController;
  controller.zoomFactor = 3.0;
  controller.inertiaZoom = 0.9;
  controller.inertiaSpin = 0.9;
  controller.inertiaTranslate = 0.9;
  controller.minimumZoomDistance = 50;
  controller.maximumZoomDistance = 40_000_000;
  controller.enableCollisionDetection = true;
  controller.enableTilt = true;

  // Depth-test primitives (buildings, labels, entities) against terrain so
  // they are occluded by hills/mountains instead of floating in the air.
  viewer.scene.globe.depthTestAgainstTerrain = true;

  viewer.scene.globe.preloadSiblings = true;
  viewer.scene.globe.tileCacheSize = 1000;

  viewer.targetFrameRate = 60;
  viewer.resolutionScale = 1.0;
  viewer.useBrowserRecommendedResolution = false;
  viewer.camera.percentageChanged = 0.01;
}

function flyIntoHome(viewer: CesiumViewer): void {
  const { destination, orientation } = buildHome();

  viewer.camera.setView({
    destination: Cartesian3.fromDegrees(
      HOME_VIEW.lon,
      HOME_VIEW.lat,
      HOME_VIEW.height * 1.6,
    ),
    orientation,
  });

  viewer.camera.flyTo({
    destination,
    orientation,
    duration: 2.5,
    easingFunction: FLIGHT_EASING,
  });
}

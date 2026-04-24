import {
  Cartesian3,
  Viewer as CesiumViewer,
} from 'cesium';
import { buildHome } from '../earth/viewer/cameraUtils';
import { FLIGHT_EASING, HOME_VIEW } from '../earth/viewer/viewerConfig';
import { InfrastructureRenderer } from './InfrastructureRenderer';
import { MapRenderer } from './MapRenderer';
import { SatelliteRenderer } from './SatelliteRenderer';
import { TelemetryRenderer } from './TelemetryRenderer';
import { TransitRenderer } from './TransitRenderer';
import { ViewerCameraController } from './ViewerCameraController';
import { WeatherRenderer } from './WeatherRenderer';

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
  const cameraController = new ViewerCameraController();

  mapRenderer.attach(viewer);
  weatherRenderer.attach(viewer);
  transitRenderer.attach(viewer);
  telemetryRenderer.attach(viewer);
  satelliteRenderer.attach(viewer);
  infrastructureRenderer.attach(viewer);
  cameraController.attach(viewer);

  return {
    viewer,
    destroy: () => {
      cameraController.detach();
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
  controller.inertiaZoom = 0.95;
  controller.inertiaSpin = 0.9;
  controller.inertiaTranslate = 0.9;
  controller.minimumZoomDistance = 1;
  controller.maximumZoomDistance = 40_000_000;
  controller.enableCollisionDetection = true;
  controller.enableTilt = true;

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

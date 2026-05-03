import { Terrain, Viewer as CesiumViewer } from 'cesium';
import { MapRenderer } from './MapRenderer';
import { MockFlightMotionRenderer } from './MockFlightMotionRenderer';
import { MockIntelEntityRenderer } from './MockIntelEntityRenderer';
import { ViewerCameraController } from './ViewerCameraController';

export function initializeViewer(container: HTMLElement | string) {
  const viewer = new CesiumViewer(container, {
    animation: false,
    baseLayer: false,
    baseLayerPicker: false,
    fullscreenButton: false,
    geocoder: false,
    homeButton: false,
    infoBox: false,
    navigationHelpButton: false,
    sceneModePicker: false,
    selectionIndicator: false,
    timeline: false,
    terrain: Terrain.fromWorldTerrain(),
  });

  const mapRenderer = new MapRenderer();
  const cameraController = new ViewerCameraController();
  const flightRenderer = new MockFlightMotionRenderer();
  const intelRenderer = new MockIntelEntityRenderer();

  mapRenderer.attach(viewer);
  cameraController.attach(viewer);
  intelRenderer.attach(viewer);
  flightRenderer.attach(viewer);

  return {
    viewer,
    destroy: () => {
      flightRenderer.detach();
      intelRenderer.detach();
      cameraController.detach();
      mapRenderer.detach();
      if (!viewer.isDestroyed()) {
        viewer.destroy();
      }
    },
  };
}

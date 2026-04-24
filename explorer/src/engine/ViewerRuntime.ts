import {
  UrlTemplateImageryProvider,
  Viewer as CesiumViewer,
} from 'cesium';
import { TelemetryRenderer } from './TelemetryRenderer';
import { TransitRenderer } from './TransitRenderer';
import { ViewerCameraController } from './ViewerCameraController';
import { WeatherRenderer } from './WeatherRenderer';

type ViewerRuntimeOptions = CesiumViewer.ConstructorOptions & {
  imageryProvider: UrlTemplateImageryProvider;
};

export function initializeViewer(container: HTMLElement | string) {
  const mapKey = import.meta.env.VITE_MAPTILER_API_KEY || '';
  const viewerOptions: ViewerRuntimeOptions = {
    baseLayerPicker: false,
    geocoder: false,
    animation: false,
    timeline: false,
    infoBox: false,
    homeButton: false,
    navigationHelpButton: false,
    sceneModePicker: false,
    imageryProvider: new UrlTemplateImageryProvider({
      url: 'https://api.maptiler.com/tiles/satellite-v2/{z}/{x}/{y}.jpg?key=' + mapKey,
      maximumLevel: 20,
    }),
  };
  const viewer = new CesiumViewer(container, viewerOptions);
  const weatherRenderer = new WeatherRenderer();
  const transitRenderer = new TransitRenderer();
  const telemetryRenderer = new TelemetryRenderer();
  const cameraController = new ViewerCameraController();

  weatherRenderer.attach(viewer);
  transitRenderer.attach(viewer);
  telemetryRenderer.attach(viewer);
  cameraController.attach(viewer);

  return {
    viewer,
    destroy: () => {
      cameraController.detach();
      telemetryRenderer.detach();
      transitRenderer.detach();
      weatherRenderer.detach();
      viewer.destroy();
    },
  };
}

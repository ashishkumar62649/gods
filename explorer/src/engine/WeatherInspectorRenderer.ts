import {
  Cartesian2,
  Cartographic,
  Math as CesiumMath,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  type Viewer as CesiumViewer,
} from 'cesium';
import type { IRenderer } from './IRenderer';
import { fetchPointWeather } from '../core/api/weatherApi';
import { useWeatherInspectStore } from '../core/store/useWeatherInspectStore';

export class WeatherInspectorRenderer implements IRenderer {
  private viewer: CesiumViewer | null = null;
  private handler: ScreenSpaceEventHandler | null = null;

  attach(viewer: CesiumViewer): void {
    this.viewer = viewer;
    this.handler = new ScreenSpaceEventHandler(viewer.canvas);

    this.handler.setInputAction((event: { position: Cartesian2 }) => {
      void this.handleClick(event.position);
    }, ScreenSpaceEventType.LEFT_CLICK);
  }

  detach(): void {
    this.handler?.destroy();
    this.handler = null;
    this.viewer = null;
  }

  private async handleClick(screenPos: Cartesian2): Promise<void> {
    const viewer = this.viewer;
    if (!viewer || viewer.isDestroyed()) return;

    // If user clicked on an entity (flight, satellite, ship), defer to other systems.
    const picked = viewer.scene.pick(screenPos);
    if (picked) return;

    // Raycast camera through screen point to globe surface.
    const ray = viewer.camera.getPickRay(screenPos);
    if (!ray) return;
    const cartesian = viewer.scene.globe.pick(ray, viewer.scene);
    if (!cartesian) return;

    const cartographic = Cartographic.fromCartesian(cartesian);
    const lat = CesiumMath.toDegrees(cartographic.latitude);
    const lon = CesiumMath.toDegrees(cartographic.longitude);

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;

    const store = useWeatherInspectStore.getState();
    store.setFetching(true);
    store.setError(null);

    try {
      const data = await fetchPointWeather(lat, lon);
      useWeatherInspectStore.getState().pinPoint({
        id: `${lat.toFixed(4)}_${lon.toFixed(4)}_${Date.now()}`,
        lat,
        lon,
        data,
        pinnedAt: Date.now(),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Point weather fetch failed';
      useWeatherInspectStore.getState().setError(message);
    } finally {
      useWeatherInspectStore.getState().setFetching(false);
    }
  }
}

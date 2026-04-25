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
import {
  TRANSITION_ALTITUDE_M,
  useWeatherInspectStore,
  type PinnedPoint,
} from '../core/store/useWeatherInspectStore';

const DEBOUNCE_MS = 400;
const JITTER_DEGREES = 0.05;

export class WeatherInspectorRenderer implements IRenderer {
  private viewer: CesiumViewer | null = null;
  private handler: ScreenSpaceEventHandler | null = null;
  private cameraListener: (() => void) | null = null;
  private fetchTimer: number | null = null;
  private inFlightController: AbortController | null = null;

  attach(viewer: CesiumViewer): void {
    this.viewer = viewer;
    this.handler = new ScreenSpaceEventHandler(viewer.canvas);

    this.handler.setInputAction((event: { position: Cartesian2 }) => {
      void this.handleClick(event.position);
    }, ScreenSpaceEventType.LEFT_CLICK);

    this.cameraListener = () => this.handleCameraChange();
    viewer.camera.changed.addEventListener(this.cameraListener);
    this.handleCameraChange();
  }

  detach(): void {
    if (this.viewer && this.cameraListener) {
      this.viewer.camera.changed.removeEventListener(this.cameraListener);
    }
    this.cameraListener = null;

    if (this.fetchTimer !== null) {
      window.clearTimeout(this.fetchTimer);
      this.fetchTimer = null;
    }
    this.inFlightController?.abort();
    this.inFlightController = null;

    this.handler?.destroy();
    this.handler = null;
    this.viewer = null;
  }

  private handleCameraChange(): void {
    const viewer = this.viewer;
    if (!viewer || viewer.isDestroyed()) return;

    const altitude = viewer.camera.positionCartographic.height;
    if (!Number.isFinite(altitude)) return;

    const store = useWeatherInspectStore.getState();
    store.setCameraAltitude(altitude);

    if (altitude > TRANSITION_ALTITUDE_M) {
      store.setCursorPoint(null);
      if (this.fetchTimer !== null) {
        window.clearTimeout(this.fetchTimer);
        this.fetchTimer = null;
      }
      this.inFlightController?.abort();
      this.inFlightController = null;
      return;
    }

    if (this.fetchTimer !== null) {
      window.clearTimeout(this.fetchTimer);
    }
    this.fetchTimer = window.setTimeout(() => {
      this.fetchTimer = null;
      void this.sampleCenter();
    }, DEBOUNCE_MS);
  }

  private async sampleCenter(): Promise<void> {
    const viewer = this.viewer;
    if (!viewer || viewer.isDestroyed()) return;

    const canvas = viewer.canvas;
    const center = new Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 2);
    const ray = viewer.camera.getPickRay(center);
    if (!ray) return;
    const cartesian = viewer.scene.globe.pick(ray, viewer.scene);
    if (!cartesian) return;

    const cartographic = Cartographic.fromCartesian(cartesian);
    const lat = CesiumMath.toDegrees(cartographic.latitude);
    const lon = CesiumMath.toDegrees(cartographic.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;

    const last = useWeatherInspectStore.getState().cursorPoint;
    if (
      last &&
      Math.abs(lat - last.lat) < JITTER_DEGREES &&
      Math.abs(lon - last.lon) < JITTER_DEGREES
    ) {
      return;
    }

    this.inFlightController?.abort();
    this.inFlightController = new AbortController();

    try {
      const data = await fetchPointWeather(lat, lon);
      const cursorPoint: PinnedPoint = {
        id: 'cursor',
        lat,
        lon,
        data,
        pinnedAt: Date.now(),
      };
      const altitudeNow = viewer.isDestroyed()
        ? Number.POSITIVE_INFINITY
        : viewer.camera.positionCartographic.height;
      if (altitudeNow > TRANSITION_ALTITUDE_M) return;
      useWeatherInspectStore.getState().setCursorPoint(cursorPoint);
    } catch {
      /* silent — next sweep retries */
    }
  }

  private async handleClick(screenPos: Cartesian2): Promise<void> {
    const viewer = this.viewer;
    if (!viewer || viewer.isDestroyed()) return;

    const picked = viewer.scene.pick(screenPos);
    if (picked) return;

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

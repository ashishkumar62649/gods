import {
  UrlTemplateImageryProvider,
  type ImageryLayer,
  type Viewer as CesiumViewer,
} from 'cesium';
import type { IRenderer } from './IRenderer';
import { EXTERNAL_FEEDS } from '../core/config/endpoints';
import { OPACITY } from '../core/config/theme';
import {
  type ClimateState,
  useClimateStore,
} from '../core/store/useClimateStore';

export class WeatherRenderer implements IRenderer {
  private viewer: CesiumViewer | null = null;
  private unsubscribe: (() => void) | null = null;
  private precipitationLayer: ImageryLayer | null = null;
  private precipitationTimestamp: number | null = null;

  attach(viewer: CesiumViewer): void {
    this.viewer = viewer;
    this.unsubscribe = useClimateStore.subscribe((state) => {
      this.renderWeather(state);
    });
    this.renderWeather(useClimateStore.getState());
  }

  detach(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.removePrecipitationLayer();
    this.viewer = null;
  }

  private renderWeather(state: ClimateState): void {
    if (!this.viewer || this.viewer.isDestroyed()) {
      return;
    }

    this.viewer.scene.fog.enabled = state.activeLayers.fog;

    if (this.viewer.scene.skyAtmosphere) {
      this.viewer.scene.skyAtmosphere.show = state.activeLayers.clouds;
    }

    this.viewer.scene.globe.enableLighting = state.activeLayers.lighting;

    if (state.dataSource === 'FALLBACK' && state.activeLayers.precipitation) {
      this.ensurePrecipitationLayer(state.lastSync);
    } else {
      this.removePrecipitationLayer();
    }

    this.viewer.scene.requestRender();
  }

  private ensurePrecipitationLayer(timestamp: number | null): void {
    if (!this.viewer || this.viewer.isDestroyed()) {
      return;
    }

    const resolvedTimestamp = timestamp ?? Math.floor(Date.now() / 1000);
    if (
      this.precipitationLayer &&
      this.precipitationTimestamp === resolvedTimestamp
    ) {
      return;
    }

    this.removePrecipitationLayer();

    const provider = new UrlTemplateImageryProvider({
      url: EXTERNAL_FEEDS.RAINVIEWER_TILE_TEMPLATE.replace(
        '{timestamp}',
        String(resolvedTimestamp),
      ),
      enablePickFeatures: false,
      minimumLevel: 0,
      maximumLevel: 20,
    });
    const layer = this.viewer.imageryLayers.addImageryProvider(provider);
    layer.alpha = OPACITY.WEATHER_RASTER_BASE;
    layer.show = true;

    this.precipitationLayer = layer;
    this.precipitationTimestamp = resolvedTimestamp;
  }

  private removePrecipitationLayer(): void {
    if (!this.viewer || !this.precipitationLayer || this.viewer.isDestroyed()) {
      this.precipitationLayer = null;
      this.precipitationTimestamp = null;
      return;
    }

    this.viewer.imageryLayers.remove(this.precipitationLayer, true);
    this.precipitationLayer = null;
    this.precipitationTimestamp = null;
  }
}

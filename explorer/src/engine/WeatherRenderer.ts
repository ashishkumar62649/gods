import {
  UrlTemplateImageryProvider,
  type ImageryLayer,
  type Viewer as CesiumViewer,
} from 'cesium';
import type { IRenderer } from './IRenderer';
import { OPACITY } from '../core/config/theme';
import {
  type ClimateState,
  useClimateStore,
} from '../core/store/useClimateStore';

type TileLayerId = 'precipitation' | 'temperature' | 'clouds' | 'wind' | 'pressure';

const TILE_LAYER_IDS: TileLayerId[] = [
  'precipitation',
  'temperature',
  'clouds',
  'wind',
  'pressure',
];

interface ActiveLayer {
  layer: ImageryLayer;
  url: string;
}

export class WeatherRenderer implements IRenderer {
  private viewer: CesiumViewer | null = null;
  private unsubscribe: (() => void) | null = null;
  private tileLayers: Partial<Record<TileLayerId, ActiveLayer>> = {};

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
    for (const id of TILE_LAYER_IDS) {
      this.removeTileLayer(id);
    }
    this.viewer = null;
  }

  private renderWeather(state: ClimateState): void {
    if (!this.viewer || this.viewer.isDestroyed()) {
      return;
    }

    this.viewer.scene.fog.enabled = state.activeLayers.fog;
    this.viewer.scene.globe.enableLighting = state.activeLayers.lighting;

    for (const id of TILE_LAYER_IDS) {
      const enabled = state.activeLayers[id];
      const url = state.tileUrls[id];

      if (enabled && url) {
        this.ensureTileLayer(id, url);
      } else {
        this.removeTileLayer(id);
      }
    }

    this.viewer.scene.requestRender();
  }

  private ensureTileLayer(id: TileLayerId, url: string): void {
    if (!this.viewer || this.viewer.isDestroyed()) {
      return;
    }

    const existing = this.tileLayers[id];
    if (existing && existing.url === url) {
      return;
    }

    if (existing) {
      this.removeTileLayer(id);
    }

    const provider = new UrlTemplateImageryProvider({
      url,
      enablePickFeatures: false,
      minimumLevel: 0,
      maximumLevel: 20,
    });
    const layer = this.viewer.imageryLayers.addImageryProvider(provider);
    layer.alpha = OPACITY.WEATHER_RASTER_BASE;
    layer.show = true;

    this.tileLayers[id] = { layer, url };
  }

  private removeTileLayer(id: TileLayerId): void {
    const existing = this.tileLayers[id];
    if (!existing) {
      return;
    }

    if (this.viewer && !this.viewer.isDestroyed()) {
      this.viewer.imageryLayers.remove(existing.layer, true);
    }
    delete this.tileLayers[id];
  }
}

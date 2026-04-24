import {
  UrlTemplateImageryProvider,
  Viewer as CesiumViewer,
  type ImageryLayer,
} from 'cesium';
import type { ClimateStateSnapshot, WeatherLayerId, WeatherToggleState } from './weather';
import { WEATHER_NATIVE_PREFIX } from './weather';

const WEATHER_ALPHA = 0.6;
const WEATHER_LAYER_ORDER: WeatherLayerId[] = [
  'precipitation',
  'temperature',
  'clouds',
  'wind',
  'pressure',
];

export class WeatherLayerManager {
  private readonly viewer: CesiumViewer;
  private readonly layers = new Map<WeatherLayerId, ImageryLayer>();
  private readonly layerUrls = new Map<WeatherLayerId, string>();
  private readonly baselineEnvironment: {
    fogEnabled: boolean;
    fogDensity: number;
    fogMinimumBrightness: number;
    lightingEnabled: boolean;
    skyAtmosphereVisible: boolean;
  };
  private climateState: ClimateStateSnapshot | null = null;
  private toggles: WeatherToggleState = {
    precipitation: false,
    temperature: false,
    clouds: false,
    wind: false,
    pressure: false,
  };

  constructor(viewer: CesiumViewer) {
    this.viewer = viewer;
    this.baselineEnvironment = {
      fogEnabled: viewer.scene.fog.enabled,
      fogDensity: viewer.scene.fog.density,
      fogMinimumBrightness: viewer.scene.fog.minimumBrightness,
      lightingEnabled: viewer.scene.globe.enableLighting,
      skyAtmosphereVisible: viewer.scene.skyAtmosphere?.show ?? false,
    };
  }

  destroy() {
    for (const layer of this.layers.values()) {
      this.viewer.imageryLayers.remove(layer, true);
    }

    this.layers.clear();
    this.layerUrls.clear();
    this.restoreNativeEnvironment();
    this.viewer.scene.requestRender();
  }

  setClimateState(nextState: ClimateStateSnapshot | null) {
    this.climateState = nextState;
    this.updateWeatherLayers(this.toggles);
  }

  updateWeatherLayers(nextToggles: WeatherToggleState) {
    this.toggles = nextToggles;

    for (const layerId of WEATHER_LAYER_ORDER) {
      const url = this.getLayerUrl(layerId);
      const layerEnabled = Boolean(nextToggles[layerId]);
      const usesNativeFallback = isNativeWeatherUrl(url);

      if (!layerEnabled || !url || usesNativeFallback) {
        this.removeImageryLayer(layerId);
        continue;
      }

      this.ensureImageryLayer(layerId, url);
      const imageryLayer = this.layers.get(layerId);
      if (imageryLayer) {
        imageryLayer.show = true;
        imageryLayer.alpha = WEATHER_ALPHA;
      }
    }

    this.updateNativeEnvironment();
    this.viewer.scene.requestRender();
  }

  private ensureImageryLayer(layerId: WeatherLayerId, url: string) {
    const currentLayer = this.layers.get(layerId);
    const currentUrl = this.layerUrls.get(layerId);
    if (currentLayer && currentUrl === url) {
      return;
    }

    this.removeImageryLayer(layerId);

    const provider = new UrlTemplateImageryProvider({
      url,
      minimumLevel: 0,
      maximumLevel: 20,
      enablePickFeatures: false,
    });
    const insertionIndex = this.getInsertionIndex(layerId);
    const layer = this.viewer.imageryLayers.addImageryProvider(provider, insertionIndex);
    layer.alpha = WEATHER_ALPHA;
    layer.show = true;
    this.layers.set(layerId, layer);
    this.layerUrls.set(layerId, url);
  }

  private removeImageryLayer(layerId: WeatherLayerId) {
    const existing = this.layers.get(layerId);
    if (!existing) {
      return;
    }

    this.viewer.imageryLayers.remove(existing, true);
    this.layers.delete(layerId);
    this.layerUrls.delete(layerId);
  }

  private getInsertionIndex(layerId: WeatherLayerId) {
    const desiredOffset = WEATHER_LAYER_ORDER.indexOf(layerId);
    const existingBefore = WEATHER_LAYER_ORDER.slice(0, desiredOffset).filter((candidateId) =>
      this.layers.has(candidateId),
    ).length;
    const baseOffset = this.viewer.imageryLayers.length > 0 ? 1 : 0;
    return Math.min(baseOffset + existingBefore, this.viewer.imageryLayers.length);
  }

  private updateNativeEnvironment() {
    const nativeClimateActive =
      (this.toggles.temperature && isNativeWeatherUrl(this.getLayerUrl('temperature'))) ||
      (this.toggles.pressure && isNativeWeatherUrl(this.getLayerUrl('pressure'))) ||
      (this.toggles.clouds && isNativeWeatherUrl(this.getLayerUrl('clouds'))) ||
      (this.toggles.wind && isNativeWeatherUrl(this.getLayerUrl('wind')));

    if (!nativeClimateActive) {
      this.restoreNativeEnvironment();
      return;
    }

    if (this.viewer.scene.skyAtmosphere) {
      this.viewer.scene.skyAtmosphere.show = true;
    }
    this.viewer.scene.fog.enabled = true;
    this.viewer.scene.fog.density = 0.00022;
    this.viewer.scene.fog.minimumBrightness = 0.08;
    this.viewer.scene.globe.enableLighting = true;
  }

  private restoreNativeEnvironment() {
    if (this.viewer.scene.skyAtmosphere) {
      this.viewer.scene.skyAtmosphere.show = this.baselineEnvironment.skyAtmosphereVisible;
    }
    this.viewer.scene.fog.enabled = this.baselineEnvironment.fogEnabled;
    this.viewer.scene.fog.density = this.baselineEnvironment.fogDensity;
    this.viewer.scene.fog.minimumBrightness =
      this.baselineEnvironment.fogMinimumBrightness;
    this.viewer.scene.globe.enableLighting = this.baselineEnvironment.lightingEnabled;
  }

  private getLayerUrl(layerId: WeatherLayerId) {
    if (!this.climateState) {
      return null;
    }

    switch (layerId) {
      case 'precipitation':
        return this.climateState.precipitationUrl;
      case 'temperature':
        return this.climateState.temperatureUrl;
      case 'clouds':
        return this.climateState.cloudsUrl;
      case 'wind':
        return this.climateState.windUrl;
      case 'pressure':
        return this.climateState.pressureUrl;
      default:
        return null;
    }
  }
}

function isNativeWeatherUrl(url: string | null) {
  return url != null && url.startsWith(WEATHER_NATIVE_PREFIX);
}

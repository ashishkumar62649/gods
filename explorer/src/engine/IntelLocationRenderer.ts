import {
  Cartesian2,
  Cartesian3,
  Color,
  CustomDataSource,
  DistanceDisplayCondition,
  HeightReference,
  LabelStyle,
  NearFarScalar,
  VerticalOrigin,
  type Viewer as CesiumViewer,
} from 'cesium';
import type { IRenderer } from './IRenderer';
import type {
  AirQualityIntelPoint,
  HydrologyIntelPoint,
  IntelPointRecord,
  WeatherIntelPoint,
} from '../core/types/intel';
import { type IntelLayerState, type IntelState, useIntelStore } from '../core/store/useIntelStore';

type PointLayerKey = Exclude<keyof IntelLayerState, 'hazards'>;

const LAYER_ORDER: PointLayerKey[] = ['weather', 'airQuality', 'hydrology'];

export class IntelLocationRenderer implements IRenderer {
  private viewer: CesiumViewer | null = null;
  private dataSources = new Map<PointLayerKey, CustomDataSource>();
  private unsubscribe: (() => void) | null = null;
  private lastRecords = new Map<PointLayerKey, readonly IntelPointRecord[] | null>();
  private lastVisible = new Map<PointLayerKey, boolean | null>();

  attach(viewer: CesiumViewer): void {
    this.viewer = viewer;
    for (const layer of LAYER_ORDER) {
      const source = new CustomDataSource(`weather-intel-${layer}`);
      this.dataSources.set(layer, source);
      this.lastRecords.set(layer, null);
      this.lastVisible.set(layer, null);
      void viewer.dataSources.add(source);
    }

    this.unsubscribe = useIntelStore.subscribe((state) => {
      this.renderIntelPoints(state);
    });
    this.renderIntelPoints(useIntelStore.getState());
  }

  detach(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;

    if (this.viewer && !this.viewer.isDestroyed()) {
      for (const source of this.dataSources.values()) {
        void this.viewer.dataSources.remove(source, true);
      }
    }

    this.viewer = null;
    this.dataSources.clear();
    this.lastRecords.clear();
    this.lastVisible.clear();
  }

  private renderIntelPoints(state: IntelState): void {
    if (!this.viewer || this.viewer.isDestroyed()) return;

    this.syncLayer('weather', state.activeLayers.weather, state.weather);
    this.syncLayer('airQuality', state.activeLayers.airQuality, state.airQuality);
    this.syncLayer('hydrology', state.activeLayers.hydrology, state.hydrology);
    this.viewer.scene.requestRender();
  }

  private syncLayer(
    layer: PointLayerKey,
    visible: boolean,
    records: readonly IntelPointRecord[],
  ) {
    const source = this.dataSources.get(layer);
    if (!source) return;

    if (visible !== this.lastVisible.get(layer)) {
      this.lastVisible.set(layer, visible);
      source.show = visible;
      if (visible) this.lastRecords.set(layer, null);
    }

    if (!visible || records === this.lastRecords.get(layer)) return;

    this.lastRecords.set(layer, records);
    source.entities.removeAll();

    records
      .filter(hasValidPosition)
      .forEach((record, index) => {
        const style = styleForRecord(layer, record);
        source.entities.add({
          id: `${layer}:${record.id}`,
          name: buildPointTitle(layer, record),
          position: Cartesian3.fromDegrees(record.longitude, record.latitude, style.height),
          point: {
            pixelSize: style.pixelSize,
            color: style.color,
            outlineColor: Color.BLACK.withAlpha(0.72),
            outlineWidth: 1,
            heightReference: HeightReference.CLAMP_TO_GROUND,
            scaleByDistance: new NearFarScalar(160_000, 1.15, 6_500_000, 0.38),
            disableDepthTestDistance: 750_000,
          },
          label: index < style.maxLabels
            ? {
                text: buildPointLabel(record),
                font: '600 11px Segoe UI, sans-serif',
                fillColor: Color.WHITE,
                outlineColor: Color.BLACK.withAlpha(0.82),
                outlineWidth: 3,
                style: LabelStyle.FILL_AND_OUTLINE,
                pixelOffset: new Cartesian2(0, -18),
                verticalOrigin: VerticalOrigin.BOTTOM,
                showBackground: true,
                backgroundColor: Color.BLACK.withAlpha(0.42),
                backgroundPadding: new Cartesian2(5, 3),
                distanceDisplayCondition: new DistanceDisplayCondition(0, style.labelDistance),
                disableDepthTestDistance: 750_000,
              }
            : undefined,
          properties: {
            kind: `weather-intel-${layer}`,
            sourceId: record.sourceId,
            parameterId: record.parameterId,
            rawFilePath: record.sourceLineage?.rawFilePath ?? null,
          },
        });
      });
  }
}

function hasValidPosition(record: IntelPointRecord) {
  return (
    Number.isFinite(record.latitude) &&
    Number.isFinite(record.longitude) &&
    Math.abs(record.latitude) <= 90 &&
    Math.abs(record.longitude) <= 180
  );
}

function styleForRecord(layer: PointLayerKey, record: IntelPointRecord) {
  if (layer === 'weather') {
    return {
      color: colorForWeather(record as WeatherIntelPoint),
      pixelSize: 6,
      height: 45,
      maxLabels: 18,
      labelDistance: 1_500_000,
    };
  }

  if (layer === 'airQuality') {
    return {
      color: colorForAirQuality(record as AirQualityIntelPoint),
      pixelSize: 7,
      height: 55,
      maxLabels: 24,
      labelDistance: 1_900_000,
    };
  }

  return {
    color: Color.fromCssColorString('#2dd4bf'),
    pixelSize: 10,
    height: 65,
    maxLabels: 12,
    labelDistance: 2_400_000,
  };
}

function colorForWeather(record: WeatherIntelPoint) {
  const parameter = record.parameterId.toLowerCase();
  if (parameter.includes('temperature')) return Color.fromCssColorString('#fb7185');
  if (parameter.includes('humidity') || parameter.includes('dew')) return Color.fromCssColorString('#67e8f9');
  if (parameter.includes('pressure')) return Color.fromCssColorString('#a78bfa');
  if (parameter.includes('wind')) return Color.fromCssColorString('#fde047');
  if (parameter.includes('precip') || parameter.includes('rain') || parameter.includes('snow')) {
    return Color.fromCssColorString('#60a5fa');
  }
  return Color.fromCssColorString('#e2e8f0');
}

function colorForAirQuality(record: AirQualityIntelPoint) {
  const value = record.value ?? 0;
  if (value <= 12) return Color.fromCssColorString('#22c55e');
  if (value <= 35) return Color.fromCssColorString('#facc15');
  if (value <= 55) return Color.fromCssColorString('#fb923c');
  return Color.fromCssColorString('#ef4444');
}

function buildPointTitle(layer: PointLayerKey, record: IntelPointRecord) {
  if (layer === 'hydrology') {
    return `${record.displayName} at ${(record as HydrologyIntelPoint).stationId ?? record.sourceName}`;
  }
  return `${record.displayName} from ${record.sourceName}`;
}

function buildPointLabel(record: IntelPointRecord) {
  const value = record.value == null ? 'n/a' : formatValue(record.value);
  return `${record.displayName}: ${value}${record.unit ? ` ${record.unit}` : ''}`;
}

function formatValue(value: number) {
  if (Math.abs(value) >= 100) return value.toFixed(0);
  if (Math.abs(value) >= 10) return value.toFixed(1);
  return value.toFixed(2);
}

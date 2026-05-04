import {
  Cartesian2,
  Cartesian3,
  Color,
  Entity,
  HorizontalOrigin,
  LabelStyle,
  PolylineGlowMaterialProperty,
  VerticalOrigin,
  type Viewer as CesiumViewer,
} from 'cesium';
import type { IRenderer } from './IRenderer';
import {
  fetchApiJson,
  pointId,
  pointLabel,
  pointLat,
  pointLon,
  type ApiPointRecord,
  type InfrastructureCable,
} from '../core/api/intelApi';
import { useLayerStore } from '../store/layerStore';
import { useTimelineStore } from '../store/timelineStore';

const INTEL_POLL_INTERVAL_MS = 30_000;

export class LiveIntelEntityRenderer implements IRenderer {
  private viewer: CesiumViewer | null = null;
  private entities: Entity[] = [];
  private unsubscribeLayers: (() => void) | null = null;
  private unsubscribeTimeline: (() => void) | null = null;
  private timer = 0;
  private abortController: AbortController | null = null;

  attach(viewer: CesiumViewer): void {
    this.viewer = viewer;
    this.unsubscribeLayers = useLayerStore.subscribe(() => void this.refresh());
    this.unsubscribeTimeline = useTimelineStore.subscribe(() => void this.refresh());
    this.timer = window.setInterval(() => void this.refresh(), INTEL_POLL_INTERVAL_MS);
    void this.refresh();
  }

  detach(): void {
    if (this.timer) {
      window.clearInterval(this.timer);
      this.timer = 0;
    }
    this.abortController?.abort();
    this.abortController = null;
    this.unsubscribeLayers?.();
    this.unsubscribeLayers = null;
    this.unsubscribeTimeline?.();
    this.unsubscribeTimeline = null;
    this.clear();
    this.viewer = null;
  }

  private async refresh() {
    if (!this.viewer || this.viewer.isDestroyed()) return;
    this.abortController?.abort();
    const controller = new AbortController();
    this.abortController = controller;
    const layers = useLayerStore.getState().activeLayers;
    const nextEntities: Entity.ConstructorOptions[] = [];

    await Promise.allSettled([
      this.loadSatellites(nextEntities, layers, controller.signal),
      this.loadWeather(nextEntities, layers, controller.signal),
      this.loadHazards(nextEntities, layers, controller.signal),
      this.loadMaritimeAndInfrastructure(nextEntities, layers, controller.signal),
    ]);

    if (controller.signal.aborted || !this.viewer || this.viewer.isDestroyed()) return;
    this.clear();
    for (const entity of nextEntities) {
      this.entities.push(this.viewer.entities.add(entity));
    }
    this.viewer.scene.requestRender();
    if (this.abortController === controller) this.abortController = null;
  }

  private async loadSatellites(
    target: Entity.ConstructorOptions[],
    layers: Record<string, boolean>,
    signal: AbortSignal,
  ) {
    if (!layers.satellites) return;
    const payload = await fetchApiJson<{ satellites?: ApiPointRecord[] }>(withTimeline('/api/v2/satellites'), signal);
    for (const satellite of payload.satellites?.slice(0, 1200) ?? []) {
      target.push(pointEntity('satellite', satellite, Color.fromCssColorString('#a78bfa'), 16_000));
    }
  }

  private async loadWeather(
    target: Entity.ConstructorOptions[],
    layers: Record<string, boolean>,
    signal: AbortSignal,
  ) {
    const weatherEnabled = layers.temperature || layers.wind10m || layers.humidity2m || layers.radarPrecipitation;
    if (!weatherEnabled) return;
    const payload = await fetchApiJson<{ weather?: ApiPointRecord[] }>(withTimeline('/api/v2/weather/current?limit=350'), signal);
    for (const point of payload.weather ?? []) {
      const parameter = String(point.parameter_id ?? '');
      if (parameter.includes('temperature') && !layers.temperature) continue;
      if (parameter.includes('wind') && !layers.wind10m) continue;
      if (parameter.includes('humidity') && !layers.humidity2m) continue;
      if ((parameter.includes('rain') || parameter.includes('precip')) && !layers.radarPrecipitation) continue;
      target.push(pointEntity('weather', point, weatherColor(parameter), 2200));
    }
  }

  private async loadHazards(
    target: Entity.ConstructorOptions[],
    layers: Record<string, boolean>,
    signal: AbortSignal,
  ) {
    const hazardEnabled =
      layers.hazards ||
      layers.earthquakes ||
      layers.volcanoes ||
      layers.wildfires ||
      layers.storms ||
      layers.hydrology ||
      layers.airQuality;
    if (!hazardEnabled) return;
    const payload = await fetchApiJson<{ hazards?: ApiPointRecord[] }>(withTimeline('/api/v2/hazards?limit=500'), signal);
    for (const hazard of payload.hazards ?? []) {
      const eventType = String(hazard.event_type ?? hazard.parameter_id ?? '').toLowerCase();
      if (eventType.includes('earthquake') && !layers.earthquakes) continue;
      if (eventType.includes('volcano') && !layers.volcanoes) continue;
      if ((eventType.includes('fire') || eventType.includes('firms')) && !layers.wildfires) continue;
      if ((eventType.includes('storm') || eventType.includes('cyclone')) && !layers.storms) continue;
      target.push(pointEntity('hazard', hazard, severityColor(hazard.severity), 3200));
    }
  }

  private async loadMaritimeAndInfrastructure(
    target: Entity.ConstructorOptions[],
    layers: Record<string, boolean>,
    signal: AbortSignal,
  ) {
    if (!(layers.vesselsAis || layers.internetCables || layers.infrastructureAssets)) return;
    const payload = await fetchApiJson<{
      vessels?: ApiPointRecord[];
      ships?: ApiPointRecord[];
      cables?: InfrastructureCable[];
      nodes?: ApiPointRecord[];
    }>(withTimeline('/api/v2/infrastructure'), signal);

    if (layers.vesselsAis) {
      for (const ship of payload.ships ?? payload.vessels ?? []) {
        target.push(pointEntity('ship', ship, Color.fromCssColorString('#38bdf8'), 700));
      }
    }

    if (layers.infrastructureAssets) {
      for (const node of payload.nodes ?? []) {
        target.push(pointEntity('infrastructure', node, Color.fromCssColorString('#f97316'), 900));
      }
    }

    if (layers.internetCables) {
      for (const cable of payload.cables?.slice(0, 180) ?? []) {
        for (const [index, segment] of cable.segments?.entries() ?? []) {
          const positions = segment
            .filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lon))
            .map((point) => Cartesian3.fromDegrees(point.lon, point.lat, 0));
          if (positions.length < 2) continue;
          target.push({
            id: `cable-${cable.asset_id ?? cable.cable_id ?? cable.name}-${index}`,
            polyline: {
              positions,
              width: 2.5,
              material: new PolylineGlowMaterialProperty({
                glowPower: 0.14,
                color: Color.fromCssColorString('#22d3ee').withAlpha(0.78),
              }),
            },
          });
        }
      }
    }
  }

  private clear(): void {
    if (!this.viewer || this.viewer.isDestroyed()) return;
    for (const entity of this.entities) {
      this.viewer.entities.remove(entity);
    }
    this.entities = [];
  }
}

function withTimeline(path: string) {
  const timeline = useTimelineStore.getState();
  if (timeline.mode === 'live') return path;
  const separator = path.includes('?') ? '&' : '?';
  return `${path}${separator}time=${encodeURIComponent(new Date(timeline.currentTimeMs).toISOString())}&timeMode=${timeline.mode}`;
}

function pointEntity(
  prefix: string,
  record: ApiPointRecord,
  color: Color,
  altitudeMeters: number,
): Entity.ConstructorOptions {
  const latitude = pointLat(record);
  const longitude = pointLon(record);
  const label = pointLabel(record);
  return {
    id: `${prefix}-${pointId(prefix, record)}`,
    position: Cartesian3.fromDegrees(longitude, latitude, altitudeMeters),
    point: {
      pixelSize: prefix === 'satellite' ? 7 : 9,
      color: color.withAlpha(0.92),
      outlineColor: Color.WHITE.withAlpha(0.72),
      outlineWidth: 1.5,
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
    },
    label: {
      text: label,
      font: '600 12px "Segoe UI", sans-serif',
      fillColor: Color.WHITE,
      outlineColor: Color.BLACK,
      outlineWidth: 2,
      style: LabelStyle.FILL_AND_OUTLINE,
      showBackground: true,
      backgroundColor: Color.fromCssColorString('#07111f').withAlpha(0.72),
      backgroundPadding: new Cartesian2(7, 4),
      pixelOffset: new Cartesian2(0, -20),
      verticalOrigin: VerticalOrigin.BOTTOM,
      horizontalOrigin: HorizontalOrigin.CENTER,
      distanceDisplayCondition: undefined,
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
    },
  };
}

function weatherColor(parameter: string) {
  if (parameter.includes('wind')) return Color.fromCssColorString('#60a5fa');
  if (parameter.includes('humidity')) return Color.fromCssColorString('#2dd4bf');
  if (parameter.includes('rain') || parameter.includes('precip')) return Color.fromCssColorString('#38bdf8');
  return Color.fromCssColorString('#f59e0b');
}

function severityColor(severity: unknown) {
  switch (String(severity ?? '').toLowerCase()) {
    case 'extreme':
    case 'critical':
    case 'high':
      return Color.fromCssColorString('#ef4444');
    case 'moderate':
    case 'medium':
      return Color.fromCssColorString('#f97316');
    case 'minor':
    case 'low':
      return Color.fromCssColorString('#eab308');
    default:
      return Color.fromCssColorString('#fb7185');
  }
}

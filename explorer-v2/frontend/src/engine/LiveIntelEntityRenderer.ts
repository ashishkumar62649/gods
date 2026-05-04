import {
  Cartesian2,
  Cartesian3,
  Color,
  DistanceDisplayCondition,
  Entity,
  HeightReference,
  HorizontalOrigin,
  JulianDate,
  LabelStyle,
  PolylineGlowMaterialProperty,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  VerticalOrigin,
  type Viewer as CesiumViewer,
} from 'cesium';
import type { IRenderer } from './IRenderer';
import {
  fetchApiBinary,
  fetchApiJson,
  pointId,
  pointLabel,
  pointLat,
  pointLon,
  type ApiPointRecord,
  type InfrastructureCable,
} from '../core/api/intelApi';
import { decodeMaritimeLiveBinary, decodeSatelliteLiveBinary } from '../core/api/liveBinary';
import { useLayerStore } from '../store/layerStore';
import { useSelectionStore } from '../store/selectionStore';
import { useTimelineStore } from '../store/timelineStore';

const INTEL_POLL_INTERVAL_MS = 30_000;
const SHIP_SURFACE_HEIGHT_M = 0;
const CABLE_SURFACE_HEIGHT_M = 0;
const WEATHER_SURFACE_HEIGHT_M = 0;
const HAZARD_SURFACE_HEIGHT_M = 0;

export class LiveIntelEntityRenderer implements IRenderer {
  private viewer: CesiumViewer | null = null;
  private entities: Entity[] = [];
  private handler: ScreenSpaceEventHandler | null = null;
  private unsubscribeLayers: (() => void) | null = null;
  private unsubscribeTimeline: (() => void) | null = null;
  private timer = 0;
  private abortController: AbortController | null = null;
  private timelineRefreshKey = timelineRequestKey();

  attach(viewer: CesiumViewer): void {
    this.viewer = viewer;
    this.handler = new ScreenSpaceEventHandler(viewer.scene.canvas);
    this.handler.setInputAction((movement: { position: Cartesian2 }) => {
      this.pickIntelEntity(movement.position);
    }, ScreenSpaceEventType.LEFT_CLICK);
    this.unsubscribeLayers = useLayerStore.subscribe(() => void this.refresh());
    this.unsubscribeTimeline = useTimelineStore.subscribe(() => {
      const nextKey = timelineRequestKey();
      if (nextKey === this.timelineRefreshKey) return;
      this.timelineRefreshKey = nextKey;
      void this.refresh();
    });
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
    this.handler?.destroy();
    this.handler = null;
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
    const mode = useLayerStore.getState().satelliteSceneMode;
    const live = useTimelineStore.getState().mode === 'live';
    const satellites = live
      ? decodeSatelliteLiveBinary(await fetchApiBinary('/api/v2/satellites/live.bin', signal))
      : (await fetchApiJson<{ satellites?: ApiPointRecord[] }>(
          withTimeline('/api/v2/satellites?limit=2500'),
          signal,
        )).satellites ?? [];
    const visibleSatellites = satellites
      .filter((satellite) => isRecordOnNearSide(this.viewer, satellite, 0.16))
      .slice(0, mode === 'points' ? 650 : 520);
    const alpha = layerAlpha('satellites');

    for (const satellite of visibleSatellites) {
      target.push(pointEntity('satellite', satellite, Color.fromCssColorString('#a78bfa'), {
        altitudeMeters: satelliteHeightMeters(satellite),
        alpha: Math.min(alpha, 0.74),
        labelVisible: false,
        labelMaxDistance: 1_500_000,
        pixelSize: 5.2,
      }));
    }

    if (mode === 'orbit-trails' || mode === 'sensor-focus') {
      for (const satellite of visibleSatellites.slice(0, mode === 'sensor-focus' ? 90 : 180)) {
        const positions = approximateSatelliteTrail(satellite);
        if (positions.length >= 2) {
          target.push({
            id: `satellite-trail-${pointId('satellite', satellite)}`,
            polyline: {
              positions,
              width: mode === 'sensor-focus' ? 1.4 : 1.8,
              material: new PolylineGlowMaterialProperty({
                glowPower: 0.12,
                color: Color.fromCssColorString('#a78bfa').withAlpha(0.42 * alpha),
              }),
            },
          });
        }

        if (mode === 'sensor-focus') {
          target.push(sensorFootprintEntity(satellite, alpha));
        }
      }
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
      if (!isRecordOnNearSide(this.viewer, point, 0.05)) continue;
      const parameter = String(point.parameter_id ?? '');
      if (parameter.includes('temperature') && !layers.temperature) continue;
      if (parameter.includes('wind') && !layers.wind10m) continue;
      if (parameter.includes('humidity') && !layers.humidity2m) continue;
      if ((parameter.includes('rain') || parameter.includes('precip')) && !layers.radarPrecipitation) continue;
      target.push(pointEntity('weather', point, weatherColor(parameter), {
        altitudeMeters: WEATHER_SURFACE_HEIGHT_M,
        alpha: layerAlphaForWeather(parameter),
        labelVisible: false,
        pixelSize: 7.5,
        clampToSurface: true,
      }));
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
      if (!isRecordOnNearSide(this.viewer, hazard, 0.05)) continue;
      const eventType = String(hazard.event_type ?? hazard.parameter_id ?? '').toLowerCase();
      if (eventType.includes('earthquake') && !layers.earthquakes) continue;
      if (eventType.includes('volcano') && !layers.volcanoes) continue;
      if ((eventType.includes('fire') || eventType.includes('firms')) && !layers.wildfires) continue;
      if ((eventType.includes('storm') || eventType.includes('cyclone')) && !layers.storms) continue;
      target.push(pointEntity('hazard', hazard, severityColor(hazard.severity), {
        altitudeMeters: HAZARD_SURFACE_HEIGHT_M,
        alpha: layerAlpha('hazards'),
        labelVisible: true,
        labelMaxDistance: 2_500_000,
        pixelSize: 9,
        clampToSurface: true,
      }));
    }
  }

  private async loadMaritimeAndInfrastructure(
    target: Entity.ConstructorOptions[],
    layers: Record<string, boolean>,
    signal: AbortSignal,
  ) {
    if (!(layers.vesselsAis || layers.internetCables || layers.infrastructureAssets)) return;
    const mode = useLayerStore.getState().maritimeSceneMode;
    const live = useTimelineStore.getState().mode === 'live';
    const needsInfrastructureJson =
      layers.internetCables ||
      layers.infrastructureAssets ||
      !live ||
      mode !== 'traffic';
    const payload = needsInfrastructureJson ? await fetchApiJson<{
      vessels?: ApiPointRecord[];
      ships?: ApiPointRecord[];
      cables?: InfrastructureCable[];
      nodes?: ApiPointRecord[];
    }>(withTimeline('/api/v2/infrastructure'), signal) : null;

    if (layers.vesselsAis) {
      const ships = live && mode === 'traffic'
        ? decodeMaritimeLiveBinary(await fetchApiBinary('/api/v2/maritime/live.bin', signal))
        : payload?.ships ?? payload?.vessels ?? [];

      for (const ship of prioritizedShips(ships, mode).filter((record) => isRecordOnNearSide(this.viewer, record, 0.05))) {
        const risk = isRiskShip(ship);
        target.push(pointEntity('ship', ship, risk ? Color.fromCssColorString('#f59e0b') : Color.fromCssColorString('#38bdf8'), {
          altitudeMeters: SHIP_SURFACE_HEIGHT_M,
          alpha: risk ? 0.96 : 0.76 * layerAlpha('vesselsAis'),
          labelVisible: risk,
          labelMaxDistance: risk ? 2_600_000 : 750_000,
          pixelSize: risk ? 10.5 : 7.5,
          clampToSurface: true,
        }));
        if (mode !== 'traffic') {
          addShipTrail(target, ship, risk);
        }
      }
    }

    if (layers.infrastructureAssets) {
      for (const node of payload?.nodes ?? []) {
        if (!isRecordOnNearSide(this.viewer, node, 0.05)) continue;
        target.push(pointEntity('infrastructure', node, Color.fromCssColorString('#f97316'), {
          altitudeMeters: 900,
          alpha: layerAlpha('infrastructureAssets'),
          labelVisible: true,
          labelMaxDistance: 1_800_000,
          pixelSize: 8.5,
          clampToSurface: true,
        }));
      }
    }

    if (layers.internetCables) {
      const cableAlpha = layerAlpha('internetCables');
      for (const cable of payload?.cables?.slice(0, mode === 'cable-risk' ? 260 : 180) ?? []) {
        for (const [index, segment] of cable.segments?.entries() ?? []) {
          const positions = segment
            .filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lon))
            .map((point) => Cartesian3.fromDegrees(point.lon, point.lat, CABLE_SURFACE_HEIGHT_M));
          if (positions.length < 2) continue;
          target.push({
            id: `cable-${cable.asset_id ?? cable.cable_id ?? cable.name}-${index}`,
            polyline: {
              positions,
              width: mode === 'cable-risk' ? 3.2 : 2.5,
              clampToGround: true,
              material: new PolylineGlowMaterialProperty({
                glowPower: 0.14,
                color: Color.fromCssColorString('#22d3ee').withAlpha(0.78 * cableAlpha),
              }),
            },
          });
        }
      }
    }
  }

  private pickIntelEntity(windowPosition: Cartesian2): void {
    if (!this.viewer || this.viewer.isDestroyed()) return;
    const picked = this.viewer.scene.pick(windowPosition);
    const entity = picked && typeof picked === 'object' && 'id' in picked && picked.id instanceof Entity
      ? picked.id
      : null;
    if (!entity?.properties) return;

    const metadata = entity.properties.getValue(JulianDate.now()) as {
      godEyesKind?: string;
      godEyesRecord?: ApiPointRecord;
    } | undefined;
    if (!metadata?.godEyesRecord) return;

    const id = pointId(metadata.godEyesKind ?? 'asset', metadata.godEyesRecord);
    const selection = useSelectionStore.getState();
    if (metadata.godEyesKind === 'ship') {
      selection.selectAsset(id, 'maritime', metadata.godEyesRecord as Record<string, unknown>);
    } else if (metadata.godEyesKind === 'satellite') {
      selection.selectAsset(id, 'satellite', metadata.godEyesRecord as Record<string, unknown>);
    } else {
      selection.selectAsset(id, 'infrastructure', metadata.godEyesRecord as Record<string, unknown>);
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

function timelineRequestKey() {
  const timeline = useTimelineStore.getState();
  if (timeline.mode === 'live') return 'live';
  return `${timeline.mode}:${Math.floor(timeline.currentTimeMs / 60_000)}`;
}

function pointEntity(
  prefix: string,
  record: ApiPointRecord,
  color: Color,
  options: {
    altitudeMeters: number;
    alpha?: number;
    labelVisible?: boolean;
    labelMaxDistance?: number;
    pixelSize?: number;
    clampToSurface?: boolean;
  },
): Entity.ConstructorOptions {
  const latitude = pointLat(record);
  const longitude = pointLon(record);
  const label = pointLabel(record);
  const alpha = options.alpha ?? 0.92;
  const labelVisible = Boolean(options.labelVisible);
  const labelMaxDistance = options.labelMaxDistance ?? 1_800_000;
  return {
    id: `${prefix}-${pointId(prefix, record)}`,
    properties: {
      godEyesKind: prefix,
      godEyesRecord: record,
    },
    position: Cartesian3.fromDegrees(longitude, latitude, options.altitudeMeters),
    point: {
      pixelSize: options.pixelSize ?? (prefix === 'satellite' ? 7 : 9),
      color: color.withAlpha(alpha),
      outlineColor: Color.WHITE.withAlpha(0.62 * alpha),
      outlineWidth: 1.5,
      disableDepthTestDistance: 0,
      heightReference: options.clampToSurface ? HeightReference.CLAMP_TO_GROUND : HeightReference.NONE,
    },
    label: {
      text: label,
      show: labelVisible,
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
      distanceDisplayCondition: new DistanceDisplayCondition(0, labelMaxDistance),
      disableDepthTestDistance: 0,
      heightReference: options.clampToSurface ? HeightReference.CLAMP_TO_GROUND : HeightReference.NONE,
    },
  };
}

function sensorFootprintEntity(satellite: ApiPointRecord, alpha: number): Entity.ConstructorOptions {
  const latitude = pointLat(satellite);
  const longitude = pointLon(satellite);
  const radius = Math.max(180_000, Math.min(950_000, satelliteHeightMeters(satellite) * 0.38));
  return {
    id: `satellite-footprint-${pointId('satellite', satellite)}`,
    position: Cartesian3.fromDegrees(longitude, latitude, 120),
    ellipse: {
      semiMajorAxis: radius,
      semiMinorAxis: radius,
      material: Color.fromCssColorString('#22d3ee').withAlpha(0.075 * alpha),
      outline: true,
      outlineColor: Color.fromCssColorString('#22d3ee').withAlpha(0.32 * alpha),
      height: 120,
    },
  };
}

function addShipTrail(target: Entity.ConstructorOptions[], ship: ApiPointRecord, risk: boolean) {
  const payloadTrail = ship.payload?.trail;
  const inlineTrail = (ship as ApiPointRecord & { trail?: unknown[] }).trail;
  const trail: unknown[] = Array.isArray(payloadTrail)
    ? payloadTrail
    : Array.isArray(inlineTrail)
      ? inlineTrail
      : [];
  const positions = trail
    .map((point) => {
      const lat = Number((point as { lat?: unknown; latitude?: unknown }).lat ?? (point as { latitude?: unknown }).latitude);
      const lon = Number((point as { lon?: unknown; longitude?: unknown }).lon ?? (point as { longitude?: unknown }).longitude);
      return Number.isFinite(lat) && Number.isFinite(lon)
        ? Cartesian3.fromDegrees(lon, lat, SHIP_SURFACE_HEIGHT_M)
        : null;
    })
    .filter((position): position is Cartesian3 => Boolean(position));
  if (positions.length < 2) return;

  target.push({
    id: `ship-trail-${pointId('ship', ship)}`,
    polyline: {
      positions,
      width: risk ? 2.8 : 1.4,
      clampToGround: true,
      material: new PolylineGlowMaterialProperty({
        glowPower: risk ? 0.18 : 0.08,
        color: (risk ? Color.fromCssColorString('#f59e0b') : Color.fromCssColorString('#38bdf8')).withAlpha(risk ? 0.72 : 0.34),
      }),
    },
  });
}

function prioritizedShips(ships: ApiPointRecord[], mode: string) {
  if (mode === 'traffic') return ships.slice(0, 3200);
  const risk = ships.filter(isRiskShip);
  const nearby = ships.filter((ship) => !isRiskShip(ship) && Number(ship.nearest_cable_distance_m) <= 35_000);
  const remaining = ships.filter((ship) => !isRiskShip(ship) && !(Number(ship.nearest_cable_distance_m) <= 35_000));
  return [...risk.slice(0, 600), ...nearby.slice(0, 900), ...remaining.slice(0, 900)];
}

function isRiskShip(ship: ApiPointRecord) {
  return String(ship.risk_status ?? '').toUpperCase() === 'RISK' ||
    Number(ship.nearest_cable_distance_m) <= 10_000;
}

function satelliteHeightMeters(satellite: ApiPointRecord) {
  const height = Number(satellite.altitude_km);
  return Number.isFinite(height) && height > 0 ? height * 1000 : 160_000;
}

function isRecordOnNearSide(viewer: CesiumViewer | null, record: ApiPointRecord, margin: number) {
  if (!viewer || viewer.isDestroyed()) return true;
  const latitude = pointLat(record);
  const longitude = pointLon(record);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return false;

  const cameraNormal = Cartesian3.normalize(viewer.camera.positionWC, new Cartesian3());
  const recordNormal = Cartesian3.normalize(Cartesian3.fromDegrees(longitude, latitude, 0), new Cartesian3());
  return Cartesian3.dot(cameraNormal, recordNormal) > margin;
}

function approximateSatelliteTrail(satellite: ApiPointRecord) {
  const latitude = pointLat(satellite);
  const longitude = pointLon(satellite);
  const height = satelliteHeightMeters(satellite);
  const inclination = Number(satellite.payload?.inclination_deg ?? 38);
  const bend = Math.max(8, Math.min(32, inclination / 2.2));
  const positions: Cartesian3[] = [];
  for (let index = -9; index <= 9; index += 1) {
    const phase = index / 9;
    const lon = normalizeLongitude(longitude + index * 5.5);
    const lat = clamp(latitude + Math.sin(phase * Math.PI) * bend, -82, 82);
    positions.push(Cartesian3.fromDegrees(lon, lat, height));
  }
  return positions;
}

function normalizeLongitude(longitude: number) {
  let lon = longitude;
  while (lon > 180) lon -= 360;
  while (lon < -180) lon += 360;
  return lon;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function layerAlpha(layerId: string) {
  return (useLayerStore.getState().layerOpacity[layerId] ?? 100) / 100;
}

function layerAlphaForWeather(parameter: string) {
  if (parameter.includes('temperature')) return layerAlpha('temperature');
  if (parameter.includes('wind')) return layerAlpha('wind10m');
  if (parameter.includes('humidity')) return layerAlpha('humidity2m');
  if (parameter.includes('rain') || parameter.includes('precip')) return layerAlpha('radarPrecipitation');
  return 1;
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

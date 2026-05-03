import {
  CallbackPositionProperty,
  Cartesian2,
  Cartesian3,
  Color,
  Entity,
  HorizontalOrigin,
  LabelStyle,
  Math as CesiumMath,
  VerticalOrigin,
  type Viewer as CesiumViewer,
} from 'cesium';
import type { IRenderer } from './IRenderer';
import { mockMapEntities, type MockMapEntity } from '../earth/mockMapEntities';
import { useLiveDataStore } from '../store/liveDataStore';
import { useUiStore } from '../store/uiStore';
import { wave } from '../utils/liveData';

export class MockIntelEntityRenderer implements IRenderer {
  private viewer: CesiumViewer | null = null;
  private entities: Entity[] = [];
  private unsubscribeUi: (() => void) | null = null;
  private unsubscribeLive: (() => void) | null = null;

  attach(viewer: CesiumViewer): void {
    this.viewer = viewer;
    this.unsubscribeUi = useUiStore.subscribe(() => this.refresh());
    this.unsubscribeLive = useLiveDataStore.subscribe(() => {
      if (this.viewer && !this.viewer.isDestroyed()) {
        this.viewer.scene.requestRender();
      }
    });
    this.refresh();
  }

  detach(): void {
    this.clear();
    this.unsubscribeUi?.();
    this.unsubscribeLive?.();
    this.unsubscribeUi = null;
    this.unsubscribeLive = null;
    this.viewer = null;
  }

  private refresh(): void {
    if (!this.viewer || this.viewer.isDestroyed()) return;
    this.clear();
    const mode = useUiStore.getState().mode;
    const selectedLocation = useLiveDataStore.getState();

    const active = mockMapEntities
      .filter((entity) => entity.mode === mode)
      .map((entity) =>
        entity.type === 'location'
          ? {
              ...entity,
              label: selectedLocation.selectedLocationName,
              lat: selectedLocation.selectedLocationLat,
              lon: selectedLocation.selectedLocationLon,
            }
          : entity,
      );

    for (const entity of active) {
      this.entities.push(this.viewer.entities.add(this.buildEntity(entity)));
    }
    this.viewer.scene.requestRender();
  }

  private clear(): void {
    if (!this.viewer || this.viewer.isDestroyed()) return;
    for (const entity of this.entities) {
      this.viewer.entities.remove(entity);
    }
    this.entities = [];
  }

  private buildEntity(entity: MockMapEntity): Entity.ConstructorOptions {
    const position = new CallbackPositionProperty(() => {
      const nowMs = useLiveDataStore.getState().nowMs;
      const driftScale = entity.type === 'storm' ? 0.45 : entity.type === 'fire' ? 0.14 : 0.05;
      const lat = entity.lat + wave(nowMs, 95_000, entity.x) * driftScale;
      const lon = entity.lon + wave(nowMs, 110_000, entity.y) * driftScale;
      return Cartesian3.fromDegrees(lon, lat, altitudeFor(entity));
    }, false);

    return {
      id: `mock-intel-${entity.id}`,
      position,
      point: {
        pixelSize: entity.type === 'watch-zone' || entity.type === 'corridor' ? 13 : 10,
        color: colorFor(entity).withAlpha(0.95),
        outlineColor: Color.WHITE.withAlpha(0.75),
        outlineWidth: 2,
        heightReference: 0,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
      ellipse:
        entity.type === 'watch-zone' || entity.type === 'corridor'
          ? {
              semiMajorAxis: 260_000,
              semiMinorAxis: 145_000,
              material: colorFor(entity).withAlpha(0.14),
              outline: true,
              outlineColor: colorFor(entity).withAlpha(0.8),
              rotation: CesiumMath.toRadians(entity.x % 40),
              height: 0,
            }
          : undefined,
      label: {
        text: entity.label,
        font: '600 13px "Segoe UI", sans-serif',
        fillColor: Color.WHITE,
        outlineColor: Color.BLACK,
        outlineWidth: 2,
        style: LabelStyle.FILL_AND_OUTLINE,
        showBackground: true,
        backgroundColor: Color.fromCssColorString('#07111f').withAlpha(0.8),
        backgroundPadding: new Cartesian2(8, 5),
        pixelOffset: new Cartesian2(0, -24),
        verticalOrigin: VerticalOrigin.BOTTOM,
        horizontalOrigin: HorizontalOrigin.CENTER,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
    };
  }
}

function altitudeFor(entity: MockMapEntity) {
  if (entity.type === 'storm') return 18_000;
  if (entity.type === 'fire' || entity.type === 'earthquake') return 1200;
  return 0;
}

function colorFor(entity: MockMapEntity) {
  switch (entity.severity) {
    case 'critical':
    case 'high':
      return Color.fromCssColorString('#ef4444');
    case 'elevated':
      return Color.fromCssColorString('#eab308');
    case 'moderate':
      return Color.fromCssColorString('#f97316');
    case 'low':
    case 'healthy':
      return Color.fromCssColorString('#22c55e');
    default:
      return Color.fromCssColorString('#22d3ee');
  }
}

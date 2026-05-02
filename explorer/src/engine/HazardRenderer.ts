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
import type { HazardIntelEvent } from '../core/types/intel';
import { type IntelState, useIntelStore } from '../core/store/useIntelStore';

const MAX_HAZARD_LABELS = 42;

export class HazardRenderer implements IRenderer {
  private viewer: CesiumViewer | null = null;
  private dataSource: CustomDataSource | null = null;
  private unsubscribe: (() => void) | null = null;
  private lastHazards: IntelState['hazards'] | null = null;
  private lastVisible: boolean | null = null;

  attach(viewer: CesiumViewer): void {
    this.viewer = viewer;
    this.dataSource = new CustomDataSource('weather-intel-hazards');
    void viewer.dataSources.add(this.dataSource);

    this.unsubscribe = useIntelStore.subscribe((state) => {
      this.renderHazards(state);
    });
    this.renderHazards(useIntelStore.getState());
  }

  detach(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;

    if (this.viewer && this.dataSource && !this.viewer.isDestroyed()) {
      void this.viewer.dataSources.remove(this.dataSource, true);
    }

    this.viewer = null;
    this.dataSource = null;
    this.lastHazards = null;
    this.lastVisible = null;
  }

  private renderHazards(state: IntelState): void {
    if (!this.viewer || this.viewer.isDestroyed() || !this.dataSource) return;

    const visible = state.activeLayers.hazards;
    if (visible !== this.lastVisible) {
      this.lastVisible = visible;
      this.dataSource.show = visible;
      if (visible) this.lastHazards = null;
    }

    if (!visible || state.hazards === this.lastHazards) {
      this.viewer.scene.requestRender();
      return;
    }

    this.lastHazards = state.hazards;
    this.dataSource.entities.removeAll();

    state.hazards
      .filter(hasValidPosition)
      .forEach((hazard, index) => {
        const severityScore = hazard.severityScore ?? hazard.magnitude ?? hazard.value ?? 1;
        const pixelSize = Math.max(7, Math.min(22, 7 + severityScore / 10));
        const color = colorForHazard(hazard);
        const showLabel = index < MAX_HAZARD_LABELS;

        this.dataSource?.entities.add({
          id: `hazard:${hazard.id}`,
          name: hazard.title,
          position: Cartesian3.fromDegrees(hazard.longitude, hazard.latitude, 60),
          point: {
            pixelSize,
            color,
            outlineColor: Color.WHITE.withAlpha(0.82),
            outlineWidth: 1.5,
            heightReference: HeightReference.CLAMP_TO_GROUND,
            scaleByDistance: new NearFarScalar(250_000, 1.15, 7_500_000, 0.42),
            disableDepthTestDistance: 1_000_000,
          },
          label: showLabel
            ? {
                text: buildHazardLabel(hazard),
                font: '600 12px Segoe UI, sans-serif',
                fillColor: Color.WHITE,
                outlineColor: Color.BLACK.withAlpha(0.85),
                outlineWidth: 3,
                style: LabelStyle.FILL_AND_OUTLINE,
                pixelOffset: new Cartesian2(0, -22),
                verticalOrigin: VerticalOrigin.BOTTOM,
                showBackground: true,
                backgroundColor: Color.BLACK.withAlpha(0.48),
                backgroundPadding: new Cartesian2(6, 4),
                distanceDisplayCondition: new DistanceDisplayCondition(0, 2_800_000),
                disableDepthTestDistance: 1_000_000,
              }
            : undefined,
          properties: {
            kind: 'weather-hazard',
            sourceId: hazard.sourceId,
            eventType: hazard.eventType,
            rawFilePath: hazard.sourceLineage?.rawFilePath ?? null,
          },
        });
      });

    this.viewer.scene.requestRender();
  }
}

function hasValidPosition(hazard: HazardIntelEvent) {
  return (
    Number.isFinite(hazard.latitude) &&
    Number.isFinite(hazard.longitude) &&
    Math.abs(hazard.latitude) <= 90 &&
    Math.abs(hazard.longitude) <= 180
  );
}

function colorForHazard(hazard: HazardIntelEvent) {
  const type = hazard.eventType.toLowerCase();
  if (type.includes('earthquake')) return Color.fromCssColorString('#ff5a5f');
  if (type.includes('volcano')) return Color.fromCssColorString('#ff9f1c');
  if (type.includes('alert') || type.includes('storm')) return Color.fromCssColorString('#fbbf24');
  if (type.includes('flood') || type.includes('water')) return Color.fromCssColorString('#38bdf8');
  return Color.fromCssColorString('#d946ef');
}

function buildHazardLabel(hazard: HazardIntelEvent) {
  if (Number.isFinite(hazard.magnitude)) {
    return `M ${hazard.magnitude?.toFixed(1)} ${hazard.eventType}`;
  }
  if (hazard.severity) {
    return `${hazard.severity} ${hazard.eventType}`;
  }
  return hazard.eventType;
}

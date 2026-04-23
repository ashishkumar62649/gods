import {
  Cartesian2,
  Cartesian3,
  Color,
  HorizontalOrigin,
  Label,
  LabelCollection,
  LabelStyle,
  NearFarScalar,
  PointPrimitive,
  PointPrimitiveCollection,
  PrimitiveCollection,
  VerticalOrigin,
  Viewer as CesiumViewer,
} from 'cesium';
import type {
  MaritimeVesselRecord,
  MaritimeVesselType,
} from './maritime';

interface MaritimePickId {
  kind: 'maritime-vessel';
  vesselId: string;
}

interface MaritimeRenderEntry {
  point: PointPrimitive;
  vessel: MaritimeVesselRecord;
}

const CARGO_COLOR = Color.fromCssColorString('#22f0ff').withAlpha(0.95);
const TANKER_COLOR = Color.fromCssColorString('#ffbf36').withAlpha(0.95);
const OUTLINE_COLOR = Color.fromCssColorString('#04121d').withAlpha(0.92);

export class MaritimeLayerManager {
  private readonly viewer: CesiumViewer;
  private readonly root: PrimitiveCollection;
  private readonly points: PointPrimitiveCollection;
  private readonly labels: LabelCollection;
  private readonly hoverLabel: Label;
  private readonly entries = new Map<string, MaritimeRenderEntry>();
  private visible = false;
  private hoveredVesselId: string | null = null;

  constructor(viewer: CesiumViewer) {
    this.viewer = viewer;
    this.root = new PrimitiveCollection();
    this.points = this.root.add(new PointPrimitiveCollection()) as PointPrimitiveCollection;
    this.labels = this.root.add(new LabelCollection()) as LabelCollection;
    this.hoverLabel = this.labels.add({
      show: false,
      position: Cartesian3.ZERO,
      text: '',
      font: '600 12px "Segoe UI", "Helvetica Neue", Arial, sans-serif',
      fillColor: Color.WHITE,
      outlineColor: Color.fromCssColorString('#020617'),
      outlineWidth: 1,
      style: LabelStyle.FILL_AND_OUTLINE,
      showBackground: true,
      backgroundColor: Color.fromCssColorString('#020617').withAlpha(0.84),
      backgroundPadding: new Cartesian2(10, 6),
      pixelOffset: new Cartesian2(0, -18),
      verticalOrigin: VerticalOrigin.BOTTOM,
      horizontalOrigin: HorizontalOrigin.CENTER,
      scaleByDistance: new NearFarScalar(50_000, 1, 20_000_000, 0.5),
    });
    this.points.show = false;
    this.labels.show = false;
    this.viewer.scene.primitives.add(this.root);
  }

  destroy() {
    this.entries.clear();
    this.points.removeAll();
    this.labels.removeAll();
    if (!this.viewer.isDestroyed()) {
      this.viewer.scene.primitives.remove(this.root);
    }
  }

  setVisible(visible: boolean) {
    this.visible = visible;
    this.points.show = visible;
    this.labels.show = visible;
    this.refreshHoverLabel();
    this.requestRender();
  }

  syncVessels(vessels: MaritimeVesselRecord[]) {
    const seen = new Set<string>();

    for (const vessel of vessels) {
      if (!Number.isFinite(vessel.lat) || !Number.isFinite(vessel.lon)) continue;

      const vesselId = buildVesselRenderId(vessel);
      seen.add(vesselId);
      const position = Cartesian3.fromDegrees(vessel.lon, vessel.lat, 120);
      const existing = this.entries.get(vesselId);

      if (existing) {
        existing.vessel = vessel;
        existing.point.position = position;
        applyPointStyle(existing.point, vessel.type);
      } else {
        const point = this.points.add({
          id: { kind: 'maritime-vessel', vesselId } satisfies MaritimePickId,
          position,
          pixelSize: 8,
          outlineWidth: 2,
          disableDepthTestDistance: 0,
          scaleByDistance: new NearFarScalar(20_000, 1.1, 20_000_000, 0.34),
          translucencyByDistance: new NearFarScalar(20_000, 1, 20_000_000, 0.55),
        });
        applyPointStyle(point, vessel.type);
        this.entries.set(vesselId, { point, vessel });
      }
    }

    for (const [vesselId, entry] of this.entries) {
      if (seen.has(vesselId)) continue;
      this.points.remove(entry.point);
      this.entries.delete(vesselId);
      if (this.hoveredVesselId === vesselId) {
        this.hoveredVesselId = null;
      }
    }

    this.refreshHoverLabel();
    this.requestRender();
  }

  pickVessel(windowPosition: Cartesian2) {
    const picked = this.viewer.scene.pick(windowPosition);
    return extractMaritimePickId(picked)?.vesselId ?? null;
  }

  setHoveredVesselId(vesselId: string | null) {
    if (this.hoveredVesselId === vesselId) return;
    this.hoveredVesselId = vesselId;
    this.refreshHoverLabel();
    this.requestRender();
  }

  private refreshHoverLabel() {
    if (!this.visible || !this.hoveredVesselId) {
      this.hoverLabel.show = false;
      return;
    }

    const entry = this.entries.get(this.hoveredVesselId);
    if (!entry) {
      this.hoverLabel.show = false;
      return;
    }

    this.hoverLabel.position = entry.point.position;
    this.hoverLabel.text = entry.vessel.name || entry.vessel.mmsi || 'Unknown Vessel';
    this.hoverLabel.show = true;
  }

  private requestRender() {
    if (!this.viewer.isDestroyed()) {
      this.viewer.scene.requestRender();
    }
  }
}

function applyPointStyle(point: PointPrimitive, type: MaritimeVesselType) {
  const color = type === 'BUNKER_OR_TANKER' ? TANKER_COLOR : CARGO_COLOR;
  point.color = color;
  point.outlineColor = OUTLINE_COLOR;
}

function buildVesselRenderId(vessel: MaritimeVesselRecord) {
  return vessel.mmsi || `${vessel.name}:${vessel.timestamp}`;
}

function extractMaritimePickId(picked: unknown): MaritimePickId | null {
  if (!picked || typeof picked !== 'object') return null;
  const maybePicked = picked as { id?: unknown; primitive?: { id?: unknown } };
  const id = maybePicked.id ?? maybePicked.primitive?.id;
  if (!id || typeof id !== 'object') return null;
  const maybeId = id as Partial<MaritimePickId>;
  return maybeId.kind === 'maritime-vessel' && typeof maybeId.vesselId === 'string'
    ? (maybeId as MaritimePickId)
    : null;
}

import {
  Billboard,
  BillboardCollection,
  Cartesian2,
  Cartesian3,
  Color,
  Material,
  NearFarScalar,
  PointPrimitiveCollection,
  Polyline,
  PolylineCollection,
  PrimitiveCollection,
  VerticalOrigin,
  Viewer as CesiumViewer,
} from 'cesium';
import type {
  GodsEyeInfrastructure,
  GodsEyeShip,
  InfrastructureNode,
} from './infrastructure';

interface CablePickId {
  kind: 'cable';
  cableId: string;
  lon: number;
  lat: number;
}

const SHIP_ICON_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 64"><path d="M24 2 42 58 24 48 6 58Z" fill="white"/><path d="M24 12 31 45 24 41 17 45Z" fill="#06121f"/></svg>';
const SHIP_ICON_IMAGE = `data:image/svg+xml;utf8,${encodeURIComponent(SHIP_ICON_SVG)}`;
const NODE_COLOR = Color.fromCssColorString('#ff3b3b').withAlpha(0.95);

export class CableSceneLayerManager {
  private readonly viewer: CesiumViewer;
  private readonly root: PrimitiveCollection;
  private readonly cablePolylines: PolylineCollection;
  private readonly shipTrails: PolylineCollection;
  private readonly shipBillboards: BillboardCollection;
  private readonly intelligenceNodes: PointPrimitiveCollection;
  private readonly shipEntries = new Map<string, Billboard>();
  private cablePolylineRefs: Polyline[] = [];
  private cablesVisible = false;
  private shipsVisible = false;

  constructor(viewer: CesiumViewer) {
    this.viewer = viewer;
    this.root = new PrimitiveCollection();
    this.cablePolylines = this.root.add(new PolylineCollection()) as PolylineCollection;
    this.shipTrails = this.root.add(new PolylineCollection()) as PolylineCollection;
    this.shipBillboards = this.root.add(new BillboardCollection()) as BillboardCollection;
    this.intelligenceNodes = this.root.add(new PointPrimitiveCollection()) as PointPrimitiveCollection;
    this.cablePolylines.show = false;
    this.shipTrails.show = false;
    this.shipBillboards.show = false;
    this.intelligenceNodes.show = true;
    this.viewer.scene.primitives.add(this.root);
  }

  destroy() {
    this.cablePolylineRefs = [];
    this.shipEntries.clear();
    this.cablePolylines.removeAll();
    this.shipTrails.removeAll();
    this.shipBillboards.removeAll();
    this.intelligenceNodes.removeAll();
    if (!this.viewer.isDestroyed()) {
      this.viewer.scene.primitives.remove(this.root);
    }
  }

  setCablesVisible(visible: boolean) {
    this.cablesVisible = visible;
    this.cablePolylines.show = visible;
    this.requestRender();
  }

  setShipsVisible(visible: boolean) {
    this.shipsVisible = visible;
    this.shipBillboards.show = visible;
    this.shipTrails.show = visible;
    this.requestRender();
  }

  syncInfrastructure(
    cables: GodsEyeInfrastructure[],
    ships: GodsEyeShip[],
    nodes: InfrastructureNode[],
  ) {
    this.syncCables(cables);
    this.syncShips(ships);
    this.syncNodes(nodes);
    this.requestRender();
  }

  pickCable(windowPosition: Cartesian2) {
    const picked = this.viewer.scene.pick(windowPosition);
    const id = extractCablePickId(picked);
    return id;
  }

  private syncCables(cables: GodsEyeInfrastructure[]) {
    this.cablePolylines.removeAll();
    this.cablePolylineRefs = [];

    for (const cable of cables) {
      for (const segment of cable.segments) {
        const positions = segment
          .filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lon))
          .map((point) => Cartesian3.fromDegrees(point.lon, point.lat, -40));
        if (positions.length < 2) continue;

        const anchor = segment[Math.floor(segment.length / 2)] ?? segment[0];
        const polyline = this.cablePolylines.add({
          id: {
            kind: 'cable',
            cableId: cable.asset_id,
            lon: anchor.lon,
            lat: anchor.lat,
          } satisfies CablePickId,
          positions,
          width: cable.status === 'Breached' ? 4 : 2.4,
          material: Material.fromType(Material.PolylineGlowType, {
            color: cable.status === 'Breached'
              ? Color.RED.withAlpha(0.78)
              : Color.fromCssColorString('#22d3ee').withAlpha(0.72),
            glowPower: 0.18,
            taperPower: 0.72,
          }),
        });
        this.cablePolylineRefs.push(polyline);
      }
    }

    this.cablePolylines.show = this.cablesVisible;
  }

  private syncShips(ships: GodsEyeShip[]) {
    const seen = new Set<string>();
    this.shipTrails.removeAll();

    for (const ship of ships) {
      seen.add(ship.vessel_id);
      const position = Cartesian3.fromDegrees(ship.longitude, ship.latitude, 250);
      const existing = this.shipEntries.get(ship.vessel_id);
      const color = ship.risk_status === 'RISK'
        ? Color.RED.withAlpha(getPulse(900, 0.55, 1))
        : Color.fromCssColorString('#e0f2fe').withAlpha(0.92);

      if (existing) {
        existing.position = position;
        existing.rotation = headingToRotation(ship.heading_deg);
        existing.color = color;
      } else {
        const billboard = this.shipBillboards.add({
          id: { kind: 'ship', vesselId: ship.vessel_id },
          image: SHIP_ICON_IMAGE,
          position,
          width: 22,
          height: 30,
          color,
          rotation: headingToRotation(ship.heading_deg),
          verticalOrigin: VerticalOrigin.CENTER,
          scaleByDistance: new NearFarScalar(20_000, 1.1, 18_000_000, 0.28),
          disableDepthTestDistance: 0,
        });
        this.shipEntries.set(ship.vessel_id, billboard);
      }

      if (ship.trail.length > 1) {
        this.shipTrails.add({
          positions: ship.trail.map((point) =>
            Cartesian3.fromDegrees(point.lon, point.lat, 200),
          ),
          width: ship.risk_status === 'RISK' ? 2.5 : 1.4,
          material: Material.fromType(Material.PolylineDashType, {
            color: ship.risk_status === 'RISK'
              ? Color.RED.withAlpha(0.62)
              : Color.fromCssColorString('#38bdf8').withAlpha(0.38),
            dashLength: 12,
          }),
        });
      }
    }

    for (const [vesselId, billboard] of this.shipEntries) {
      if (seen.has(vesselId)) continue;
      this.shipBillboards.remove(billboard);
      this.shipEntries.delete(vesselId);
    }

    this.shipBillboards.show = this.shipsVisible;
    this.shipTrails.show = this.shipsVisible;
  }

  private syncNodes(nodes: InfrastructureNode[]) {
    this.intelligenceNodes.removeAll();
    for (const node of nodes) {
      this.intelligenceNodes.add({
        id: { kind: 'infrastructure-node', nodeId: node.node_id },
        position: Cartesian3.fromDegrees(node.longitude, node.latitude, 500),
        color: NODE_COLOR,
        outlineColor: Color.WHITE.withAlpha(0.9),
        outlineWidth: 2,
        pixelSize: 12,
        scaleByDistance: new NearFarScalar(20_000, 1.2, 20_000_000, 0.32),
        disableDepthTestDistance: 0,
      });
    }
  }

  private requestRender() {
    if (!this.viewer.isDestroyed()) {
      this.viewer.scene.requestRender();
    }
  }
}

function extractCablePickId(picked: unknown): CablePickId | null {
  if (!picked || typeof picked !== 'object') return null;
  const maybePicked = picked as { id?: unknown; primitive?: { id?: unknown } };
  const id = maybePicked.id ?? maybePicked.primitive?.id;
  if (!id || typeof id !== 'object') return null;
  const maybeId = id as Partial<CablePickId>;
  return maybeId.kind === 'cable' && typeof maybeId.cableId === 'string'
    ? (maybeId as CablePickId)
    : null;
}

function headingToRotation(headingDeg: number | null) {
  return Number.isFinite(headingDeg)
    ? (headingDeg! * Math.PI) / 180
    : 0;
}

function getPulse(periodMs: number, min: number, max: number) {
  const phase = (Date.now() % periodMs) / periodMs;
  const wave = (Math.sin(phase * Math.PI * 2) + 1) / 2;
  return min + (max - min) * wave;
}

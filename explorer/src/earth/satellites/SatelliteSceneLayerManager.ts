import {
  ArcType,
  Billboard,
  BillboardCollection,
  Cartesian2,
  Cartesian3,
  Color,
  ColorMaterialProperty,
  ConstantProperty,
  DistanceDisplayCondition,
  Entity,
  HorizontalOrigin,
  JulianDate,
  Material,
  Math as CesiumMath,
  Matrix3,
  NearFarScalar,
  Polyline,
  PolylineCollection,
  PointPrimitive,
  PointPrimitiveCollection,
  PolylineGlowMaterialProperty,
  PrimitiveCollection,
  Simon1994PlanetaryPositions,
  Transforms,
  VerticalOrigin,
  Viewer as CesiumViewer,
} from 'cesium';
import { twoline2satrec } from 'satellite.js/dist/io.js';
import { gstime, propagate } from 'satellite.js/dist/propagation.js';
import {
  degreesLat,
  degreesLong,
  eciToGeodetic,
} from 'satellite.js/dist/transforms.js';
import {
  getNearestGroundStation,
  groundStationToCartesian,
  hasLineOfSight,
} from './satelliteIntelligence';
import {
  INITIAL_SATELLITE_MISSION_FILTERS,
  type SatelliteMissionFilters,
  type SatelliteRecord,
} from './satellites';

interface SatellitePickId {
  kind: 'satellite';
  satelliteId: string;
}

interface SatelliteRenderEntry {
  point: PointPrimitive;
  satellite: SatelliteRecord;
}

const SELECTED_SATELLITE_COLOR = Color.fromCssColorString('#ffffff').withAlpha(1);
const SELECTED_OUTLINE_COLOR = Color.fromCssColorString('#67e8f9').withAlpha(0.95);
const GEO_SHELL_COLOR = Color.fromCssColorString('#2563eb').withAlpha(0.9);
const TARGET_OPTIC_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><defs><filter id="cyanGlow"><feGaussianBlur stdDeviation="3" result="blur" /><feComposite in="SourceGraphic" in2="blur" operator="over" /></filter></defs><g filter="url(#cyanGlow)"><path d="M 20 10 L 10 10 L 10 20 M 60 10 L 70 10 L 70 20 M 10 60 L 10 70 L 20 70 M 70 60 L 70 70 L 60 70" fill="none" stroke="#22d3ee" stroke-width="3" /><path d="M 40 15 L 40 25 M 40 55 L 40 65 M 15 40 L 25 40 M 55 40 L 65 40" fill="none" stroke="#67e8f9" stroke-width="2" opacity="0.8" /><circle cx="40" cy="40" r="18" fill="none" stroke="#a5f3fc" stroke-width="1" stroke-dasharray="4 4" opacity="0.6"/></g></svg>';
const TARGET_OPTIC_IMAGE = `data:image/svg+xml;utf8,${encodeURIComponent(TARGET_OPTIC_SVG)}`;
const GLINT_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><defs><filter id="g"><feGaussianBlur stdDeviation="2.5" result="b"/><feComposite in="SourceGraphic" in2="b" operator="over"/></filter></defs><g filter="url(#g)" fill="#ffffff"><path d="M24 2 29 19 46 24 29 29 24 46 19 29 2 24 19 19Z" opacity="0.9"/><circle cx="24" cy="24" r="4" fill="#a5f3fc"/></g></svg>';
const GLINT_IMAGE = `data:image/svg+xml;utf8,${encodeURIComponent(GLINT_SVG)}`;
const PATH_STEP_SECONDS = 120;
const PATH_DURATION_SECONDS = 90 * 60;
const CAMERA_FADE_REFERENCE_HEIGHT_M = 10_000_000;
const STARLINK_FOCUS_DIM_ALPHA = 0.1;
const EARTH_RADIUS_M = 6_371_000;
const NETWORK_LINK_MAX_DISTANCE_M = 500_000;
const NETWORK_LINK_CELL_SIZE_M = NETWORK_LINK_MAX_DISTANCE_M;
const NETWORK_LINK_LIMIT = 6_000;

export class SatelliteSceneLayerManager {
  private readonly viewer: CesiumViewer;
  private readonly root: PrimitiveCollection;
  private readonly points: PointPrimitiveCollection;
  private readonly signalPolylines: PolylineCollection;
  private readonly networkPolylines: PolylineCollection;
  private readonly overlayBillboards: BillboardCollection;
  private readonly targetOpticBillboard: Billboard;
  private readonly glintBillboard: Billboard;
  private readonly signalPolyline: Polyline;
  private readonly entries = new Map<string, SatelliteRenderEntry>();
  private selectedSatelliteId: string | null = null;
  private pathEntity: Entity | null = null;
  private sensorConeEntity: Entity | null = null;
  private satellitesVisible = false;
  private starlinkFocusEnabled = false;
  private networkViewEnabled = false;
  private missionFilters: SatelliteMissionFilters = {
    ...INITIAL_SATELLITE_MISSION_FILTERS,
  };
  private cameraOpacity = 1;
  private lastHeavyTickMs = 0;
  private sunDirectionFixed = Cartesian3.normalize(
    new Cartesian3(1, 0, 0),
    new Cartesian3(),
  );

  constructor(viewer: CesiumViewer) {
    this.viewer = viewer;
    this.root = new PrimitiveCollection();
    this.points = this.root.add(new PointPrimitiveCollection()) as PointPrimitiveCollection;
    this.signalPolylines = this.root.add(new PolylineCollection()) as PolylineCollection;
    this.networkPolylines = this.root.add(new PolylineCollection()) as PolylineCollection;
    this.overlayBillboards = this.root.add(new BillboardCollection()) as BillboardCollection;
    this.signalPolyline = this.signalPolylines.add({
      show: false,
      positions: [],
      width: 3,
      material: Material.fromType(Material.PolylineDashType, {
        color: Color.fromCssColorString('#67e8f9').withAlpha(0.65),
        dashLength: 18,
      }),
    });
    this.targetOpticBillboard = this.overlayBillboards.add({
      image: TARGET_OPTIC_IMAGE,
      position: Cartesian3.ZERO,
      width: 80,
      height: 80,
      show: false,
      verticalOrigin: VerticalOrigin.CENTER,
      horizontalOrigin: HorizontalOrigin.CENTER,
      scaleByDistance: new NearFarScalar(350_000, 1.0, 80_000_000, 0.28),
      disableDepthTestDistance: 0,
    });
    this.glintBillboard = this.overlayBillboards.add({
      image: GLINT_IMAGE,
      position: Cartesian3.ZERO,
      width: 34,
      height: 34,
      show: false,
      verticalOrigin: VerticalOrigin.CENTER,
      horizontalOrigin: HorizontalOrigin.CENTER,
      scaleByDistance: new NearFarScalar(350_000, 1.0, 80_000_000, 0.24),
      disableDepthTestDistance: 0,
    });
    this.points.show = false;
    this.signalPolylines.show = false;
    this.networkPolylines.show = false;
    this.overlayBillboards.show = false;
    this.cameraOpacity = this.getCameraOpacity();
    this.updateSunDirection();
    this.viewer.scene.primitives.add(this.root);
  }

  destroy() {
    this.clearSelectedPath();
    this.clearSensorCone();
    this.entries.clear();
    this.points.removeAll();
    this.networkPolylines.removeAll();
    if (!this.viewer.isDestroyed()) {
      this.viewer.scene.primitives.remove(this.root);
    }
  }

  setSatellitesVisible(visible: boolean) {
    this.satellitesVisible = visible;
    this.points.show = visible;
    this.signalPolylines.show = visible;
    this.networkPolylines.show = visible && this.networkViewEnabled;
    this.overlayBillboards.show = visible;
    if (this.pathEntity) {
      this.pathEntity.show = visible && Boolean(this.selectedSatelliteId);
    }
    if (this.sensorConeEntity) {
      this.sensorConeEntity.show = visible && Boolean(this.selectedSatelliteId);
    }
    this.refreshSelectionOverlays();
    this.refreshSignalLink();
    this.requestRender();
  }

  setStarlinkFocusEnabled(enabled: boolean) {
    if (this.starlinkFocusEnabled === enabled) return;
    this.starlinkFocusEnabled = enabled;
    this.refreshSatelliteVisuals();
    this.requestRender();
  }

  setNetworkViewEnabled(enabled: boolean) {
    if (this.networkViewEnabled === enabled) return;
    this.networkViewEnabled = enabled;
    this.networkPolylines.show = this.satellitesVisible && enabled;
    this.refreshNetworkLinks();
    this.requestRender();
  }

  setMissionFilters(filters: SatelliteMissionFilters) {
    this.missionFilters = { ...filters };
    this.refreshSatelliteVisuals();
    this.refreshNetworkLinks();
    this.refreshSelectionOverlays();
    this.refreshSignalLink();
    this.requestRender();
  }

  updateCameraFading() {
    const nextOpacity = this.getCameraOpacity();
    if (Math.abs(nextOpacity - this.cameraOpacity) < 0.03) return;
    this.cameraOpacity = nextOpacity;
    this.refreshSatelliteVisuals();
    this.requestRender();
  }

  tickIntelligence() {
    // Early exit when the layer is hidden — no reason to burn frames.
    if (!this.satellitesVisible) return;

    // Cheap per-frame work (selection + pulse).
    this.updateSignalPulse();
    this.refreshSelectionOverlays();

    // Throttle the expensive passes so we don't burn frame budget on
    // planetary-position math and color re-uploads across thousands of
    // satellites every 16 ms.
    const now = performance.now();
    if (now - this.lastHeavyTickMs > 200) {
      this.lastHeavyTickMs = now;
      this.updateCameraFading();
      this.updateSunDirection();
      this.updateDecayPulse();
    }
  }

  setSelectedSatelliteId(satelliteId: string | null) {
    if (this.selectedSatelliteId === satelliteId) return;

    const previousEntry = this.selectedSatelliteId
      ? this.entries.get(this.selectedSatelliteId)
      : null;
    if (previousEntry) {
      this.applySatelliteVisual(previousEntry);
    }

    this.selectedSatelliteId = satelliteId;

    const nextEntry = satelliteId ? this.entries.get(satelliteId) : null;
    if (nextEntry) {
      this.applySatelliteVisual(nextEntry);
      this.rebuildSelectedPath(nextEntry.satellite);
      this.rebuildSensorCone(nextEntry.satellite);
      this.refreshSignalLink(nextEntry.satellite);
    } else {
      this.clearSelectedPath();
      this.clearSensorCone();
      this.hideSignalLink();
    }

    this.refreshSelectionOverlays();
    this.requestRender();
  }

  syncSatellites(satellites: SatelliteRecord[]) {
    const seenIds = new Set<string>();

    for (const sat of satellites) {
      if (!isRenderableSatellite(sat)) continue;

      seenIds.add(sat.id_norad);
      const position = satelliteToCartesian(sat);
      const existing = this.entries.get(sat.id_norad);

      if (existing) {
        existing.satellite = sat;
        existing.point.position = position;
        this.applySatelliteVisual(existing);
      } else {
        const entry: SatelliteRenderEntry = {
          satellite: sat,
          point: this.points.add({
            id: { kind: 'satellite', satelliteId: sat.id_norad } satisfies SatellitePickId,
            position,
            pixelSize: 4,
            color: this.getSatelliteColor(sat.altitude_km),
            outlineColor: this.getSatelliteColor(sat.altitude_km).withAlpha(0.45),
            outlineWidth: 1.4,
            scaleByDistance: new NearFarScalar(1_000_000, 1.35, 90_000_000, 0.68),
            translucencyByDistance: new NearFarScalar(1_000_000, 1, 120_000_000, 0.55),
            distanceDisplayCondition: new DistanceDisplayCondition(0, 180_000_000),
            disableDepthTestDistance: 0,
          }),
        };
        this.entries.set(sat.id_norad, entry);
        this.applySatelliteVisual(entry);
      }
    }

    for (const [satelliteId, entry] of this.entries) {
      if (seenIds.has(satelliteId)) continue;
      this.points.remove(entry.point);
      this.entries.delete(satelliteId);
      if (this.selectedSatelliteId === satelliteId) {
        this.selectedSatelliteId = null;
        this.clearSelectedPath();
        this.clearSensorCone();
      }
    }

    const selectedEntry = this.selectedSatelliteId
      ? this.entries.get(this.selectedSatelliteId)
      : null;
    if (selectedEntry) {
      this.rebuildSelectedPath(selectedEntry.satellite);
      this.rebuildSensorCone(selectedEntry.satellite);
      this.refreshSignalLink(selectedEntry.satellite);
    }

    this.refreshSelectionOverlays();
    this.refreshNetworkLinks();
    this.requestRender();
  }

  pickSatellite(windowPosition: Cartesian2) {
    const picked = this.viewer.scene.pick(windowPosition);
    const pickedId = extractSatellitePickId(picked);
    return pickedId?.satelliteId ?? null;
  }

  getSatellitePosition(satelliteId: string) {
    const entry = this.entries.get(satelliteId);
    return entry ? Cartesian3.clone(entry.point.position) : null;
  }

  private applySatelliteVisual(entry: SatelliteRenderEntry) {
    const selected = entry.satellite.id_norad === this.selectedSatelliteId;
    const starlink = isStarlinkSatellite(entry.satellite);
    const decaying = entry.satellite.decay_status === 'DECAYING';
    const shellColor = decaying
      ? Color.RED.withAlpha(0.95)
      : this.getSatelliteColor(entry.satellite.altitude_km);
    const dimmedByFocus = this.starlinkFocusEnabled && !starlink && !selected;
    const shadowFactor = this.getShadowOpacityFactor(entry.point.position);
    const decayPulse = decaying ? getPulse(900, 0.45, 1) : 1;
    const shellAlpha = dimmedByFocus
      ? STARLINK_FOCUS_DIM_ALPHA
      : selected
        ? 1
        : this.cameraOpacity * shadowFactor * decayPulse;

    entry.point.show = this.satellitesVisible && this.isMissionVisible(entry.satellite);
    entry.point.pixelSize = selected ? 8 : decaying ? 6 : starlink && this.starlinkFocusEnabled ? 5 : 4;
    entry.point.color = selected
      ? SELECTED_SATELLITE_COLOR
      : cloneColorWithAlpha(shellColor, shellAlpha);
    entry.point.outlineColor = selected
      ? SELECTED_OUTLINE_COLOR
      : cloneColorWithAlpha(shellColor, dimmedByFocus ? 0.08 : Math.max(0.12, shellAlpha * 0.52));
    entry.point.outlineWidth = selected ? 2.8 : starlink && this.starlinkFocusEnabled ? 1.8 : 1.2;
  }

  private refreshSatelliteVisuals() {
    for (const entry of this.entries.values()) {
      this.applySatelliteVisual(entry);
    }
  }

  private getSatelliteColor(altitudeKm: number): Color {
    if (altitudeKm < 2_000) return Color.CYAN.withAlpha(0.8);
    if (altitudeKm < 30_000) return Color.GOLD.withAlpha(0.8);
    return GEO_SHELL_COLOR;
  }

  private isMissionVisible(satellite: SatelliteRecord) {
    const category = satellite.mission_category ?? 'OTHER';
    if (category === 'OTHER') return true;
    return this.missionFilters[category] !== false;
  }

  private rebuildSelectedPath(satellite: SatelliteRecord) {
    const positions = buildPredictedPathPositions(satellite);
    if (positions.length < 2) {
      this.clearSelectedPath();
      return;
    }

    if (!this.pathEntity) {
      this.pathEntity = this.viewer.entities.add({
        show: this.satellitesVisible,
        polyline: {
          positions,
          width: 2.8,
          arcType: ArcType.NONE,
          material: new PolylineGlowMaterialProperty({
            glowPower: 0.18,
            taperPower: 0.6,
            color: Color.fromCssColorString('#67e8f9').withAlpha(0.72),
          }),
        },
      });
    } else if (this.pathEntity.polyline) {
      this.pathEntity.show = this.satellitesVisible;
      this.pathEntity.polyline.positions = new ConstantProperty(positions);
    }
  }

  private clearSelectedPath() {
    if (!this.pathEntity) return;
    if (!this.viewer.isDestroyed()) {
      this.viewer.entities.remove(this.pathEntity);
    }
    this.pathEntity = null;
  }

  private rebuildSensorCone(satellite: SatelliteRecord) {
    this.clearSensorCone();

    const altitudeM = Math.max(0, satellite.altitude_km * 1000);
    if (altitudeM <= 0) return;

    const midpoint = Cartesian3.fromDegrees(
      satellite.longitude,
      satellite.latitude,
      altitudeM / 2,
    );
    const shellColor = this.getSatelliteColor(satellite.altitude_km);
    const footprintRadius = Math.min(
      1_800_000,
      Math.max(25_000, altitudeM * 0.08),
    );

    this.sensorConeEntity = this.viewer.entities.add({
      show: this.satellitesVisible,
      position: midpoint,
      cylinder: {
        length: altitudeM,
        topRadius: 0,
        bottomRadius: footprintRadius,
        material: new ColorMaterialProperty(
          cloneColorWithAlpha(shellColor, 0.12),
        ),
        outline: true,
        outlineColor: cloneColorWithAlpha(shellColor, 0.34),
      },
    });
  }

  private clearSensorCone() {
    if (!this.sensorConeEntity) return;
    if (!this.viewer.isDestroyed()) {
      this.viewer.entities.remove(this.sensorConeEntity);
    }
    this.sensorConeEntity = null;
  }

  private refreshSelectionOverlays() {
    const selectedEntry = this.selectedSatelliteId
      ? this.entries.get(this.selectedSatelliteId) ?? null
      : null;

    if (!selectedEntry || !this.satellitesVisible || !selectedEntry.point.show) {
      this.targetOpticBillboard.show = false;
      this.glintBillboard.show = false;
      return;
    }

    this.targetOpticBillboard.position = selectedEntry.point.position;
    this.targetOpticBillboard.show = true;
    this.glintBillboard.position = selectedEntry.point.position;
    this.glintBillboard.show =
      this.getShadowOpacityFactor(selectedEntry.point.position) >= 0.95 &&
      this.isGlintAligned(selectedEntry.point.position);
  }

  private getCameraOpacity() {
    const cameraHeight = this.viewer.camera.positionCartographic.height;
    return CesiumMath.clamp(cameraHeight / CAMERA_FADE_REFERENCE_HEIGHT_M, 0.2, 1);
  }

  private refreshSignalLink(satellite?: SatelliteRecord) {
    const selectedEntry = this.selectedSatelliteId
      ? this.entries.get(this.selectedSatelliteId) ?? null
      : null;
    const activeSatellite = satellite ?? selectedEntry?.satellite ?? null;

    if (!activeSatellite || !selectedEntry || !this.satellitesVisible || !selectedEntry.point.show) {
      this.hideSignalLink();
      return;
    }

    const station = getNearestGroundStation(activeSatellite);
    if (!station || !hasLineOfSight(activeSatellite, station)) {
      this.hideSignalLink();
      return;
    }

    this.signalPolyline.positions = [
      selectedEntry.point.position,
      groundStationToCartesian(station),
    ];
    this.signalPolyline.show = true;
  }

  private hideSignalLink() {
    this.signalPolyline.show = false;
  }

  private updateSignalPulse() {
    if (!this.signalPolyline.show) return;
    const alpha = getPulse(1200, 0.35, 0.95);
    const material = this.signalPolyline.material as Material & {
      uniforms?: { color?: Color };
    };
    if (material.uniforms) {
      material.uniforms.color = Color.fromCssColorString('#67e8f9').withAlpha(alpha);
    }
  }

  private updateDecayPulse() {
    for (const entry of this.entries.values()) {
      if (entry.satellite.decay_status === 'DECAYING') {
        this.applySatelliteVisual(entry);
      }
    }
  }

  private refreshNetworkLinks() {
    this.networkPolylines.removeAll();
    if (!this.networkViewEnabled || !this.satellitesVisible) return;

    let linkCount = 0;
    const groups = new Map<string, SatelliteRenderEntry[]>();
    for (const entry of this.entries.values()) {
      if (!entry.point.show) continue;
      const constellationId = getConstellationId(entry.satellite);
      if (!constellationId) continue;
      const group = groups.get(constellationId) ?? [];
      group.push(entry);
      groups.set(constellationId, group);
    }

    for (const group of groups.values()) {
      const grid = new Map<string, SatelliteRenderEntry[]>();
      const perNodeLinks = new Map<string, number>();

      for (const entry of group) {
        const position = entry.point.position;
        const cell = getNetworkCell(position);
        for (const neighborCell of getNeighborCells(cell)) {
          const candidates = grid.get(neighborCell);
          if (!candidates) continue;
          for (const candidate of candidates) {
            if (linkCount >= NETWORK_LINK_LIMIT) return;
            if ((perNodeLinks.get(entry.satellite.id_norad) ?? 0) >= 4) continue;
            if ((perNodeLinks.get(candidate.satellite.id_norad) ?? 0) >= 4) continue;
            if (
              Cartesian3.distanceSquared(position, candidate.point.position) >
              NETWORK_LINK_MAX_DISTANCE_M ** 2
            ) {
              continue;
            }

            this.networkPolylines.add({
              positions: [position, candidate.point.position],
              width: 1,
              material: Material.fromType(Material.ColorType, {
                color: Color.fromCssColorString('#7dd3fc').withAlpha(0.18),
              }),
            });
            linkCount++;
            perNodeLinks.set(
              entry.satellite.id_norad,
              (perNodeLinks.get(entry.satellite.id_norad) ?? 0) + 1,
            );
            perNodeLinks.set(
              candidate.satellite.id_norad,
              (perNodeLinks.get(candidate.satellite.id_norad) ?? 0) + 1,
            );
          }
        }

        const bucket = grid.get(cell) ?? [];
        bucket.push(entry);
        grid.set(cell, bucket);
      }
    }
  }

  private updateSunDirection() {
    const now = JulianDate.now();
    const sunInertial = Simon1994PlanetaryPositions.computeSunPositionInEarthInertialFrame(
      now,
      new Cartesian3(),
    );
    const fixedMatrix =
      Transforms.computeIcrfToFixedMatrix(now, new Matrix3()) ??
      Transforms.computeTemeToPseudoFixedMatrix(now, new Matrix3());
    const sunFixed = Matrix3.multiplyByVector(
      fixedMatrix,
      sunInertial,
      new Cartesian3(),
    );
    this.sunDirectionFixed = Cartesian3.normalize(sunFixed, this.sunDirectionFixed);
  }

  private getShadowOpacityFactor(position: Cartesian3) {
    const sunwardDistance = Cartesian3.dot(position, this.sunDirectionFixed);
    if (sunwardDistance >= 0) return 1;

    const projection = Cartesian3.multiplyByScalar(
      this.sunDirectionFixed,
      sunwardDistance,
      new Cartesian3(),
    );
    const perpendicular = Cartesian3.subtract(position, projection, new Cartesian3());
    const distanceFromShadowAxis = Cartesian3.magnitude(perpendicular);

    if (distanceFromShadowAxis < EARTH_RADIUS_M) return 0.1;
    if (distanceFromShadowAxis < EARTH_RADIUS_M * 1.12) return 0.35;
    return 1;
  }

  private isGlintAligned(position: Cartesian3) {
    const toCamera = Cartesian3.normalize(
      Cartesian3.subtract(this.viewer.camera.positionWC, position, new Cartesian3()),
      new Cartesian3(),
    );
    return Cartesian3.dot(toCamera, this.sunDirectionFixed) > 0.965;
  }

  private requestRender() {
    if (!this.viewer.isDestroyed()) {
      this.viewer.scene.requestRender();
    }
  }
}

function cloneColorWithAlpha(color: Color, alpha: number) {
  return new Color(color.red, color.green, color.blue, alpha);
}

function isStarlinkSatellite(satellite: SatelliteRecord) {
  return getConstellationId(satellite) === 'starlink';
}

function getConstellationId(satellite: SatelliteRecord) {
  if (satellite.constellation_id) return satellite.constellation_id;
  const name = satellite.object_name.toUpperCase();
  if (name.includes('STARLINK')) return 'starlink';
  if (name.includes('ONEWEB')) return 'oneweb';
  if (name.includes('IRIDIUM')) return 'iridium';
  return null;
}

function getPulse(periodMs: number, min: number, max: number) {
  const phase = (Date.now() % periodMs) / periodMs;
  const wave = (Math.sin(phase * Math.PI * 2) + 1) / 2;
  return min + (max - min) * wave;
}

function getNetworkCell(position: Cartesian3) {
  return [
    Math.floor(position.x / NETWORK_LINK_CELL_SIZE_M),
    Math.floor(position.y / NETWORK_LINK_CELL_SIZE_M),
    Math.floor(position.z / NETWORK_LINK_CELL_SIZE_M),
  ].join(':');
}

function getNeighborCells(cellKey: string) {
  const [x, y, z] = cellKey.split(':').map(Number);
  const cells: string[] = [];
  for (let dx = -1; dx <= 1; dx += 1) {
    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dz = -1; dz <= 1; dz += 1) {
        cells.push(`${x + dx}:${y + dy}:${z + dz}`);
      }
    }
  }
  return cells;
}

function buildPredictedPathPositions(satellite: SatelliteRecord) {
  const positions: Cartesian3[] = [];
  let satrec;

  try {
    satrec = twoline2satrec(satellite.line1, satellite.line2);
  } catch {
    return positions;
  }

  if (satrec?.error) return positions;

  const startMs = Date.now();
  for (let offsetSec = 0; offsetSec <= PATH_DURATION_SECONDS; offsetSec += PATH_STEP_SECONDS) {
    const date = new Date(startMs + offsetSec * 1000);
    const propagated = propagate(satrec, date);
    const positionEci = propagated?.position;
    if (!positionEci || typeof positionEci === 'boolean') continue;

    const gmst = gstime(date);
    const geodetic = eciToGeodetic(positionEci, gmst);
    const lat = degreesLat(geodetic.latitude);
    const lon = degreesLong(geodetic.longitude);
    const altM = geodetic.height * 1000;

    if (!Number.isFinite(lat) || !Number.isFinite(lon) || !Number.isFinite(altM)) {
      continue;
    }

    positions.push(Cartesian3.fromDegrees(lon, lat, altM));
  }

  return positions;
}

function satelliteToCartesian(satellite: SatelliteRecord) {
  return Cartesian3.fromDegrees(
    satellite.longitude,
    satellite.latitude,
    satellite.altitude_km * 1000,
  );
}

function isRenderableSatellite(satellite: SatelliteRecord) {
  return (
    Boolean(satellite.id_norad) &&
    Number.isFinite(satellite.latitude) &&
    Number.isFinite(satellite.longitude) &&
    Number.isFinite(satellite.altitude_km)
  );
}

function extractSatellitePickId(picked: unknown): SatellitePickId | null {
  if (!picked || typeof picked !== 'object') return null;
  const maybePicked = picked as { id?: unknown; primitive?: { id?: unknown } };
  const id = maybePicked.id ?? maybePicked.primitive?.id;
  if (!id || typeof id !== 'object') return null;
  const maybeId = id as Partial<SatellitePickId>;
  return maybeId.kind === 'satellite' && typeof maybeId.satelliteId === 'string'
    ? (maybeId as SatellitePickId)
    : null;
}

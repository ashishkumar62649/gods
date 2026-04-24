import {
  Cartesian2,
  Cartesian3,
  Color,
  ConstantPositionProperty,
  ConstantProperty,
  CustomDataSource,
  Entity,
  HeadingPitchRoll,
  Math as CesiumMath,
  PointGraphics,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  Transforms,
  type Viewer as CesiumViewer,
} from 'cesium';
import type { IRenderer } from './IRenderer';
import { COLORS } from '../core/config/theme';
import {
  type FlightData,
  type ShipData,
  type TelemetryState,
  useTelemetryStore,
} from '../core/store/useTelemetryStore';

export class TelemetryRenderer implements IRenderer {
  private viewer: CesiumViewer | null = null;
  private unsubscribe: (() => void) | null = null;
  private dataSource: CustomDataSource | null = null;
  private clickHandler: ScreenSpaceEventHandler | null = null;

  attach(viewer: CesiumViewer): void {
    this.viewer = viewer;
    this.dataSource = new CustomDataSource('telemetry');
    void viewer.dataSources.add(this.dataSource);

    this.unsubscribe = useTelemetryStore.subscribe((state) => {
      this.renderTelemetry(state);
    });

    this.clickHandler = new ScreenSpaceEventHandler(viewer.scene.canvas);
    this.clickHandler.setInputAction(
      (click: { position: Cartesian2 }) => {
        const picked = viewer.scene.pick(click.position);
        const selectedId = this.extractTelemetryId(picked);
        useTelemetryStore.getState().setSelectedEntity(selectedId);
      },
      ScreenSpaceEventType.LEFT_CLICK,
    );

    this.renderTelemetry(useTelemetryStore.getState());
  }

  detach(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;

    this.clickHandler?.destroy();
    this.clickHandler = null;

    if (this.viewer && this.dataSource && !this.viewer.isDestroyed()) {
      this.viewer.dataSources.remove(this.dataSource, true);
    }

    this.dataSource = null;
    this.viewer = null;
  }

  private renderTelemetry(state: TelemetryState): void {
    if (!this.viewer || this.viewer.isDestroyed() || !this.dataSource) {
      return;
    }

    const activeIds = new Set<string>();

    for (const flight of Object.values(state.flights)) {
      activeIds.add(flight.id);
      this.upsertFlightEntity(flight, state.selectedEntityId === flight.id);
    }

    for (const ship of Object.values(state.maritime)) {
      activeIds.add(ship.id);
      this.upsertShipEntity(ship, state.selectedEntityId === ship.id);
    }

    const staleEntities = this.dataSource.entities.values.filter(
      (entity) => !activeIds.has(entity.id),
    );
    for (const entity of staleEntities) {
      this.dataSource.entities.remove(entity);
    }

    this.viewer.scene.requestRender();
  }

  private upsertFlightEntity(flight: FlightData, selected: boolean): void {
    if (!this.dataSource) {
      return;
    }

    const position = Cartesian3.fromDegrees(flight.lon, flight.lat, flight.alt);
    const color = Color.fromCssColorString(
      flight.isMilitary ? COLORS.FLIGHT_MILITARY : COLORS.FLIGHT_COMMERCIAL,
    ).withAlpha(selected ? 1 : 0.92);
    const entity =
      this.dataSource.entities.getById(flight.id) ??
      this.dataSource.entities.add(
        new Entity({
          id: flight.id,
          name: flight.callsign || flight.id,
          point: new PointGraphics({
            pixelSize: selected ? 12 : 8,
            color,
            outlineColor: Color.BLACK.withAlpha(0.85),
            outlineWidth: 2,
            disableDepthTestDistance: 0,
          }),
        }),
      );

    this.applyTelemetryTransform(entity, position, flight.heading);
    entity.name = flight.callsign || flight.id;
    if (entity.point) {
      entity.point.pixelSize = new ConstantProperty(selected ? 12 : 8);
      entity.point.color = new ConstantProperty(color);
    }
  }

  private upsertShipEntity(ship: ShipData, selected: boolean): void {
    if (!this.dataSource) {
      return;
    }

    const position = Cartesian3.fromDegrees(ship.lon, ship.lat, 80);
    const color = Color.fromCssColorString(COLORS.TRANSIT_CYAN).withAlpha(
      selected ? 1 : 0.88,
    );
    const entity =
      this.dataSource.entities.getById(ship.id) ??
      this.dataSource.entities.add(
        new Entity({
          id: ship.id,
          name: ship.id,
          point: new PointGraphics({
            pixelSize: selected ? 11 : 7,
            color,
            outlineColor: Color.BLACK.withAlpha(0.85),
            outlineWidth: 2,
            disableDepthTestDistance: 0,
          }),
        }),
      );

    this.applyTelemetryTransform(entity, position, ship.heading);
    entity.name = ship.id;
    if (entity.point) {
      entity.point.pixelSize = new ConstantProperty(selected ? 11 : 7);
      entity.point.color = new ConstantProperty(color);
    }
  }

  private applyTelemetryTransform(
    entity: Entity,
    position: Cartesian3,
    headingDegrees: number,
  ): void {
    entity.position = new ConstantPositionProperty(position);
    entity.orientation = new ConstantProperty(
      Transforms.headingPitchRollQuaternion(
        position,
        new HeadingPitchRoll(CesiumMath.toRadians(headingDegrees), 0, 0),
      ),
    );
  }

  private extractTelemetryId(picked: unknown): string | null {
    if (!picked || typeof picked !== 'object' || !this.dataSource) {
      return null;
    }

    const maybePicked = picked as {
      id?: unknown;
      primitive?: { id?: unknown };
    };
    const pickedId = maybePicked.id ?? maybePicked.primitive?.id;
    const entityId = pickedId instanceof Entity
      ? pickedId.id
      : typeof pickedId === 'string'
        ? pickedId
        : null;

    if (!entityId) {
      return null;
    }

    return this.dataSource.entities.getById(entityId) ? entityId : null;
  }
}

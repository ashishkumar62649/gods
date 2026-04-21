import {
  Billboard,
  BillboardCollection,
  Cartesian2,
  Cartesian3,
  Cartographic,
  Color,
  DistanceDisplayCondition,
  EllipsoidGeodesic,
  HorizontalOrigin,
  Label,
  LabelCollection,
  LabelStyle,
  Math as CesiumMath,
  NearFarScalar,
  PointPrimitive,
  PointPrimitiveCollection,
  Polyline,
  PolylineCollection,
  PrimitiveCollection,
  VerticalOrigin,
  Viewer as CesiumViewer,
} from 'cesium';
import {
  AIRPORT_ICON_IMAGE,
  AirportRecord,
  DESTINATION_AIRPORT_ICON_IMAGE,
  FlightRecord,
  FlightRenderMode,
  FlightRouteSnapshot,
  FLIGHT_ICON_IMAGE,
  getFlightDisplayName,
  ORIGIN_AIRPORT_ICON_IMAGE,
  predictFlightPosition,
  SELECTED_FLIGHT_ICON_IMAGE,
} from './flights';

interface FlightPickId {
  kind: 'flight';
  flightId: string;
}

interface AirportPickId {
  kind: 'airport';
  airportId: string;
}

interface FlightPrimitiveEntry {
  dot: PointPrimitive;
  icon: Billboard;
}

interface RouteState {
  snapshot: FlightRouteSnapshot | null;
  flightId: string | null;
}

export class FlightSceneLayerManager {
  private readonly viewer: CesiumViewer;
  private readonly root: PrimitiveCollection;
  private readonly flightDots: PointPrimitiveCollection;
  private readonly flightBillboards: BillboardCollection;
  private readonly airportBillboards: BillboardCollection;
  private readonly routeAirportBillboards: BillboardCollection;
  private readonly flightLabels: LabelCollection;
  private readonly trailPolylines: PolylineCollection;
  private readonly routePolylines: PolylineCollection;
  private readonly flightEntries = new Map<string, FlightPrimitiveEntry>();
  private readonly flightRecords = new Map<string, FlightRecord>();
  private readonly selectedFlightLabel: Label;
  private readonly selectedTrailPolyline: Polyline;
  private readonly routeArcPolyline: Polyline;
  private readonly removePostRender: (() => void) | undefined;
  private flightsVisible = false;
  private airportsVisible = false;
  private renderMode: FlightRenderMode = 'dot';
  private selectedFlightId: string | null = null;
  private showSelectedTrail = false;
  private routeState: RouteState = {
    snapshot: null,
    flightId: null,
  };

  constructor(viewer: CesiumViewer) {
    this.viewer = viewer;
    this.root = new PrimitiveCollection();
    this.flightDots = this.root.add(new PointPrimitiveCollection()) as PointPrimitiveCollection;
    this.flightBillboards = this.root.add(new BillboardCollection()) as BillboardCollection;
    this.airportBillboards = this.root.add(new BillboardCollection()) as BillboardCollection;
    this.routeAirportBillboards = this.root.add(new BillboardCollection()) as BillboardCollection;
    this.flightLabels = this.root.add(new LabelCollection()) as LabelCollection;
    this.trailPolylines = this.root.add(new PolylineCollection()) as PolylineCollection;
    this.routePolylines = this.root.add(new PolylineCollection()) as PolylineCollection;

    this.selectedFlightLabel = this.flightLabels.add({
      show: false,
      position: Cartesian3.ZERO,
      font: '600 12px "Segoe UI", "Helvetica Neue", Arial, sans-serif',
      fillColor: Color.WHITE,
      outlineColor: Color.fromCssColorString('#0b1020'),
      outlineWidth: 1,
      style: LabelStyle.FILL_AND_OUTLINE,
      showBackground: true,
      backgroundColor: Color.fromCssColorString('#0d1324').withAlpha(0.82),
      backgroundPadding: new Cartesian2(10, 6),
      pixelOffset: new Cartesian2(0, -38),
      verticalOrigin: VerticalOrigin.BOTTOM,
      horizontalOrigin: HorizontalOrigin.CENTER,
    });

    this.selectedTrailPolyline = this.trailPolylines.add({
      show: false,
      width: 3.5,
      material: Color.fromCssColorString('#7effcf').withAlpha(0.42),
      positions: [],
    });

    this.routeArcPolyline = this.routePolylines.add({
      show: false,
      width: 4.2,
      material: Color.fromCssColorString('#85c6ff').withAlpha(0.72),
      positions: [],
    });

    this.airportBillboards.show = false;
    this.routeAirportBillboards.show = true;

    this.viewer.scene.primitives.add(this.root);
    this.removePostRender = this.viewer.scene.postRender.addEventListener(() => {
      this.updateAnimatedFlightPositions();
    });
  }

  destroy() {
    this.removePostRender?.();
    if (!this.viewer.isDestroyed()) {
      this.viewer.scene.primitives.remove(this.root);
      this.viewer.scene.requestRender();
    }
  }

  setFlightsVisible(visible: boolean) {
    this.flightsVisible = visible;
    this.flightDots.show = visible;
    this.flightBillboards.show = visible;
    this.refreshSelectionOverlays();
    this.requestRender();
  }

  setFlightRenderMode(mode: FlightRenderMode) {
    this.renderMode = mode;
    this.refreshFlightVisuals();
    this.requestRender();
  }

  setSelectedFlightId(flightId: string | null) {
    this.selectedFlightId = flightId;
    this.refreshFlightVisuals();
    this.refreshSelectionOverlays();
    this.requestRender();
  }

  setShowSelectedTrail(show: boolean) {
    this.showSelectedTrail = show;
    this.refreshSelectionOverlays();
    this.requestRender();
  }

  syncFlights(flights: FlightRecord[]) {
    const liveIds = new Set<string>();

    for (const flight of flights) {
      liveIds.add(flight.id);
      this.flightRecords.set(flight.id, flight);

      let entry = this.flightEntries.get(flight.id);
      if (!entry) {
        entry = {
          dot: this.flightDots.add({
            id: { kind: 'flight', flightId: flight.id } satisfies FlightPickId,
            position: Cartesian3.ZERO,
          }),
          icon: this.flightBillboards.add({
            id: { kind: 'flight', flightId: flight.id } satisfies FlightPickId,
            position: Cartesian3.ZERO,
            alignedAxis: Cartesian3.UNIT_Z,
            verticalOrigin: VerticalOrigin.CENTER,
            horizontalOrigin: HorizontalOrigin.CENTER,
            scaleByDistance: new NearFarScalar(5_000, 1.1, 20_000_000, 0.48),
          }),
        };

        this.flightEntries.set(flight.id, entry);
      }

      this.updateFlightPosition(entry, flight);
      this.applyFlightVisual(entry, flight);
    }

    for (const [flightId, entry] of this.flightEntries.entries()) {
      if (liveIds.has(flightId)) continue;

      this.flightDots.remove(entry.dot);
      this.flightBillboards.remove(entry.icon);
      this.flightEntries.delete(flightId);
      this.flightRecords.delete(flightId);
    }

    if (this.selectedFlightId && !this.flightRecords.has(this.selectedFlightId)) {
      this.selectedFlightId = null;
    }

    this.refreshSelectionOverlays();
    this.refreshRouteOverlay();
    this.requestRender();
  }

  setGlobalAirports(airports: AirportRecord[]) {
    this.airportBillboards.removeAll();

    for (const airport of airports) {
      this.airportBillboards.add({
        id: { kind: 'airport', airportId: airport.id } satisfies AirportPickId,
        image: AIRPORT_ICON_IMAGE,
        position: Cartesian3.fromDegrees(airport.longitude, airport.latitude, 0),
        verticalOrigin: VerticalOrigin.BOTTOM,
        horizontalOrigin: HorizontalOrigin.CENTER,
        width: 18,
        height: 18,
        scaleByDistance: new NearFarScalar(30_000, 1.1, 15_000_000, 0.26),
        distanceDisplayCondition: new DistanceDisplayCondition(0, 25_000_000),
        color: Color.fromCssColorString('#a6e5ff').withAlpha(0.82),
      });
    }

    this.airportBillboards.show = this.airportsVisible;
    this.requestRender();
  }

  setAirportsVisible(visible: boolean) {
    this.airportsVisible = visible;
    this.airportBillboards.show = visible;
    this.requestRender();
  }

  setTrackedRoute(snapshot: FlightRouteSnapshot | null, flightId: string | null) {
    this.routeState = {
      snapshot,
      flightId,
    };
    this.refreshRouteOverlay();
    this.requestRender();
  }

  pickFlight(windowPosition: Cartesian2) {
    const picked = this.viewer.scene.pick(windowPosition);
    const pickedId = this.extractPickId(picked);
    if (isFlightPickId(pickedId)) {
      return pickedId.flightId;
    }

    return null;
  }

  private extractPickId(picked: unknown) {
    if (!picked || typeof picked !== 'object') return null;

    if ('id' in picked) {
      return picked.id;
    }

    if ('primitive' in picked && picked.primitive && typeof picked.primitive === 'object' && 'id' in picked.primitive) {
      return picked.primitive.id;
    }

    return null;
  }

  private updateFlightPosition(entry: FlightPrimitiveEntry, flight: FlightRecord) {
    const ageSeconds = Math.min(
      20,
      Math.max(0, Date.now() / 1000 - flight.timestamp),
    );
    const predicted = predictFlightPosition(flight, ageSeconds);
    const position = Cartesian3.fromDegrees(
      predicted.longitude,
      predicted.latitude,
      Math.max(0, predicted.altitudeMeters),
    );

    entry.dot.position = position;
    entry.icon.position = position;
  }

  private applyFlightVisual(entry: FlightPrimitiveEntry, flight: FlightRecord) {
    const isSelected = this.selectedFlightId === flight.id;
    const hasSelection = Boolean(this.selectedFlightId);
    const dimmed = hasSelection && !isSelected;
    const markerColor = isSelected
      ? Color.fromCssColorString('#7effcf')
      : dimmed
        ? new Color(0.58, 0.8, 0.94, 0.28)
        : Color.fromCssColorString('#8feaff');

    entry.dot.show = this.flightsVisible && this.renderMode === 'dot' && !isSelected;
    entry.dot.pixelSize = isSelected ? 14 : 7;
    entry.dot.color = markerColor;
    entry.dot.outlineColor = isSelected
      ? Color.fromCssColorString('#dfffee')
      : new Color(0.06, 0.1, 0.18, dimmed ? 0.12 : 0.32);
    entry.dot.outlineWidth = isSelected ? 2 : 1;

    entry.icon.show = this.flightsVisible && (this.renderMode === 'icon' || isSelected);
    entry.icon.image = isSelected ? SELECTED_FLIGHT_ICON_IMAGE : FLIGHT_ICON_IMAGE;
    entry.icon.color = markerColor;
    entry.icon.rotation = CesiumMath.toRadians(-flight.headingDegrees);
    entry.icon.width = isSelected ? 44 : 28;
    entry.icon.height = isSelected ? 44 : 28;
  }

  private refreshFlightVisuals() {
    for (const [flightId, entry] of this.flightEntries.entries()) {
      const flight = this.flightRecords.get(flightId);
      if (!flight) continue;
      this.updateFlightPosition(entry, flight);
      this.applyFlightVisual(entry, flight);
    }
  }

  private refreshSelectionOverlays() {
    const selectedFlight = this.selectedFlightId
      ? this.flightRecords.get(this.selectedFlightId) ?? null
      : null;
    const showLabel = this.flightsVisible && Boolean(selectedFlight);

    if (!selectedFlight || !showLabel) {
      this.selectedFlightLabel.show = false;
      this.selectedTrailPolyline.show = false;
      this.selectedTrailPolyline.positions = [];
      return;
    }

    this.selectedFlightLabel.show = true;
    this.selectedFlightLabel.text = getFlightDisplayName(selectedFlight);
    const ageSeconds = Math.min(
      20,
      Math.max(0, Date.now() / 1000 - selectedFlight.timestamp),
    );
    const predicted = predictFlightPosition(selectedFlight, ageSeconds);
    this.selectedFlightLabel.position = Cartesian3.fromDegrees(
      predicted.longitude,
      predicted.latitude,
      Math.max(0, predicted.altitudeMeters + 2_000),
    );

    const trailPositions = this.showSelectedTrail
      ? buildTrailPositions(selectedFlight)
      : [];

    this.selectedTrailPolyline.show = this.flightsVisible && trailPositions.length > 1;
    this.selectedTrailPolyline.positions = trailPositions;
  }

  private refreshRouteOverlay() {
    const { snapshot, flightId } = this.routeState;
    const trackedFlight = flightId ? this.flightRecords.get(flightId) ?? null : null;

    if (!snapshot?.found || !snapshot.origin || !snapshot.destination || !trackedFlight) {
      this.routeArcPolyline.show = false;
      this.routeArcPolyline.positions = [];
      this.routeAirportBillboards.removeAll();
      return;
    }

    const routePositions = buildRouteArcPositions(snapshot.origin, trackedFlight, snapshot.destination);
    this.routeArcPolyline.show = routePositions.length > 1;
    this.routeArcPolyline.positions = routePositions;

    this.routeAirportBillboards.removeAll();
    this.routeAirportBillboards.add({
      image: ORIGIN_AIRPORT_ICON_IMAGE,
      position: Cartesian3.fromDegrees(snapshot.origin.longitude, snapshot.origin.latitude, 0),
      verticalOrigin: VerticalOrigin.BOTTOM,
      horizontalOrigin: HorizontalOrigin.CENTER,
      width: 24,
      height: 24,
      scaleByDistance: new NearFarScalar(20_000, 1.16, 15_000_000, 0.32),
      color: Color.fromCssColorString('#89ffd1'),
    });
    this.routeAirportBillboards.add({
      image: DESTINATION_AIRPORT_ICON_IMAGE,
      position: Cartesian3.fromDegrees(snapshot.destination.longitude, snapshot.destination.latitude, 0),
      verticalOrigin: VerticalOrigin.BOTTOM,
      horizontalOrigin: HorizontalOrigin.CENTER,
      width: 24,
      height: 24,
      scaleByDistance: new NearFarScalar(20_000, 1.16, 15_000_000, 0.32),
      color: Color.fromCssColorString('#ffc09b'),
    });

    this.selectedFlightLabel.text = getFlightDisplayName(trackedFlight);
  }

  private requestRender() {
    if (!this.viewer.isDestroyed()) {
      this.viewer.scene.requestRender();
    }
  }

  private updateAnimatedFlightPositions() {
    if (!this.flightsVisible) return;

    for (const [flightId, entry] of this.flightEntries.entries()) {
      const flight = this.flightRecords.get(flightId);
      if (!flight) continue;
      this.updateFlightPosition(entry, flight);
    }

    if (this.selectedFlightId) {
      this.refreshSelectionOverlays();
    }
  }
}

function buildTrailPositions(flight: FlightRecord) {
  return (flight.trail ?? [])
    .map((point) =>
      Cartesian3.fromDegrees(
        point.longitude,
        point.latitude,
        Math.max(0, point.altitudeMeters),
      ),
    );
}

function buildRouteArcPositions(
  origin: AirportRecord,
  flight: FlightRecord,
  destination: AirportRecord,
) {
  const firstLeg = sampleArcSegment(
    {
      latitude: origin.latitude,
      longitude: origin.longitude,
      altitudeMeters: 0,
    },
    {
      latitude: flight.latitude,
      longitude: flight.longitude,
      altitudeMeters: Math.max(0, flight.altitudeMeters),
    },
  );
  const secondLeg = sampleArcSegment(
    {
      latitude: flight.latitude,
      longitude: flight.longitude,
      altitudeMeters: Math.max(0, flight.altitudeMeters),
    },
    {
      latitude: destination.latitude,
      longitude: destination.longitude,
      altitudeMeters: 0,
    },
  );

  return [...firstLeg, ...secondLeg.slice(1)];
}

function sampleArcSegment(
  start: { latitude: number; longitude: number; altitudeMeters: number },
  end: { latitude: number; longitude: number; altitudeMeters: number },
) {
  const geodesic = new EllipsoidGeodesic(
    Cartographic.fromDegrees(start.longitude, start.latitude),
    Cartographic.fromDegrees(end.longitude, end.latitude),
  );
  const surfaceDistance = Number.isFinite(geodesic.surfaceDistance) ? geodesic.surfaceDistance : 0;
  const sampleCount = Math.max(18, Math.min(72, Math.round(surfaceDistance / 180_000)));
  const arcHeight = Math.min(340_000, Math.max(30_000, surfaceDistance * 0.045));
  const positions: Cartesian3[] = [];

  for (let index = 0; index <= sampleCount; index += 1) {
    const fraction = sampleCount === 0 ? 1 : index / sampleCount;
    const surfacePoint = geodesic.interpolateUsingFraction(fraction);
    const baseHeight =
      start.altitudeMeters +
      (end.altitudeMeters - start.altitudeMeters) * fraction;
    const liftedHeight = baseHeight + Math.sin(Math.PI * fraction) * arcHeight;

    positions.push(
      Cartesian3.fromRadians(
        surfacePoint.longitude,
        surfacePoint.latitude,
        liftedHeight,
      ),
    );
  }

  return positions;
}

function isFlightPickId(value: unknown): value is FlightPickId {
  return Boolean(
    value &&
    typeof value === 'object' &&
    'kind' in value &&
    'flightId' in value &&
    value.kind === 'flight' &&
    typeof value.flightId === 'string',
  );
}

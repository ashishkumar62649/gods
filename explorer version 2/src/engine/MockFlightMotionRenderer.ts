import {
  Cartesian2,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  type Viewer as CesiumViewer,
} from 'cesium';
import type { IRenderer } from './IRenderer';
import { FlightSceneLayerManager } from '../earth/flights/flightLayers';
import type { FlightRecord } from '../earth/flights/flights';

const BASE_TIME = Math.floor(Date.now() / 1000);

const MOCK_FLIGHTS: FlightRecord[] = [
  makeFlight('ignite21', 'IGNITE21', 25.6, 82.9, 174, true, true),
  makeFlight('gods102', 'GODS102', 18.8, 76.4, 78, false, false),
  makeFlight('atlas77', 'ATLAS77', 27.2, 88.8, 122, false, false),
  makeFlight('navy44', 'NAVY44', 14.8, 90.6, 305, true, false),
  makeFlight('cargo18', 'CARGO18', 22.0, 72.9, 92, false, false),
  makeFlight('medevac9', 'MEDEVAC9', 16.6, 80.2, 44, false, true),
];

export class MockFlightMotionRenderer implements IRenderer {
  private manager: FlightSceneLayerManager | null = null;
  private removePreRender: (() => void) | null = null;
  private handler: ScreenSpaceEventHandler | null = null;
  private syncTimer = 0;

  attach(viewer: CesiumViewer): void {
    this.manager = new FlightSceneLayerManager(viewer);
    this.manager.setFlightsVisible(true);
    this.manager.setSelectedFlightId('ignite21');
    this.manager.syncFlights(projectFlights());
    this.removePreRender = viewer.scene.preRender.addEventListener(() => {
      this.manager?.tickPositions();
    });
    this.syncTimer = window.setInterval(() => {
      this.manager?.syncFlights(projectFlights());
    }, 3000);

    this.handler = new ScreenSpaceEventHandler(viewer.scene.canvas);
    this.handler.setInputAction((movement: { position: Cartesian2 }) => {
      const flightId = this.manager?.pickFlight(movement.position);
      if (flightId) {
        this.manager?.setSelectedFlightId(flightId);
      }
    }, ScreenSpaceEventType.LEFT_CLICK);
  }

  detach(): void {
    if (this.syncTimer) {
      window.clearInterval(this.syncTimer);
      this.syncTimer = 0;
    }
    this.handler?.destroy();
    this.handler = null;
    this.removePreRender?.();
    this.removePreRender = null;
    this.manager?.destroy();
    this.manager = null;
  }
}

function projectFlights(): FlightRecord[] {
  const elapsed = Math.max(0, Math.floor(Date.now() / 1000 - BASE_TIME));
  return MOCK_FLIGHTS.map((flight, index) => {
    const drift = elapsed * flight.velocity_mps * 0.000008;
    return {
      ...flight,
      latitude: flight.latitude + Math.sin(elapsed / 55 + index) * 0.18,
      longitude: flight.longitude + drift,
      timestamp: Math.floor(Date.now() / 1000),
    };
  });
}

function makeFlight(
  id: string,
  callsign: string,
  latitude: number,
  longitude: number,
  heading: number,
  military: boolean,
  emergency: boolean,
): FlightRecord {
  return {
    id_icao: id,
    callsign,
    registration: id === 'ignite21' ? '08-8194' : null,
    aircraft_type: id === 'ignite21' ? 'C17' : 'B738',
    description: id === 'ignite21' ? 'Boeing C-17A Globemaster III' : 'Airliner',
    owner_operator: military ? 'United States Air Force' : 'Mock Air Network',
    country_origin: 'US',
    vehicle_type: 'aircraft',
    vehicle_subtype: military ? 'military' : 'commercial',
    operation_type: emergency ? 'emergency' : 'normal',
    operation_subtype: 'mock',
    latitude,
    longitude,
    altitude_baro_m: id === 'ignite21' ? 10363 : 8700,
    altitude_geom_m: null,
    velocity_mps: id === 'ignite21' ? 224 : 210,
    heading_true_deg: heading,
    heading_mag_deg: null,
    vertical_rate_mps: 0,
    on_ground: false,
    squawk: emergency ? '7700' : null,
    is_active_emergency: emergency,
    emergency_status: emergency ? 'ACTIVE' : 'NONE',
    is_military: military,
    is_interesting: id === 'ignite21',
    is_pia: false,
    is_ladd: false,
    data_source: 'mock-v2',
    timestamp: Math.floor(Date.now() / 1000),
  };
}

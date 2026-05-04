import {
  Cartesian2,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  type Viewer as CesiumViewer,
} from 'cesium';
import type { IRenderer } from './IRenderer';
import { FlightSceneLayerManager } from '../earth/flights/flightLayers';
import {
  FLIGHT_API_URL,
  FLIGHT_POLL_INTERVAL_MS,
  type FlightRecord,
  fetchFlightSnapshot,
} from '../earth/flights/flights';
import { decodeFlightLiveBinary } from '../core/api/liveBinary';
import { useLayerStore } from '../store/layerStore';
import { useSelectionStore } from '../store/selectionStore';
import { useTimelineStore } from '../store/timelineStore';

const FLIGHT_BINARY_URL = FLIGHT_API_URL.replace(/\/api\/flights$/, '/api/v2/aviation/flights/live.bin');

export class LiveFlightRenderer implements IRenderer {
  private manager: FlightSceneLayerManager | null = null;
  private removePreRender: (() => void) | null = null;
  private handler: ScreenSpaceEventHandler | null = null;
  private pollTimer = 0;
  private unsubscribeLayers: (() => void) | null = null;
  private unsubscribeTimeline: (() => void) | null = null;
  private abortController: AbortController | null = null;

  attach(viewer: CesiumViewer): void {
    this.manager = new FlightSceneLayerManager(viewer);
    this.syncVisibility();
    this.removePreRender = viewer.scene.preRender.addEventListener(() => {
      this.manager?.tickPositions();
    });
    this.unsubscribeLayers = useLayerStore.subscribe(() => this.syncVisibility());
    this.unsubscribeTimeline = useTimelineStore.subscribe(() => {
      const timeline = useTimelineStore.getState();
      if (timeline.mode === 'live') void this.refreshFlights();
    });
    this.pollTimer = window.setInterval(() => void this.refreshFlights(), FLIGHT_POLL_INTERVAL_MS);
    void this.refreshFlights();

    this.handler = new ScreenSpaceEventHandler(viewer.scene.canvas);
    this.handler.setInputAction((movement: { position: Cartesian2 }) => {
      const flightId = this.manager?.pickFlight(movement.position);
      if (flightId) {
        this.manager?.setSelectedFlightId(flightId);
        useSelectionStore.getState().selectAsset(flightId);
      }
    }, ScreenSpaceEventType.LEFT_CLICK);
  }

  detach(): void {
    if (this.pollTimer) {
      window.clearInterval(this.pollTimer);
      this.pollTimer = 0;
    }
    this.abortController?.abort();
    this.abortController = null;
    this.unsubscribeLayers?.();
    this.unsubscribeLayers = null;
    this.unsubscribeTimeline?.();
    this.unsubscribeTimeline = null;
    this.handler?.destroy();
    this.handler = null;
    this.removePreRender?.();
    this.removePreRender = null;
    this.manager?.destroy();
    this.manager = null;
  }

  private syncVisibility() {
    const layers = useLayerStore.getState().activeLayers;
    this.manager?.setFlightsVisible(Boolean(layers.aircraftAdsb || layers.aircraftMilitary));
    this.manager?.setShowSelectedTrail(Boolean(layers.aircraftTrails));
  }

  private async refreshFlights() {
    if (!this.manager) return;
    if (useTimelineStore.getState().mode !== 'live') return;
    this.abortController?.abort();
    const controller = new AbortController();
    this.abortController = controller;
    try {
      const flights = await this.fetchBinary(controller.signal);
      this.manager.syncFlights(this.filterByLayers(flights));
    } catch {
      const snapshot = await fetchFlightSnapshot(controller.signal);
      this.manager.syncFlights(this.filterByLayers(snapshot.flights));
    } finally {
      if (this.abortController === controller) {
        this.abortController = null;
      }
    }
  }

  private async fetchBinary(signal?: AbortSignal): Promise<FlightRecord[]> {
    const response = await fetch(FLIGHT_BINARY_URL, {
      signal,
      headers: { Accept: 'application/vnd.god-eyes.live+octet-stream; version=1' },
    });
    if (!response.ok) {
      throw new Error(`Flight binary feed returned ${response.status}`);
    }
    return decodeFlightLiveBinary(await response.arrayBuffer());
  }

  private filterByLayers(flights: FlightRecord[]) {
    const layers = useLayerStore.getState().activeLayers;
    return flights.filter((flight) => {
      if (flight.is_military) return Boolean(layers.aircraftMilitary);
      return Boolean(layers.aircraftAdsb);
    });
  }
}

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
  private timelineFetchKey = flightTimelineKey();

  attach(viewer: CesiumViewer): void {
    this.manager = new FlightSceneLayerManager(viewer);
    this.syncVisibility();
    this.removePreRender = viewer.scene.preRender.addEventListener(() => {
      this.manager?.tickPositions();
    });
    this.unsubscribeLayers = useLayerStore.subscribe(() => this.syncVisibility());
    this.unsubscribeTimeline = useTimelineStore.subscribe(() => {
      const nextKey = flightTimelineKey();
      if (nextKey === this.timelineFetchKey) return;
      this.timelineFetchKey = nextKey;
      void this.refreshFlights();
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
    const state = useLayerStore.getState();
    const layers = state.activeLayers;
    this.manager?.setFlightsVisible(Boolean(layers.aircraftAdsb || layers.aircraftMilitary));
    this.manager?.setShowSelectedTrail(Boolean(layers.aircraftTrails));
    this.manager?.setFlightRenderMode(state.flightRenderMode);
    this.manager?.setAssetViewState(state.flightAssetView);
    this.manager?.setSensorLinkState(state.flightSensorLink);
    this.manager?.setAviationGridState(state.aviationGrid);
    this.manager?.setGroundStationsState(state.groundStations);
  }

  private async refreshFlights() {
    if (!this.manager) return;
    const timeline = useTimelineStore.getState();
    if (timeline.mode === 'forecast') {
      this.manager.syncFlights([]);
      return;
    }

    this.abortController?.abort();
    const controller = new AbortController();
    this.abortController = controller;
    try {
      const flights = timeline.mode === 'live'
        ? await this.fetchBinary(controller.signal)
        : await this.fetchTimelineSnapshot(controller.signal);
      this.manager.syncFlights(this.filterByLayers(flights));
    } catch {
      if (controller.signal.aborted) return;
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

  private async fetchTimelineSnapshot(signal?: AbortSignal): Promise<FlightRecord[]> {
    const timeline = useTimelineStore.getState();
    const url = new URL(FLIGHT_API_URL, window.location.origin);
    url.searchParams.set('time', new Date(timeline.currentTimeMs).toISOString());
    url.searchParams.set('timeMode', timeline.mode);
    url.searchParams.set('limit', '10000');
    const response = await fetch(url.toString(), { signal });
    if (!response.ok) {
      throw new Error(`Flight timeline feed returned ${response.status}`);
    }
    const snapshot = await response.json() as { flights?: FlightRecord[] };
    return snapshot.flights ?? [];
  }

  private filterByLayers(flights: FlightRecord[]) {
    const layers = useLayerStore.getState().activeLayers;
    return flights.filter((flight) => {
      if (flight.is_military) return Boolean(layers.aircraftMilitary);
      return Boolean(layers.aircraftAdsb);
    });
  }
}

function flightTimelineKey() {
  const timeline = useTimelineStore.getState();
  if (timeline.mode === 'live') return 'live';
  return `${timeline.mode}:${Math.floor(timeline.currentTimeMs / 60_000)}`;
}

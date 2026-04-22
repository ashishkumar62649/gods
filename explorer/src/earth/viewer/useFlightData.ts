import { useEffect, useRef, useState, type MutableRefObject } from 'react';
import type {
  AviationGridState,
  FlightSceneLayerManager,
  GroundStationsState,
} from '../flights/flightLayers';
import {
  type AirportRecord,
  fetchAirports,
  fetchFlightRoute,
  fetchFlightSnapshot,
  FLIGHT_POLL_INTERVAL_MS,
  type FlightFeedState,
  type FlightRecord,
  type FlightRouteSnapshot,
} from '../flights/flights';

const INITIAL_FLIGHT_FEED: FlightFeedState = {
  status: 'idle',
  sourceLabel: 'Offline',
  message: 'Turn on Flights to load live traffic.',
  fetchedAt: null,
  flightCount: 0,
  totalAvailable: 0,
};

const INITIAL_AIRPORT_LAYER_MESSAGE =
  'Major and regional airports are online. Expand the grid to refine visibility.';

interface UseFlightDataOptions {
  flightsEnabled: boolean;
  aviationGrid: AviationGridState;
  groundStations: GroundStationsState;
  showSelectedFlightRoute: boolean;
  selectedFlightId: string | null;
  syncFlightLayers: (flights: FlightRecord[]) => void;
  flightLayerManagerRef: MutableRefObject<FlightSceneLayerManager | null>;
  flightRecordsRef: MutableRefObject<Map<string, FlightRecord>>;
  airportsLoadedRef: MutableRefObject<boolean>;
  airportsLoadingRef: MutableRefObject<boolean>;
  airportRecordsCacheRef: MutableRefObject<AirportRecord[]>;
}

export function useFlightData({
  flightsEnabled,
  aviationGrid,
  groundStations,
  showSelectedFlightRoute,
  selectedFlightId,
  syncFlightLayers,
  flightLayerManagerRef,
  flightRecordsRef,
  airportsLoadedRef,
  airportsLoadingRef,
  airportRecordsCacheRef,
}: UseFlightDataOptions) {
  const [flightFeed, setFlightFeed] = useState(INITIAL_FLIGHT_FEED);
  const [selectedFlightRoute, setSelectedFlightRoute] =
    useState<FlightRouteSnapshot | null>(null);
  const [airportLayerMessage, setAirportLayerMessage] = useState(
    INITIAL_AIRPORT_LAYER_MESSAGE,
  );
  const selectedFlightRouteRef = useRef<FlightRouteSnapshot | null>(null);

  useEffect(() => {
    if (!flightsEnabled) return;

    let cancelled = false;
    let activeController: AbortController | null = null;
    let refreshTimer = 0;

    const loadFlights = async () => {
      if (cancelled) return;

      activeController?.abort();
      activeController = new AbortController();

      setFlightFeed((current) =>
        current.status === 'live' || current.status === 'fallback'
          ? current
          : {
              ...current,
              status: 'loading',
              sourceLabel: 'Connecting',
              message: 'Loading live flight traffic...',
            },
      );

      try {
        const snapshot = await fetchFlightSnapshot(activeController.signal);
        if (cancelled) return;

        syncFlightLayers(snapshot.flights);
        setFlightFeed({
          status: snapshot.source === 'mock' ? 'fallback' : 'live',
          sourceLabel:
            snapshot.source === 'mock'
              ? 'Mock fallback'
              : snapshot.authMode === 'oauth'
                ? 'OpenSky OAuth'
                : 'OpenSky anonymous',
          message:
            snapshot.source === 'mock'
              ? snapshot.error
                ? `Fallback active: ${snapshot.error}`
                : 'Using fallback traffic feed.'
              : `${snapshot.flights.length} flights visible on the globe.`,
          fetchedAt: snapshot.fetchedAt,
          flightCount: snapshot.flights.length,
          totalAvailable: snapshot.totalAvailable,
        });
      } catch (error) {
        if (cancelled || activeController.signal.aborted) return;

        console.error('[Explorer] Flight feed failed:', error);
        setFlightFeed({
          status: 'error',
          sourceLabel: 'Offline',
          message:
            error instanceof Error
              ? error.message
              : 'Flight feed is temporarily unavailable.',
          fetchedAt: null,
          flightCount: 0,
          totalAvailable: 0,
        });
      }
    };

    void loadFlights();
    refreshTimer = window.setInterval(loadFlights, FLIGHT_POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      activeController?.abort();
      window.clearInterval(refreshTimer);
    };
  }, [flightsEnabled, syncFlightLayers]);

  useEffect(() => {
    const needsAirportDataset =
      Object.values(aviationGrid).some(Boolean) ||
      groundStations.hfdl ||
      groundStations.comms;
    if (!needsAirportDataset) return;
    if (airportsLoadedRef.current || airportsLoadingRef.current) return;

    let cancelled = false;
    const controller = new AbortController();
    airportsLoadingRef.current = true;
    setAirportLayerMessage('Loading the full airport dataset from the local proxy...');

    void fetchAirports(controller.signal)
      .then((airports) => {
        if (cancelled) return;
        airportsLoadedRef.current = true;
        airportRecordsCacheRef.current = airports;
        flightLayerManagerRef.current?.setGlobalAirports(airports);
        setAirportLayerMessage(`${airports.length} airports ready.`);
      })
      .catch((error) => {
        if (cancelled || controller.signal.aborted) return;
        console.error('[Explorer] Airport layer failed:', error);
        setAirportLayerMessage(
          error instanceof Error
            ? `Airport layer unavailable: ${error.message}`
            : 'Airport layer is temporarily unavailable.',
        );
      })
      .finally(() => {
        airportsLoadingRef.current = false;
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [
    airportRecordsCacheRef,
    airportsLoadedRef,
    airportsLoadingRef,
    aviationGrid,
    flightLayerManagerRef,
    groundStations.comms,
    groundStations.hfdl,
  ]);

  useEffect(() => {
    selectedFlightRouteRef.current = selectedFlightRoute;
  }, [selectedFlightRoute]);

  useEffect(() => {
    if (!showSelectedFlightRoute || !selectedFlightId || !flightsEnabled) {
      setSelectedFlightRoute(null);
      selectedFlightRouteRef.current = null;
      flightLayerManagerRef.current?.setTrackedRoute(null, null);
      return;
    }

    const routeFlight = flightRecordsRef.current.get(selectedFlightId);
    const callsign = routeFlight?.callsign?.trim() ?? '';
    if (!callsign) {
      const unavailableRoute: FlightRouteSnapshot = {
        callsign: null,
        found: false,
        origin: null,
        destination: null,
        error: 'This flight does not have a usable callsign for route lookup.',
      };
      setSelectedFlightRoute(unavailableRoute);
      selectedFlightRouteRef.current = unavailableRoute;
      flightLayerManagerRef.current?.setTrackedRoute(null, selectedFlightId);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    setSelectedFlightRoute(null);
    selectedFlightRouteRef.current = null;
    flightLayerManagerRef.current?.setTrackedRoute(null, null);

    void fetchFlightRoute(callsign, controller.signal)
      .then((route) => {
        if (cancelled) return;
        setSelectedFlightRoute(route);
        selectedFlightRouteRef.current = route;
        flightLayerManagerRef.current?.setTrackedRoute(
          route.found ? route : null,
          selectedFlightId,
        );
      })
      .catch((error) => {
        if (cancelled || controller.signal.aborted) return;
        console.error('[Explorer] Route lookup failed:', error);
        const failedRoute: FlightRouteSnapshot = {
          callsign,
          found: false,
          origin: null,
          destination: null,
          error:
            error instanceof Error
              ? error.message
              : 'The route service is temporarily unavailable.',
        };
        setSelectedFlightRoute(failedRoute);
        selectedFlightRouteRef.current = failedRoute;
        flightLayerManagerRef.current?.setTrackedRoute(null, selectedFlightId);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [
    flightLayerManagerRef,
    flightRecordsRef,
    flightsEnabled,
    selectedFlightId,
    showSelectedFlightRoute,
  ]);

  return {
    airportLayerMessage,
    flightFeed,
    selectedFlightRoute,
    selectedFlightRouteRef,
  };
}

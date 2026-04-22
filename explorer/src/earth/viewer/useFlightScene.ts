import { useEffect, useRef, useState, type MutableRefObject } from 'react';
import {
  Cartesian2,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  Viewer as CesiumViewer,
} from 'cesium';
import type { CesiumComponentRef } from 'resium';
import {
  AviationGridState,
  FlightAssetView,
  FlightSceneLayerManager,
  FlightSensorLinkState,
  GroundStationsState,
} from '../flights/flightLayers';
import {
  type AirportRecord,
  type FlightRecord,
  type FlightRenderMode,
  type FlightRouteSnapshot,
  getFlightRenderMode,
} from '../flights/flights';
import { getCameraCartographic } from './cameraUtils';
import { HOME_VIEW } from './viewerConfig';

interface UseFlightSceneOptions {
  viewerRef: MutableRefObject<CesiumComponentRef<CesiumViewer> | null>;
  flightLayerManagerRef: MutableRefObject<FlightSceneLayerManager | null>;
  flightRecordsRef: MutableRefObject<Map<string, FlightRecord>>;
  airportRecordsCacheRef: MutableRefObject<AirportRecord[]>;
  selectedFlightRouteRef: MutableRefObject<FlightRouteSnapshot | null>;
  flightsEnabledRef: MutableRefObject<boolean>;
  aviationGridRef: MutableRefObject<AviationGridState>;
  groundStationsRef: MutableRefObject<GroundStationsState>;
  assetViewRef: MutableRefObject<FlightAssetView>;
  sensorLinkRef: MutableRefObject<FlightSensorLinkState>;
  selectedFlightIdRef: MutableRefObject<string | null>;
  showSelectedFlightTrailRef: MutableRefObject<boolean>;
  showSelectedFlightRouteRef: MutableRefObject<boolean>;
  flightsEnabled: boolean;
  aviationGrid: AviationGridState;
  groundStations: GroundStationsState;
  assetView: FlightAssetView;
  sensorLink: FlightSensorLinkState;
  selectedFlightId: string | null;
  showSelectedFlightTrail: boolean;
  updateSelectedFlight: (flightId: string | null) => void;
}

export function useFlightScene({
  viewerRef,
  flightLayerManagerRef,
  flightRecordsRef,
  airportRecordsCacheRef,
  selectedFlightRouteRef,
  flightsEnabledRef,
  aviationGridRef,
  groundStationsRef,
  assetViewRef,
  sensorLinkRef,
  selectedFlightIdRef,
  showSelectedFlightTrailRef,
  showSelectedFlightRouteRef,
  flightsEnabled,
  aviationGrid,
  groundStations,
  assetView,
  sensorLink,
  selectedFlightId,
  showSelectedFlightTrail,
  updateSelectedFlight,
}: UseFlightSceneOptions) {
  const flightRenderModeRef = useRef<FlightRenderMode>('dot');
  const [flightRenderMode, setFlightRenderMode] =
    useState<FlightRenderMode>('dot');

  useEffect(() => {
    let cancelled = false;
    let rafId = 0;
    let removePreRender: (() => void) | undefined;

    const pollForViewer = () => {
      if (cancelled) return;

      const viewer = viewerRef.current?.cesiumElement;
      const manager = flightLayerManagerRef.current;
      if (!viewer || viewer.isDestroyed() || !manager) {
        rafId = requestAnimationFrame(pollForViewer);
        return;
      }

      removePreRender = viewer.scene.preRender.addEventListener(() => {
        flightLayerManagerRef.current?.tickPositions();
      });
    };

    rafId = requestAnimationFrame(pollForViewer);
    return () => {
      cancelled = true;
      if (rafId) cancelAnimationFrame(rafId);
      removePreRender?.();
    };
  }, [flightLayerManagerRef, viewerRef]);

  useEffect(() => {
    flightLayerManagerRef.current?.setFlightsVisible(flightsEnabled);
  }, [flightLayerManagerRef, flightsEnabled]);

  useEffect(() => {
    flightRenderModeRef.current = flightRenderMode;
    flightLayerManagerRef.current?.setFlightRenderMode(flightRenderMode);
  }, [flightLayerManagerRef, flightRenderMode]);

  useEffect(() => {
    flightLayerManagerRef.current?.setSelectedFlightId(selectedFlightId);
  }, [flightLayerManagerRef, selectedFlightId]);

  useEffect(() => {
    flightLayerManagerRef.current?.setShowSelectedTrail(showSelectedFlightTrail);
  }, [flightLayerManagerRef, showSelectedFlightTrail]);

  useEffect(() => {
    flightLayerManagerRef.current?.setAssetViewState(assetView);
  }, [assetView, flightLayerManagerRef]);

  useEffect(() => {
    flightLayerManagerRef.current?.setSensorLinkState(sensorLink);
  }, [flightLayerManagerRef, sensorLink]);

  useEffect(() => {
    flightLayerManagerRef.current?.setAviationGridState(aviationGrid);
  }, [aviationGrid, flightLayerManagerRef]);

  useEffect(() => {
    flightLayerManagerRef.current?.setGroundStationsState(groundStations);
  }, [flightLayerManagerRef, groundStations]);

  useEffect(() => {
    let cancelled = false;
    let rafId = 0;
    let localLayerManager: FlightSceneLayerManager | null = null;
    let localHandler: ScreenSpaceEventHandler | null = null;
    let attempts = 0;
    const maxAttempts = 600;

    const pollForViewer = () => {
      if (cancelled) return;
      attempts += 1;

      const viewer = viewerRef.current?.cesiumElement;
      const ready = Boolean(viewer) && !viewer!.isDestroyed();
      if (!ready) {
        if (attempts <= maxAttempts) {
          rafId = requestAnimationFrame(pollForViewer);
        }
        return;
      }

      const viewerUsed = viewer!;
      const layerManager = new FlightSceneLayerManager(viewerUsed);
      layerManager.setFlightsVisible(flightsEnabledRef.current);
      layerManager.setAviationGridState(aviationGridRef.current);
      layerManager.setGroundStationsState(groundStationsRef.current);
      layerManager.setAssetViewState(assetViewRef.current);
      layerManager.setSensorLinkState(sensorLinkRef.current);
      flightLayerManagerRef.current = layerManager;
      localLayerManager = layerManager;

      const initialMode = getFlightRenderMode(
        getCameraCartographic(viewerUsed)?.height ?? HOME_VIEW.height,
      );
      flightRenderModeRef.current = initialMode;
      setFlightRenderMode(initialMode);
      layerManager.setFlightRenderMode(initialMode);
      layerManager.setSelectedFlightId(selectedFlightIdRef.current);
      layerManager.setShowSelectedTrail(showSelectedFlightTrailRef.current);

      if (airportRecordsCacheRef.current.length > 0) {
        layerManager.setGlobalAirports(airportRecordsCacheRef.current);
      }

      if (flightRecordsRef.current.size > 0) {
        layerManager.syncFlights(Array.from(flightRecordsRef.current.values()));
      }

      if (
        showSelectedFlightRouteRef.current &&
        selectedFlightIdRef.current &&
        selectedFlightRouteRef.current?.found
      ) {
        layerManager.setTrackedRoute(
          selectedFlightRouteRef.current,
          selectedFlightIdRef.current,
        );
      }

      const handler = new ScreenSpaceEventHandler(viewerUsed.scene.canvas);
      handler.setInputAction((movement: { position: Cartesian2 }) => {
        const flightId = layerManager.pickFlight(movement.position);
        if (flightId) {
          updateSelectedFlight(flightId);
        }
      }, ScreenSpaceEventType.LEFT_CLICK);

      localHandler = handler;
    };

    rafId = requestAnimationFrame(pollForViewer);

    return () => {
      cancelled = true;
      if (rafId) cancelAnimationFrame(rafId);
      localHandler?.destroy();
      if (localLayerManager) {
        localLayerManager.destroy();
      }
      if (flightLayerManagerRef.current === localLayerManager) {
        flightLayerManagerRef.current = null;
      }
      flightRecordsRef.current.clear();
    };
  }, [
    airportRecordsCacheRef,
    assetViewRef,
    aviationGridRef,
    flightLayerManagerRef,
    flightRecordsRef,
    flightsEnabledRef,
    groundStationsRef,
    selectedFlightIdRef,
    selectedFlightRouteRef,
    sensorLinkRef,
    showSelectedFlightRouteRef,
    showSelectedFlightTrailRef,
    updateSelectedFlight,
    viewerRef,
  ]);

  useEffect(() => {
    let cancelled = false;
    let rafId = 0;
    let removeCameraListener: (() => void) | null = null;
    let attempts = 0;
    const maxAttempts = 600;

    const pollForViewer = () => {
      if (cancelled) return;
      attempts += 1;

      const viewer = viewerRef.current?.cesiumElement;
      const ready = Boolean(viewer) && !viewer!.isDestroyed();
      if (!ready) {
        if (attempts <= maxAttempts) {
          rafId = requestAnimationFrame(pollForViewer);
        }
        return;
      }

      const activeViewer = viewer!;
      const updateFlightModeFromCamera = () => {
        const nextMode = getFlightRenderMode(
          getCameraCartographic(activeViewer)?.height ?? HOME_VIEW.height,
        );
        if (nextMode !== flightRenderModeRef.current) {
          flightRenderModeRef.current = nextMode;
          setFlightRenderMode(nextMode);
        }
      };

      updateFlightModeFromCamera();
      removeCameraListener = activeViewer.camera.changed.addEventListener(
        updateFlightModeFromCamera,
      );
    };

    rafId = requestAnimationFrame(pollForViewer);

    return () => {
      cancelled = true;
      if (rafId) cancelAnimationFrame(rafId);
      removeCameraListener?.();
    };
  }, [viewerRef]);

  return { flightRenderMode };
}

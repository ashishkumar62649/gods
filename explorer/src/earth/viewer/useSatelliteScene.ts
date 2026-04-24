import { useEffect, type MutableRefObject } from 'react';
import {
  Cartesian2,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  Viewer as CesiumViewer,
} from 'cesium';
import type { CesiumComponentRef } from 'resium';
import { SatelliteSceneLayerManager } from '../satellites/SatelliteSceneLayerManager';
import type {
  SatelliteMissionFilters,
  SatelliteRecord,
} from '../satellites/satellites';

interface UseSatelliteSceneOptions {
  viewerRef: MutableRefObject<CesiumComponentRef<CesiumViewer> | null>;
  satelliteLayerManagerRef: MutableRefObject<SatelliteSceneLayerManager | null>;
  satelliteRecordsRef: MutableRefObject<Map<string, SatelliteRecord>>;
  satellitesEnabledRef: MutableRefObject<boolean>;
  starlinkFocusEnabledRef: MutableRefObject<boolean>;
  networkViewEnabledRef: MutableRefObject<boolean>;
  missionFiltersRef: MutableRefObject<SatelliteMissionFilters>;
  selectedSatelliteIdRef: MutableRefObject<string | null>;
  satellitesEnabled: boolean;
  starlinkFocusEnabled: boolean;
  networkViewEnabled: boolean;
  missionFilters: SatelliteMissionFilters;
  selectedSatelliteId: string | null;
  updateSelectedSatellite: (satelliteId: string | null) => void;
}

export function useSatelliteScene({
  viewerRef,
  satelliteLayerManagerRef,
  satelliteRecordsRef,
  satellitesEnabledRef,
  starlinkFocusEnabledRef,
  networkViewEnabledRef,
  missionFiltersRef,
  selectedSatelliteIdRef,
  satellitesEnabled,
  starlinkFocusEnabled,
  networkViewEnabled,
  missionFilters,
  selectedSatelliteId,
  updateSelectedSatellite,
}: UseSatelliteSceneOptions) {
  useEffect(() => {
    satelliteLayerManagerRef.current?.setSatellitesVisible(satellitesEnabled);
  }, [satelliteLayerManagerRef, satellitesEnabled]);

  useEffect(() => {
    satelliteLayerManagerRef.current?.setSelectedSatelliteId(selectedSatelliteId);
  }, [satelliteLayerManagerRef, selectedSatelliteId]);

  useEffect(() => {
    satelliteLayerManagerRef.current?.setStarlinkFocusEnabled(starlinkFocusEnabled);
  }, [satelliteLayerManagerRef, starlinkFocusEnabled]);

  useEffect(() => {
    satelliteLayerManagerRef.current?.setNetworkViewEnabled(networkViewEnabled);
  }, [networkViewEnabled, satelliteLayerManagerRef]);

  useEffect(() => {
    satelliteLayerManagerRef.current?.setMissionFilters(missionFilters);
  }, [missionFilters, satelliteLayerManagerRef]);

  useEffect(() => {
    let cancelled = false;
    let rafId = 0;
    let localLayerManager: SatelliteSceneLayerManager | null = null;
    let localHandler: ScreenSpaceEventHandler | null = null;
    let removeCameraListener: (() => void) | null = null;
    let removePreRender: (() => void) | null = null;
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
      const layerManager = new SatelliteSceneLayerManager(viewerUsed);
      layerManager.setSatellitesVisible(satellitesEnabledRef.current);
      layerManager.setStarlinkFocusEnabled(starlinkFocusEnabledRef.current);
      layerManager.setNetworkViewEnabled(networkViewEnabledRef.current);
      layerManager.setMissionFilters(missionFiltersRef.current);
      layerManager.setSelectedSatelliteId(selectedSatelliteIdRef.current);
      satelliteLayerManagerRef.current = layerManager;
      localLayerManager = layerManager;

      if (satelliteRecordsRef.current.size > 0) {
        layerManager.syncSatellites(
          Array.from(satelliteRecordsRef.current.values()),
        );
      }

      const handler = new ScreenSpaceEventHandler(viewerUsed.scene.canvas);
      handler.setInputAction((movement: { position: Cartesian2 }) => {
        if (!satellitesEnabledRef.current) return;

        const satelliteId = layerManager.pickSatellite(movement.position);
        if (satelliteId) {
          updateSelectedSatellite(satelliteId);
        }
      }, ScreenSpaceEventType.LEFT_CLICK);

      localHandler = handler;
      removeCameraListener = viewerUsed.camera.changed.addEventListener(() => {
        layerManager.updateCameraFading();
      });
      removePreRender = viewerUsed.scene.preRender.addEventListener(() => {
        layerManager.tickIntelligence();
      });
    };

    rafId = requestAnimationFrame(pollForViewer);

    return () => {
      cancelled = true;
      if (rafId) cancelAnimationFrame(rafId);
      localHandler?.destroy();
      removeCameraListener?.();
      removePreRender?.();
      if (localLayerManager) {
        localLayerManager.destroy();
      }
      if (satelliteLayerManagerRef.current === localLayerManager) {
        satelliteLayerManagerRef.current = null;
      }
      satelliteRecordsRef.current.clear();
    };
  }, [
    satelliteLayerManagerRef,
    satelliteRecordsRef,
    satellitesEnabledRef,
    starlinkFocusEnabledRef,
    networkViewEnabledRef,
    missionFiltersRef,
    selectedSatelliteIdRef,
    updateSelectedSatellite,
    viewerRef,
  ]);
}

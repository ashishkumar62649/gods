import { useEffect, type MutableRefObject } from 'react';
import {
  Cartesian2,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  Viewer as CesiumViewer,
} from 'cesium';
import type { CesiumComponentRef } from 'resium';
import { CableSceneLayerManager } from '../infrastructure/CableSceneLayerManager';

interface UseCableSceneOptions {
  viewerRef: MutableRefObject<CesiumComponentRef<CesiumViewer> | null>;
  cableLayerManagerRef: MutableRefObject<CableSceneLayerManager | null>;
  cablesVisibleRef: MutableRefObject<boolean>;
  shipsVisibleRef: MutableRefObject<boolean>;
  cablesVisible: boolean;
  shipsVisible: boolean;
  onCablePicked: (payload: { cableId: string; lon: number; lat: number }) => void;
}

export function useCableScene({
  viewerRef,
  cableLayerManagerRef,
  cablesVisibleRef,
  shipsVisibleRef,
  cablesVisible,
  shipsVisible,
  onCablePicked,
}: UseCableSceneOptions) {
  useEffect(() => {
    cableLayerManagerRef.current?.setCablesVisible(cablesVisible);
  }, [cableLayerManagerRef, cablesVisible]);

  useEffect(() => {
    cableLayerManagerRef.current?.setShipsVisible(shipsVisible);
  }, [cableLayerManagerRef, shipsVisible]);

  useEffect(() => {
    let cancelled = false;
    let rafId = 0;
    let localLayerManager: CableSceneLayerManager | null = null;
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
      const layerManager = new CableSceneLayerManager(viewerUsed);
      layerManager.setCablesVisible(cablesVisibleRef.current);
      layerManager.setShipsVisible(shipsVisibleRef.current);
      cableLayerManagerRef.current = layerManager;
      localLayerManager = layerManager;

      const handler = new ScreenSpaceEventHandler(viewerUsed.scene.canvas);
      handler.setInputAction((movement: { position: Cartesian2 }) => {
        if (!cablesVisibleRef.current) return;
        const cablePick = layerManager.pickCable(movement.position);
        if (cablePick) {
          onCablePicked({
            cableId: cablePick.cableId,
            lon: cablePick.lon,
            lat: cablePick.lat,
          });
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
      if (cableLayerManagerRef.current === localLayerManager) {
        cableLayerManagerRef.current = null;
      }
    };
  }, [
    cableLayerManagerRef,
    cablesVisibleRef,
    onCablePicked,
    shipsVisibleRef,
    viewerRef,
  ]);
}

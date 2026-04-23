import { useEffect, type MutableRefObject } from 'react';
import {
  Cartesian2,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  Viewer as CesiumViewer,
} from 'cesium';
import type { CesiumComponentRef } from 'resium';
import { MaritimeLayerManager } from '../maritime/MaritimeLayerManager';
import type { MaritimeVesselRecord } from '../maritime/maritime';

interface UseMaritimeSceneOptions {
  viewerRef: MutableRefObject<CesiumComponentRef<CesiumViewer> | null>;
  maritimeLayerManagerRef: MutableRefObject<MaritimeLayerManager | null>;
  maritimeRecordsRef: MutableRefObject<Map<string, MaritimeVesselRecord>>;
  maritimeEnabledRef: MutableRefObject<boolean>;
  maritimeEnabled: boolean;
}

export function useMaritimeScene({
  viewerRef,
  maritimeLayerManagerRef,
  maritimeRecordsRef,
  maritimeEnabledRef,
  maritimeEnabled,
}: UseMaritimeSceneOptions) {
  useEffect(() => {
    maritimeLayerManagerRef.current?.setVisible(maritimeEnabled);
  }, [maritimeEnabled, maritimeLayerManagerRef]);

  useEffect(() => {
    let cancelled = false;
    let rafId = 0;
    let localLayerManager: MaritimeLayerManager | null = null;
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
      const layerManager = new MaritimeLayerManager(viewerUsed);
      layerManager.setVisible(maritimeEnabledRef.current);
      maritimeLayerManagerRef.current = layerManager;
      localLayerManager = layerManager;

      if (maritimeRecordsRef.current.size > 0) {
        layerManager.syncVessels(Array.from(maritimeRecordsRef.current.values()));
      }

      const handler = new ScreenSpaceEventHandler(viewerUsed.scene.canvas);
      handler.setInputAction((movement: { endPosition: Cartesian2 }) => {
        if (!maritimeEnabledRef.current) {
          layerManager.setHoveredVesselId(null);
          return;
        }

        const vesselId = layerManager.pickVessel(movement.endPosition);
        layerManager.setHoveredVesselId(vesselId);
      }, ScreenSpaceEventType.MOUSE_MOVE);
      handler.setInputAction(() => {
        layerManager.setHoveredVesselId(null);
      }, ScreenSpaceEventType.LEFT_DOWN);

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
      if (maritimeLayerManagerRef.current === localLayerManager) {
        maritimeLayerManagerRef.current = null;
      }
      maritimeRecordsRef.current.clear();
    };
  }, [maritimeEnabledRef, maritimeLayerManagerRef, maritimeRecordsRef, viewerRef]);
}

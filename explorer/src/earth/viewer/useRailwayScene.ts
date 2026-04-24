import { useEffect, type MutableRefObject } from 'react';
import { Viewer as CesiumViewer } from 'cesium';
import type { CesiumComponentRef } from 'resium';
import { RailwayLayerManager } from '../rail/RailwayLayerManager';

interface UseRailwaySceneOptions {
  viewerRef: MutableRefObject<CesiumComponentRef<CesiumViewer> | null>;
  railwayLayerManagerRef: MutableRefObject<RailwayLayerManager | null>;
  railwayEnabledRef: MutableRefObject<boolean>;
  railwayEnabled: boolean;
}

export function useRailwayScene({
  viewerRef,
  railwayLayerManagerRef,
  railwayEnabledRef,
  railwayEnabled,
}: UseRailwaySceneOptions) {
  useEffect(() => {
    railwayLayerManagerRef.current?.setVisible(railwayEnabled);
  }, [railwayEnabled, railwayLayerManagerRef]);

  useEffect(() => {
    let cancelled = false;
    let rafId = 0;
    let localLayerManager: RailwayLayerManager | null = null;
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

      const layerManager = new RailwayLayerManager(viewer!);
      layerManager.setVisible(railwayEnabledRef.current);
      railwayLayerManagerRef.current = layerManager;
      localLayerManager = layerManager;
    };

    rafId = requestAnimationFrame(pollForViewer);

    return () => {
      cancelled = true;
      if (rafId) cancelAnimationFrame(rafId);
      localLayerManager?.destroy();
      if (railwayLayerManagerRef.current === localLayerManager) {
        railwayLayerManagerRef.current = null;
      }
    };
  }, [railwayEnabledRef, railwayLayerManagerRef, viewerRef]);
}

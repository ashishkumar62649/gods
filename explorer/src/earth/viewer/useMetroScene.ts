import { useEffect, type MutableRefObject } from 'react';
import { Viewer as CesiumViewer } from 'cesium';
import type { CesiumComponentRef } from 'resium';
import { MetroLayerManager } from '../metro/MetroLayerManager';

interface UseMetroSceneOptions {
  viewerRef: MutableRefObject<CesiumComponentRef<CesiumViewer> | null>;
  metroLayerManagerRef: MutableRefObject<MetroLayerManager | null>;
  metroEnabledRef: MutableRefObject<boolean>;
  metroEnabled: boolean;
}

export function useMetroScene({
  viewerRef,
  metroLayerManagerRef,
  metroEnabledRef,
  metroEnabled,
}: UseMetroSceneOptions) {
  useEffect(() => {
    metroLayerManagerRef.current?.setVisible(metroEnabled);
  }, [metroEnabled, metroLayerManagerRef]);

  useEffect(() => {
    let cancelled = false;
    let rafId = 0;
    let localLayerManager: MetroLayerManager | null = null;
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

      const layerManager = new MetroLayerManager(viewer!);
      layerManager.setVisible(metroEnabledRef.current);
      metroLayerManagerRef.current = layerManager;
      localLayerManager = layerManager;
    };

    rafId = requestAnimationFrame(pollForViewer);

    return () => {
      cancelled = true;
      if (rafId) cancelAnimationFrame(rafId);
      localLayerManager?.destroy();
      if (metroLayerManagerRef.current === localLayerManager) {
        metroLayerManagerRef.current = null;
      }
    };
  }, [metroEnabledRef, metroLayerManagerRef, viewerRef]);
}

import { useEffect, type MutableRefObject } from 'react';
import {
  Cesium3DTileset,
  Viewer as CesiumViewer,
  createOsmBuildingsAsync,
} from 'cesium';
import type { CesiumComponentRef } from 'resium';

interface UseBuildingsTilesetOptions {
  viewerRef: MutableRefObject<CesiumComponentRef<CesiumViewer> | null>;
  buildingsRef: MutableRefObject<Cesium3DTileset | null>;
  updateBuildingsVisibilityRef: MutableRefObject<() => void>;
}

export function useBuildingsTileset({
  viewerRef,
  buildingsRef,
  updateBuildingsVisibilityRef,
}: UseBuildingsTilesetOptions) {
  useEffect(() => {
    let cancelled = false;
    let rafId = 0;
    let localTileset: Cesium3DTileset | null = null;
    let viewerUsed: CesiumViewer | null = null;
    let attempts = 0;
    const maxAttempts = 600;

    const pollForViewer = () => {
      if (cancelled) return;
      attempts += 1;

      const viewer = viewerRef.current?.cesiumElement;
      const ready = Boolean(viewer) && !viewer!.isDestroyed();

      if (!ready) {
        if (attempts > maxAttempts) {
          console.error(
            '[Explorer] OSM Buildings: viewer never became ready — buildings not loaded.',
          );
          return;
        }
        rafId = requestAnimationFrame(pollForViewer);
        return;
      }

      const activeViewer = viewer!;
      viewerUsed = activeViewer;

      createOsmBuildingsAsync({ showOutline: false })
        .then((tileset) => {
          if (cancelled || activeViewer.isDestroyed()) {
            tileset.destroy();
            return;
          }
          if (buildingsRef.current) {
            tileset.destroy();
            return;
          }

          activeViewer.scene.primitives.add(tileset);
          buildingsRef.current = tileset;
          localTileset = tileset;
          tileset.preloadWhenHidden = true;
          tileset.preloadFlightDestinations = true;
          tileset.preferLeaves = true;
          tileset.maximumScreenSpaceError = 8;
          tileset.foveatedScreenSpaceError = false;
          tileset.initialTilesLoaded.addEventListener(() => {
            if (!activeViewer.isDestroyed()) activeViewer.scene.requestRender();
          });

          updateBuildingsVisibilityRef.current();
        })
        .catch((err) => {
          console.error('[Explorer] Failed to load OSM Buildings:', err);
        });
    };

    rafId = requestAnimationFrame(pollForViewer);

    return () => {
      cancelled = true;
      if (rafId) cancelAnimationFrame(rafId);
      if (
        localTileset &&
        !localTileset.isDestroyed() &&
        viewerUsed &&
        !viewerUsed.isDestroyed()
      ) {
        viewerUsed.scene.primitives.remove(localTileset);
      }
      if (buildingsRef.current === localTileset) {
        buildingsRef.current = null;
      }
    };
  }, [buildingsRef, updateBuildingsVisibilityRef, viewerRef]);
}

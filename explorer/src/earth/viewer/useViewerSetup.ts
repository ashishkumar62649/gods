import { useEffect, type MutableRefObject } from 'react';
import {
  Cartesian3,
  IonGeocoderService,
  Viewer as CesiumViewer,
} from 'cesium';
import type { CesiumComponentRef } from 'resium';
import { buildHome, getCameraCartographic } from './cameraUtils';
import { FLIGHT_EASING, HOME_VIEW, ionToken } from './viewerConfig';

interface UseViewerSetupOptions {
  viewerRef: MutableRefObject<CesiumComponentRef<CesiumViewer> | null>;
  geocoderRef: MutableRefObject<IonGeocoderService | null>;
  updateBuildingsVisibility: () => void;
}

export function useViewerSetup({
  viewerRef,
  geocoderRef,
  updateBuildingsVisibility,
}: UseViewerSetupOptions) {
  useEffect(() => {
    if (!ionToken) {
      console.warn(
        '[Explorer] VITE_CESIUM_ION_TOKEN is not set.\n' +
          'Copy explorer/.env.example to explorer/.env and paste your Cesium Ion token.\n' +
          'Get a token at https://ion.cesium.com/tokens.',
      );
    }

    const viewer = viewerRef.current?.cesiumElement;
    if (!viewer) return;

    const { destination, orientation } = buildHome();

    viewer.camera.setView({
      destination: Cartesian3.fromDegrees(
        HOME_VIEW.lon,
        HOME_VIEW.lat,
        HOME_VIEW.height * 1.6,
      ),
      orientation,
    });

    viewer.camera.flyTo({
      destination,
      orientation,
      duration: 2.5,
      easingFunction: FLIGHT_EASING,
    });

    const controller = viewer.scene.screenSpaceCameraController;
    controller.inertiaZoom = 0.95;
    controller.minimumZoomDistance = 1;
    controller.maximumZoomDistance = 40_000_000;
    controller.enableCollisionDetection = true;
    controller.inertiaSpin = 0.9;
    controller.inertiaTranslate = 0.9;

    viewer.scene.globe.preloadSiblings = true;
    viewer.scene.globe.tileCacheSize = 1000;

    geocoderRef.current = new IonGeocoderService({ scene: viewer.scene });
    controller.enableTilt = true;

    const updateZoomForAltitude = () => {
      const alt = getCameraCartographic(viewer)?.height ?? HOME_VIEW.height;
      let zoomFactor: number;
      let movementRatio: number;

      if (alt < 15_000) {
        zoomFactor = 1.2;
        movementRatio = 0.008;
      } else if (alt < 500_000) {
        zoomFactor = 1.5;
        movementRatio = 0.02;
      } else {
        zoomFactor = 2.5;
        movementRatio = 0.06;
      }

      (controller as unknown as { _zoomFactor: number })._zoomFactor =
        zoomFactor;
      controller.maximumMovementRatio = movementRatio;
    };

    updateZoomForAltitude();

    viewer.camera.percentageChanged = 0.01;
    const removeCameraListener = viewer.camera.changed.addEventListener(() => {
      updateBuildingsVisibility();
      updateZoomForAltitude();
    });

    return () => {
      removeCameraListener();
    };
  }, [geocoderRef, updateBuildingsVisibility, viewerRef]);
}

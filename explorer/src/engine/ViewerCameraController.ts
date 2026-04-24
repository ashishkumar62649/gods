import type { Event, ScreenSpaceCameraController, Viewer as CesiumViewer } from 'cesium';
import { ALTITUDE_THRESHOLDS, ZOOM_THRESHOLDS } from '../core/config/constants';
import {
  type TransitState,
  useTransitStore,
} from '../core/store/useTransitStore';

type TransitZoomBand = TransitState['activeZoomBand'];

export class ViewerCameraController {
  private viewer: CesiumViewer | null = null;
  private removeCameraListener: Event.RemoveCallback | null = null;

  attach(viewer: CesiumViewer): void {
    this.viewer = viewer;
    this.removeCameraListener = viewer.camera.changed.addEventListener(
      this.handleCameraChange,
    );
    this.handleCameraChange();
  }

  detach(): void {
    this.removeCameraListener?.();
    this.removeCameraListener = null;
    this.viewer = null;
  }

  private handleCameraChange = (): void => {
    if (!this.viewer || this.viewer.isDestroyed()) {
      return;
    }

    const height = this.viewer.camera.positionCartographic.height;

    this.updateZoomForAltitude(height);

    const band = getZoomBandForAltitude(height);
    const currentBand = useTransitStore.getState().activeZoomBand;

    if (currentBand !== band) {
      useTransitStore.getState().setZoomBand(band);
    }
  };

  private updateZoomForAltitude(height: number): void {
    if (!this.viewer) return;
    const controller = this.viewer.scene.screenSpaceCameraController;
    let zoomFactor: number;
    let movementRatio: number;

    if (height < 15_000) {
      zoomFactor = 1.2;
      movementRatio = 0.008;
    } else if (height < 500_000) {
      zoomFactor = 1.5;
      movementRatio = 0.02;
    } else {
      zoomFactor = 2.5;
      movementRatio = 0.06;
    }

    (controller as ScreenSpaceCameraController & { _zoomFactor: number })._zoomFactor = zoomFactor;
    controller.maximumMovementRatio = movementRatio;
  }
}

function getZoomBandForAltitude(heightMeters: number): TransitZoomBand {
  const orbitalFadeHeight = ALTITUDE_THRESHOLDS.ORBITAL_FADE;
  const cityHeight = ALTITUDE_THRESHOLDS.CLIMATE_3D_TRANSITION;
  const continentHeight = orbitalFadeHeight * ZOOM_THRESHOLDS.CONTINENT;
  const regionHeight = orbitalFadeHeight;

  if (heightMeters > continentHeight) {
    return 'SPACE';
  }

  if (heightMeters > regionHeight) {
    return 'CONTINENT';
  }

  if (heightMeters > 50_000) {
    return 'REGION';
  }

  if (heightMeters > cityHeight) {
    return 'CITY';
  }

  return 'STREET';
}

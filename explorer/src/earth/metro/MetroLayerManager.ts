import type { Viewer } from 'cesium';
import { TransitImageryLayerManager } from '../rail/TransitImageryLayerManager';

const METRO_MAX_CAMERA_ALTITUDE_M = 300_000;

export class MetroLayerManager extends TransitImageryLayerManager {
  constructor(viewer: Viewer) {
    super(viewer, {
      overlayKind: 'metro',
      alpha: 0.96,
      minimumCameraAltitudeM: 0,
      maximumCameraAltitudeM: METRO_MAX_CAMERA_ALTITUDE_M,
    });
  }
}

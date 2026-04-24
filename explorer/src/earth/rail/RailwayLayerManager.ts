import type { Viewer } from 'cesium';
import { TransitImageryLayerManager } from './TransitImageryLayerManager';

// Keep rail visible from close city views up through country scale, but
// still hide it once the camera pulls far out into the global space view.
const RAILWAY_MIN_CAMERA_ALTITUDE_M = 0;
const RAILWAY_MAX_CAMERA_ALTITUDE_M = 8_000_000;

export class RailwayLayerManager extends TransitImageryLayerManager {
  constructor(viewer: Viewer) {
    super(viewer, {
      overlayKind: 'railway',
      alpha: 1,
      minimumCameraAltitudeM: RAILWAY_MIN_CAMERA_ALTITUDE_M,
      maximumCameraAltitudeM: RAILWAY_MAX_CAMERA_ALTITUDE_M,
    });
  }
}

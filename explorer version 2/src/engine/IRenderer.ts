import type { Viewer as CesiumViewer } from 'cesium';

export interface IRenderer {
  attach(viewer: CesiumViewer): void;
  detach(): void;
}

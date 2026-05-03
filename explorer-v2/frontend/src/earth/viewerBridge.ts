import { useMapStore } from '../core/store/useMapStore';
import {
  Cartesian3,
  Math as CesiumMath,
  type Viewer as CesiumViewer,
} from 'cesium';

let activeViewer: CesiumViewer | null = null;

export function setBridgeViewer(viewer: CesiumViewer | null) {
  activeViewer = viewer;
}

export function searchPlace(query: string) {
  useMapStore.getState().requestSearch(query);
}

export function flyHome() {
  useMapStore.getState().requestFlyHome();
}

export function resetNorthUp() {
  if (!activeViewer || activeViewer.isDestroyed()) return;
  activeViewer.camera.setView({
    orientation: {
      heading: CesiumMath.toRadians(0),
      pitch: activeViewer.camera.pitch,
      roll: 0,
    },
  });
  activeViewer.scene.requestRender();
}

export function zoomGlobe(direction: 'in' | 'out') {
  if (!activeViewer || activeViewer.isDestroyed()) return;
  const amount = Math.max(
    500,
    activeViewer.camera.positionCartographic.height * 0.32,
  );
  if (direction === 'in') {
    activeViewer.camera.zoomIn(amount);
  } else {
    activeViewer.camera.zoomOut(amount);
  }
  activeViewer.scene.requestRender();
}

export function flyToNorthIndia() {
  if (!activeViewer || activeViewer.isDestroyed()) return;
  activeViewer.camera.flyTo({
    destination: Cartesian3.fromDegrees(82.9, 25.6, 2_200_000),
    orientation: {
      heading: 0,
      pitch: CesiumMath.toRadians(-58),
      roll: 0,
    },
    duration: 1.4,
  });
}

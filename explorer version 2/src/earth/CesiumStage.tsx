import CesiumMount from './CesiumMount';
import MapOverlayLayer from '../components/map-overlays/MapOverlayLayer';

export default function CesiumStage() {
  return (
    <div className="god-cesium-stage">
      <CesiumMount />
      <div className="god-map-vignette" />
      <MapOverlayLayer />
    </div>
  );
}

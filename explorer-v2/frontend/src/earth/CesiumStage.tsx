import CesiumMount from './CesiumMount';

export default function CesiumStage() {
  return (
    <div className="god-cesium-stage">
      <CesiumMount />
      <div className="god-map-vignette" />
    </div>
  );
}

import { flyHome, resetNorthUp, zoomGlobe } from '../../earth/viewerBridge';
import { IMAGERY_CHOICES, useMapStore } from '../../core/store/useMapStore';
import { useUiStore } from '../../store/uiStore';
import IconButton from '../controls/IconButton';

export default function FloatingMapControls() {
  const toggleOrbit = useMapStore((state) => state.toggleOrbit);
  const toggleBuildings = useMapStore((state) => state.toggleBuildings);
  const buildingsEnabled = useMapStore((state) => state.buildingsEnabled || state.autoBuildingsEnabled);
  const orbitEnabled = useMapStore((state) => state.orbitEnabled);
  const cameraHeadingDeg = useMapStore((state) => state.cameraHeadingDeg);
  const cameraPitchDeg = useMapStore((state) => state.cameraPitchDeg);
  const selectedImageryId = useMapStore((state) => state.selectedImageryId);
  const setImagery = useMapStore((state) => state.setImagery);
  const mapLayerPickerOpen = useUiStore((state) => state.mapLayerPickerOpen);
  const toggleMapLayerPicker = useUiStore((state) => state.toggleMapLayerPicker);

  return (
    <div className="floating-map-controls">
      <button
        className="compass god-glass"
        type="button"
        onClick={resetNorthUp}
        title={`Reset north up (${Math.round(cameraHeadingDeg)} deg heading, ${Math.round(cameraPitchDeg)} deg pitch)`}
      >
        <span style={{ transform: `rotate(${-cameraHeadingDeg}deg)` }}>N</span>
        <small>{Math.round(cameraHeadingDeg)} deg</small>
      </button>
      <div className="map-tool-stack god-glass">
        <IconButton label="Home" onClick={flyHome}>HM</IconButton>
        <IconButton label="Orbit" active={orbitEnabled} onClick={toggleOrbit}>OR</IconButton>
        <IconButton label="Buildings" active={buildingsEnabled} onClick={toggleBuildings}>BD</IconButton>
        <IconButton label="Map layers" active={mapLayerPickerOpen} onClick={toggleMapLayerPicker}>LY</IconButton>
      </div>
      <div className="map-tool-stack god-glass">
        <IconButton label="Zoom in" onClick={() => zoomGlobe('in')}>+</IconButton>
        <IconButton label="Zoom out" onClick={() => zoomGlobe('out')}>-</IconButton>
      </div>
      {mapLayerPickerOpen ? (
        <div className="map-layer-picker god-glass">
          <p className="god-kicker">Map Layers</p>
          {IMAGERY_CHOICES.map((choice) => (
            <button
              className={choice.id === selectedImageryId ? 'is-active' : ''}
              key={choice.id}
              type="button"
              onClick={() => setImagery(choice.id)}
            >
              {choice.name}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

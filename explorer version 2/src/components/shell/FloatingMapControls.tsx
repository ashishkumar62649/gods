import { flyHome } from '../../earth/viewerBridge';
import { useMapStore } from '../../core/store/useMapStore';
import IconButton from '../controls/IconButton';

export default function FloatingMapControls() {
  const toggleOrbit = useMapStore((state) => state.toggleOrbit);

  return (
    <div className="floating-map-controls">
      <div className="compass god-glass">N</div>
      <div className="map-tool-stack god-glass">
        <IconButton label="Home" onClick={flyHome}>HM</IconButton>
        <IconButton label="Orbit" onClick={toggleOrbit}>OR</IconButton>
        <IconButton label="Layers">LY</IconButton>
      </div>
      <div className="map-tool-stack god-glass">
        <IconButton label="Zoom in">+</IconButton>
        <IconButton label="Zoom out">-</IconButton>
      </div>
    </div>
  );
}

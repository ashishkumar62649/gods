import LeftControlPanel from '../../components/shell/LeftControlPanel';
import LayerToggle from '../../components/controls/LayerToggle';
import { useLayerStore } from '../../store/layerStore';

const assetLayers = [
  ['aircraftAdsb', 'Aircraft (ADS-B)', 'ADSB'],
  ['aircraftMilitary', 'Aircraft (Military)', 'MIL'],
  ['vesselsAis', 'Vessels (AIS)', 'AIS'],
  ['satellites', 'Satellites', 'SAT'],
  ['launchesDebris', 'Launches / Debris', 'ORB'],
] as const;

export default function AssetLayerPanel() {
  const activeLayers = useLayerStore((state) => state.activeLayers);
  const toggleLayer = useLayerStore((state) => state.toggleLayer);

  return (
    <LeftControlPanel>
      <div className="god-panel-scroll">
        <header className="panel-title-row"><h2>Layers</h2><button type="button">Collapse</button></header>
        <input className="panel-search" placeholder="Search layers..." />
        <section className="layer-section-v2 is-open">
          <h3>Assets</h3>
          {assetLayers.map(([id, label, icon]) => (
            <LayerToggle checked={Boolean(activeLayers[id])} icon={icon} key={id} label={label} onChange={() => toggleLayer(id)} />
          ))}
        </section>
        {['Weather', 'Aviation', 'Maritime', 'Hazards', 'Infrastructure', 'Population', 'Events'].map((name) => (
          <section className="layer-section-v2" key={name}><h3>{name}</h3></section>
        ))}
        <div className="active-layer-card">
          <span className="god-kicker">Active Layer</span>
          <b>Aircraft (ADS-B)</b>
          <p><span className="live-dot" /> Live</p>
          <button type="button">Add filter</button>
        </div>
      </div>
    </LeftControlPanel>
  );
}

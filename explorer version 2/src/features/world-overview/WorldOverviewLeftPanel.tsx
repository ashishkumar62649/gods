import { useLayerStore } from '../../store/layerStore';
import LayerToggle from '../../components/controls/LayerToggle';
import LeftControlPanel from '../../components/shell/LeftControlPanel';

const weatherLayers = [
  ['satelliteTrueColor', 'Satellite (True Color)', 'SAT'],
  ['radarPrecipitation', 'Radar (Precipitation)', 'RAD'],
  ['clouds', 'Clouds', 'CLD'],
  ['temperature', 'Temperature', 'TMP'],
  ['wind10m', 'Wind (10m)', 'WND'],
  ['pressureMslp', 'Pressure (MSLP)', 'PRS'],
  ['humidity2m', 'Humidity (2m)', 'HUM'],
] as const;

export default function WorldOverviewLeftPanel() {
  const activeLayers = useLayerStore((state) => state.activeLayers);
  const toggleLayer = useLayerStore((state) => state.toggleLayer);

  return (
    <LeftControlPanel>
      <div className="god-panel-scroll">
        <header className="panel-title-row">
          <h2>Layers</h2>
          <button type="button">Collapse</button>
        </header>
        <input className="panel-search" placeholder="Search layers..." />
        <section className="layer-section-v2 is-open">
          <h3>Weather</h3>
          {weatherLayers.map(([id, label, icon]) => (
            <LayerToggle
              checked={Boolean(activeLayers[id])}
              icon={icon}
              key={id}
              label={label}
              onChange={() => toggleLayer(id)}
            />
          ))}
        </section>
        {['Aviation', 'Maritime', 'Hazards', 'Infrastructure', 'Population', 'Events'].map((name) => (
          <section className="layer-section-v2" key={name}>
            <h3>{name}</h3>
          </section>
        ))}
        <div className="active-layer-card">
          <span className="god-kicker">Active Layer</span>
          <b>Temperature (2m)</b>
          <div className="temperature-legend" />
          <div className="legend-labels">
            <span>-30</span><span>-10</span><span>10</span><span>30</span><span>50 C</span>
          </div>
        </div>
      </div>
    </LeftControlPanel>
  );
}

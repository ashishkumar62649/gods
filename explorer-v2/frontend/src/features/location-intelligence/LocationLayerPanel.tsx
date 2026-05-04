import { useState } from 'react';
import LayerToggle from '../../components/controls/LayerToggle';
import LeftControlPanel from '../../components/shell/LeftControlPanel';
import { useLayerStore } from '../../store/layerStore';
import { useUiStore } from '../../store/uiStore';

const layers = [
  ['satelliteTrueColor', 'Satellite (True Color)', 'SAT'],
  ['radarPrecipitation', 'Radar (Precipitation)', 'RAD'],
  ['clouds', 'Clouds', 'CLD'],
  ['temperature', 'Temperature', 'TMP'],
  ['wind10m', 'Wind (10m)', 'WND'],
  ['pressureMslp', 'Pressure (MSLP)', 'PRS'],
  ['humidity2m', 'Humidity (2m)', 'HUM'],
  ['hazards', 'Hazards', 'HZ'],
  ['earthquakes', 'Earthquakes', 'EQ'],
  ['wildfires', 'Wildfires', 'FIR'],
  ['hydrology', 'Hydrology', 'HYD'],
  ['airQuality', 'Air Quality', 'AIR'],
  ['aircraftAdsb', 'Nearby Aircraft', 'ADSB'],
  ['vesselsAis', 'Nearby Vessels', 'AIS'],
  ['internetCables', 'Internet Cables', 'CAB'],
] as const;

export default function LocationLayerPanel() {
  const activeLayers = useLayerStore((state) => state.activeLayers);
  const toggleLayer = useLayerStore((state) => state.toggleLayer);
  const toggleLeftPanel = useUiStore((state) => state.toggleLeftPanel);
  const [query, setQuery] = useState('');
  const normalizedQuery = query.trim().toLowerCase();
  const visibleLayers = layers.filter(([, label]) =>
    label.toLowerCase().includes(normalizedQuery),
  );
  const activeLayer = layers.find(([id]) => activeLayers[id]);

  return (
    <LeftControlPanel>
      <div className="god-panel-scroll">
        <header className="panel-title-row"><h2>Layers</h2><button type="button" onClick={toggleLeftPanel}>Collapse</button></header>
        <input
          className="panel-search"
          placeholder="Search layers..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <section className="layer-section-v2 is-open">
          <h3>Weather</h3>
          {visibleLayers.map(([id, label, icon]) => (
            <LayerToggle checked={Boolean(activeLayers[id])} icon={icon} key={id} label={label} onChange={() => toggleLayer(id)} />
          ))}
        </section>
        <div className="active-layer-card">
          <span className="god-kicker">Active Layer</span>
          <b>{activeLayer?.[1] ?? 'No active layer'}</b>
          <div className="temperature-legend" />
          <p>Opacity 100%</p>
        </div>
      </div>
    </LeftControlPanel>
  );
}

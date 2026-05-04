import { useState } from 'react';
import LeftControlPanel from '../../components/shell/LeftControlPanel';
import LayerToggle from '../../components/controls/LayerToggle';
import { useLayerStore } from '../../store/layerStore';
import { useUiStore } from '../../store/uiStore';

const assetLayers = [
  ['aircraftAdsb', 'Aircraft (ADS-B)', 'ADSB'],
  ['aircraftMilitary', 'Aircraft (Military)', 'MIL'],
  ['aircraftTrails', 'Aircraft Trails', 'TRL'],
  ['vesselsAis', 'Vessels (AIS)', 'AIS'],
  ['satellites', 'Satellites', 'SAT'],
  ['internetCables', 'Internet Cables', 'CAB'],
  ['infrastructureAssets', 'Infrastructure Assets', 'INF'],
  ['launchesDebris', 'Launches / Debris', 'ORB'],
] as const;

export default function AssetLayerPanel() {
  const activeLayers = useLayerStore((state) => state.activeLayers);
  const layerOpacity = useLayerStore((state) => state.layerOpacity);
  const toggleLayer = useLayerStore((state) => state.toggleLayer);
  const setLayerOpacity = useLayerStore((state) => state.setLayerOpacity);
  const flightRenderMode = useLayerStore((state) => state.flightRenderMode);
  const setFlightRenderMode = useLayerStore((state) => state.setFlightRenderMode);
  const flightAssetView = useLayerStore((state) => state.flightAssetView);
  const setFlightAssetView = useLayerStore((state) => state.setFlightAssetView);
  const flightSensorLink = useLayerStore((state) => state.flightSensorLink);
  const setFlightSensorLink = useLayerStore((state) => state.setFlightSensorLink);
  const aviationGrid = useLayerStore((state) => state.aviationGrid);
  const setAviationGrid = useLayerStore((state) => state.setAviationGrid);
  const groundStations = useLayerStore((state) => state.groundStations);
  const setGroundStationLayer = useLayerStore((state) => state.setGroundStationLayer);
  const satelliteSceneMode = useLayerStore((state) => state.satelliteSceneMode);
  const setSatelliteSceneMode = useLayerStore((state) => state.setSatelliteSceneMode);
  const maritimeSceneMode = useLayerStore((state) => state.maritimeSceneMode);
  const setMaritimeSceneMode = useLayerStore((state) => state.setMaritimeSceneMode);
  const toggleLeftPanel = useUiStore((state) => state.toggleLeftPanel);
  const [query, setQuery] = useState('');
  const normalizedQuery = query.trim().toLowerCase();
  const visibleAssetLayers = assetLayers.filter(([, label]) =>
    label.toLowerCase().includes(normalizedQuery),
  );
  const hazardLayers = [
    ['hazards', 'Hazards', 'HZ'],
    ['earthquakes', 'Earthquakes', 'EQ'],
    ['wildfires', 'Wildfires', 'FIR'],
    ['storms', 'Storms / Cyclones', 'STM'],
  ] as const;
  const visibleHazardLayers = hazardLayers.filter(([, label]) =>
    label.toLowerCase().includes(normalizedQuery),
  );
  const activeLayer = [...assetLayers, ...hazardLayers].find(([id]) => activeLayers[id]);

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
          <h3>Assets</h3>
          {visibleAssetLayers.map(([id, label, icon]) => (
            <LayerToggle
              checked={Boolean(activeLayers[id])}
              icon={icon}
              key={id}
              label={label}
              opacity={layerOpacity[id] ?? 100}
              onChange={() => toggleLayer(id)}
              onOpacityChange={(opacity) => setLayerOpacity(id, opacity)}
            />
          ))}
        </section>
        <section className="layer-section-v2 is-open control-section">
          <h3>Aircraft Interaction</h3>
          <div className="control-cluster">
            <button className={flightRenderMode === 'dot' ? 'is-active' : ''} type="button" onClick={() => setFlightRenderMode('dot')}>Dots</button>
            <button className={flightRenderMode === 'icon' ? 'is-active' : ''} type="button" onClick={() => setFlightRenderMode('icon')}>Icons</button>
          </div>
          <div className="control-cluster">
            <button className={flightAssetView === 'symbology' ? 'is-active' : ''} type="button" onClick={() => setFlightAssetView('symbology')}>2D</button>
            <button className={flightAssetView === 'airframe' ? 'is-active' : ''} type="button" onClick={() => setFlightAssetView('airframe')}>3D</button>
          </div>
          <div className="control-cluster">
            <button className={flightSensorLink === 'release' ? 'is-active' : ''} type="button" onClick={() => setFlightSensorLink('release')}>Free</button>
            <button className={flightSensorLink === 'focus' ? 'is-active' : ''} type="button" onClick={() => setFlightSensorLink('focus')}>Focus</button>
            <button className={flightSensorLink === 'flight-deck' ? 'is-active' : ''} type="button" onClick={() => setFlightSensorLink('flight-deck')}>Cockpit</button>
          </div>
          <div className="mini-toggle-grid">
            <label><input checked={aviationGrid.major} type="checkbox" onChange={(event) => setAviationGrid('major', event.target.checked)} /> Major airports</label>
            <label><input checked={aviationGrid.regional} type="checkbox" onChange={(event) => setAviationGrid('regional', event.target.checked)} /> Regional</label>
            <label><input checked={aviationGrid.local} type="checkbox" onChange={(event) => setAviationGrid('local', event.target.checked)} /> Local</label>
            <label><input checked={aviationGrid.heli} type="checkbox" onChange={(event) => setAviationGrid('heli', event.target.checked)} /> Helipads</label>
            <label><input checked={aviationGrid.seaplane} type="checkbox" onChange={(event) => setAviationGrid('seaplane', event.target.checked)} /> Seaplane</label>
            <label><input checked={groundStations.hfdl} type="checkbox" onChange={(event) => setGroundStationLayer('hfdl', event.target.checked)} /> HFDL</label>
            <label><input checked={groundStations.comms} type="checkbox" onChange={(event) => setGroundStationLayer('comms', event.target.checked)} /> VDL/ACARS</label>
          </div>
        </section>
        <section className="layer-section-v2 is-open control-section">
          <h3>Cinematic Domains</h3>
          <div className="control-cluster">
            <button className={satelliteSceneMode === 'points' ? 'is-active' : ''} type="button" onClick={() => setSatelliteSceneMode('points')}>Sat points</button>
            <button className={satelliteSceneMode === 'orbit-trails' ? 'is-active' : ''} type="button" onClick={() => setSatelliteSceneMode('orbit-trails')}>Orbit trails</button>
            <button className={satelliteSceneMode === 'sensor-focus' ? 'is-active' : ''} type="button" onClick={() => setSatelliteSceneMode('sensor-focus')}>Sensor</button>
          </div>
          <div className="control-cluster">
            <button className={maritimeSceneMode === 'traffic' ? 'is-active' : ''} type="button" onClick={() => setMaritimeSceneMode('traffic')}>Traffic</button>
            <button className={maritimeSceneMode === 'cable-risk' ? 'is-active' : ''} type="button" onClick={() => setMaritimeSceneMode('cable-risk')}>Cable risk</button>
            <button className={maritimeSceneMode === 'vessel-follow' ? 'is-active' : ''} type="button" onClick={() => setMaritimeSceneMode('vessel-follow')}>Follow</button>
          </div>
        </section>
        {visibleHazardLayers.map(([id, label, icon]) => (
          <section className="layer-section-v2 is-open" key={id}>
            <LayerToggle
              checked={Boolean(activeLayers[id])}
              icon={icon}
              label={label}
              opacity={layerOpacity[id] ?? 100}
              onChange={() => toggleLayer(id)}
              onOpacityChange={(opacity) => setLayerOpacity(id, opacity)}
            />
          </section>
        ))}
        <div className="active-layer-card">
          <span className="god-kicker">Active Layer</span>
          <b>{activeLayer?.[1] ?? 'No active layer'}</b>
          <p><span className="live-dot" /> Live</p>
          <button type="button" onClick={() => setQuery(activeLayer?.[1] ?? '')}>Focus filter</button>
        </div>
      </div>
    </LeftControlPanel>
  );
}

import { useState } from 'react';
import { useLayerStore } from '../../store/layerStore';
import LayerToggle from '../../components/controls/LayerToggle';
import LeftControlPanel from '../../components/shell/LeftControlPanel';
import { useUiStore } from '../../store/uiStore';

type LayerTuple = readonly [string, string, string];

const weatherLayers: LayerTuple[] = [
  ['satelliteTrueColor', 'Satellite (True Color)', 'SAT'],
  ['radarPrecipitation', 'Radar (Precipitation)', 'RAD'],
  ['clouds', 'Clouds', 'CLD'],
  ['temperature', 'Temperature', 'TMP'],
  ['wind10m', 'Wind (10m)', 'WND'],
  ['pressureMslp', 'Pressure (MSLP)', 'PRS'],
  ['humidity2m', 'Humidity (2m)', 'HUM'],
] as const;

const domainLayerGroups: Array<{ name: string; layers: LayerTuple[] }> = [
  {
    name: 'Aviation',
    layers: [
      ['aircraftAdsb', 'Aircraft (ADS-B)', 'ADSB'],
      ['aircraftMilitary', 'Aircraft (Military)', 'MIL'],
      ['aircraftTrails', 'Aircraft Trails', 'TRL'],
    ],
  },
  {
    name: 'Satellites',
    layers: [
      ['satellites', 'Satellites', 'SAT'],
      ['launchesDebris', 'Launches / Debris', 'ORB'],
    ],
  },
  {
    name: 'Hazards',
    layers: [
      ['hazards', 'All Hazards', 'HZ'],
      ['earthquakes', 'Earthquakes', 'EQ'],
      ['volcanoes', 'Volcanoes', 'VOL'],
      ['wildfires', 'Wildfires', 'FIR'],
      ['storms', 'Storms / Cyclones', 'STM'],
      ['hydrology', 'Hydrology', 'HYD'],
      ['airQuality', 'Air Quality', 'AIR'],
    ],
  },
  {
    name: 'Maritime & Infrastructure',
    layers: [
      ['vesselsAis', 'Vessels (AIS)', 'AIS'],
      ['internetCables', 'Internet Cables', 'CAB'],
      ['infrastructureAssets', 'Infrastructure Assets', 'INF'],
    ],
  },
];

export default function WorldOverviewLeftPanel() {
  const activeLayers = useLayerStore((state) => state.activeLayers);
  const toggleLayer = useLayerStore((state) => state.toggleLayer);
  const toggleLeftPanel = useUiStore((state) => state.toggleLeftPanel);
  const [query, setQuery] = useState('');
  const normalizedQuery = query.trim().toLowerCase();
  const visibleWeatherLayers = weatherLayers.filter(([, label]) =>
    label.toLowerCase().includes(normalizedQuery),
  );
  const visibleGroups = domainLayerGroups
    .map((group) => ({
      ...group,
      layers: group.layers.filter(([, label]) =>
        label.toLowerCase().includes(normalizedQuery),
      ),
    }))
    .filter((group) => group.layers.length > 0 || group.name.toLowerCase().includes(normalizedQuery));
  const allLayers: LayerTuple[] = [
    ...weatherLayers,
    ...domainLayerGroups.flatMap((group) => group.layers),
  ];
  const activeLayer = allLayers
    .find(([id]) => activeLayers[id]);

  return (
    <LeftControlPanel>
      <div className="god-panel-scroll">
        <header className="panel-title-row">
          <h2>Layers</h2>
          <button type="button" onClick={toggleLeftPanel}>Collapse</button>
        </header>
        <input
          className="panel-search"
          placeholder="Search layers..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <section className="layer-section-v2 is-open">
          <h3>Weather</h3>
          {visibleWeatherLayers.map(([id, label, icon]) => (
            <LayerToggle
              checked={Boolean(activeLayers[id])}
              icon={icon}
              key={id}
              label={label}
              onChange={() => toggleLayer(id)}
            />
          ))}
        </section>
        {visibleGroups.map((group) => (
          <section className="layer-section-v2 is-open" key={group.name}>
            <h3>{group.name}</h3>
            {group.layers.map(([id, label, icon]) => (
              <LayerToggle
                checked={Boolean(activeLayers[id])}
                icon={icon}
                key={id}
                label={label}
                onChange={() => toggleLayer(id)}
              />
            ))}
          </section>
        ))}
        <div className="active-layer-card">
          <span className="god-kicker">Active Layer</span>
          <b>{activeLayer?.[1] ?? 'No active layer'}</b>
          <div className="temperature-legend" />
          <div className="legend-labels">
            <span>-30</span><span>-10</span><span>10</span><span>30</span><span>50 C</span>
          </div>
        </div>
      </div>
    </LeftControlPanel>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { fetchInfrastructureSnapshot } from '../../core/api/infrastructureApi';
import { fetchSatelliteTelemetry } from '../../core/api/orbitalApi';
import {
  fetchAirports,
  fetchFlightTelemetry,
  fetchMaritimeTelemetry,
} from '../../core/api/telemetryApi';
import { fetchClimateSnapshot } from '../../core/api/weatherApi';
import { INTERVALS } from '../../core/config/constants';
import { useMapStore } from '../../core/store/useMapStore';
import { useInfrastructureStore } from '../../core/store/useInfrastructureStore';
import { useSatelliteStore } from '../../core/store/useSatelliteStore';
import { useClimateStore } from '../../core/store/useClimateStore';
import { useTelemetryStore } from '../../core/store/useTelemetryStore';
import { useTransitStore } from '../../core/store/useTransitStore';

type SidebarSection = 'base' | 'intel' | 'infra' | 'weather' | 'system';
type MissionFilter = 'SIGINT' | 'NAV' | 'COMMS' | 'WEATHER';
type WeatherCategory = 'owm' | 'rainviewer' | 'eonet' | 'usgs' | 'agro';
type ImageryPanelOption = {
  id: string;
  name: string;
  tooltip: string;
  iconUrl: string;
};

const ICON_BASE = '/cesium/Widgets/Images/ImageryProviders';
const IMAGERY_PANEL_OPTIONS: ImageryPanelOption[] = [
  { id: 'maptiler-satellite', name: 'MapTiler Satellite', tooltip: 'High-resolution satellite imagery.', iconUrl: `${ICON_BASE}/bingAerial.png` },
  { id: 'bing-maps-aerial', name: 'Bing Maps Aerial', tooltip: 'Cesium ion aerial imagery.', iconUrl: `${ICON_BASE}/bingAerial.png` },
  { id: 'bing-maps-aerial-with-labels', name: 'Bing Aerial Labels', tooltip: 'Aerial imagery with labels.', iconUrl: `${ICON_BASE}/bingAerialLabels.png` },
  { id: 'bing-maps-roads', name: 'Bing Roads', tooltip: 'Road map base layer.', iconUrl: `${ICON_BASE}/bingRoads.png` },
  { id: 'arcgis-world-imagery', name: 'ArcGIS Imagery', tooltip: 'ArcGIS satellite imagery.', iconUrl: `${ICON_BASE}/ArcGisMapServiceWorldImagery.png` },
  { id: 'arcgis-world-hillshade', name: 'ArcGIS Hillshade', tooltip: 'Elevation hillshade.', iconUrl: `${ICON_BASE}/ArcGisMapServiceWorldHillshade.png` },
  { id: 'esri-world-ocean', name: 'Esri Ocean', tooltip: 'Ocean-focused base map.', iconUrl: `${ICON_BASE}/ArcGisMapServiceWorldOcean.png` },
  { id: 'openstreetmap', name: 'OpenStreetMap', tooltip: 'Collaborative world map.', iconUrl: `${ICON_BASE}/openStreetMap.png` },
  { id: 'stadia-watercolor', name: 'Stadia Watercolor', tooltip: 'Watercolor map style.', iconUrl: `${ICON_BASE}/stamenWatercolor.png` },
  { id: 'stadia-toner', name: 'Stadia Toner', tooltip: 'High-contrast black and white map.', iconUrl: `${ICON_BASE}/stamenToner.png` },
  { id: 'stadia-alidade-smooth', name: 'Alidade Smooth', tooltip: 'Muted overlay-friendly map.', iconUrl: `${ICON_BASE}/stadiaAlidadeSmooth.png` },
  { id: 'stadia-alidade-smooth-dark', name: 'Alidade Dark', tooltip: 'Dark muted map style.', iconUrl: `${ICON_BASE}/stadiaAlidadeSmoothDark.png` },
  { id: 'sentinel-2', name: 'Sentinel-2', tooltip: 'Sentinel-2 cloudless imagery.', iconUrl: `${ICON_BASE}/sentinel-2.png` },
  { id: 'blue-marble', name: 'Blue Marble', tooltip: 'NASA Blue Marble imagery.', iconUrl: `${ICON_BASE}/blueMarble.png` },
  { id: 'earth-at-night', name: 'Earth at Night', tooltip: 'NASA Earth at Night imagery.', iconUrl: `${ICON_BASE}/earthAtNight.png` },
  { id: 'natural-earth-ii', name: 'Natural Earth II', tooltip: 'Natural Earth II texture.', iconUrl: `${ICON_BASE}/naturalEarthII.png` },
];

const SECTION_TABS: Array<{ id: SidebarSection; label: string; title: string }> = [
  { id: 'base', label: 'Base', title: 'Base Layers' },
  { id: 'intel', label: 'Intel', title: 'Intel Layers' },
  { id: 'infra', label: 'Infra', title: 'Infrastructure' },
  { id: 'weather', label: 'Weather', title: 'Weather & Earth' },
  { id: 'system', label: 'System', title: 'System Controls' },
];

interface WeatherCategoryMeta {
  id: WeatherCategory;
  label: string;
  summary: string;
  source: string;
  live: boolean;
}

const WEATHER_CATEGORIES: WeatherCategoryMeta[] = [
  {
    id: 'owm',
    label: 'Atmospheric Overlays',
    summary: 'Precipitation, temperature, clouds, wind, pressure tiles.',
    source: 'OpenWeatherMap',
    live: true,
  },
  {
    id: 'rainviewer',
    label: 'Live Radar',
    summary: 'Real-time precipitation radar mosaic + 2-hour nowcast.',
    source: 'RainViewer',
    live: false,
  },
  {
    id: 'eonet',
    label: 'Natural Events',
    summary: 'Wildfires, volcanoes, severe storms, floods, landslides.',
    source: 'NASA EONET',
    live: false,
  },
  {
    id: 'usgs',
    label: 'Earth & Hazards',
    summary: 'Earthquakes, flood gauges, Landsat imagery.',
    source: 'USGS',
    live: false,
  },
  {
    id: 'agro',
    label: 'Field Intelligence',
    summary: 'NDVI, soil moisture, crop health (on-demand · 10/month).',
    source: 'AgroMonitoring',
    live: false,
  },
];

export default function GlobalLayerPanel() {
  const [activeSection, setActiveSection] = useState<SidebarSection>('base');
  const [openWeatherCategory, setOpenWeatherCategory] = useState<WeatherCategory | null>(null);
  const imageryOptions = useMemo(() => IMAGERY_PANEL_OPTIONS, []);

  const selectedImageryId = useMapStore((state) => state.selectedImageryId);
  const buildingsEnabled = useMapStore((state) => state.buildingsEnabled);
  const autoBuildingsEnabled = useMapStore((state) => state.autoBuildingsEnabled);
  const orbitEnabled = useMapStore((state) => state.orbitEnabled);
  const setImagery = useMapStore((state) => state.setImagery);
  const toggleBuildings = useMapStore((state) => state.toggleBuildings);
  const toggleOrbit = useMapStore((state) => state.toggleOrbit);
  const requestFlyHome = useMapStore((state) => state.requestFlyHome);

  const activeClimateLayers = useClimateStore((state) => state.activeLayers);
  const toggleClimateLayer = useClimateStore((state) => state.toggleLayer);
  const setClimateSnapshot = useClimateStore((state) => state.setClimateSnapshot);

  const visibleTransitNetworks = useTransitStore((state) => state.visibleNetworks);
  const toggleTransitNetwork = useTransitStore((state) => state.toggleNetwork);

  const feedStatus = useTelemetryStore((state) => state.feedStatus);
  const flightsVisible = useTelemetryStore((state) => state.flightsVisible);
  const maritimeVisible = useTelemetryStore((state) => state.maritimeVisible);
  const aviationGrid = useTelemetryStore((state) => state.aviationGrid);
  const groundStations = useTelemetryStore((state) => state.groundStations);
  const flightCount = useTelemetryStore((state) => state.flightCount);
  const shipCount = useTelemetryStore((state) => state.shipCount);
  const setFeedStatus = useTelemetryStore((state) => state.setFeedStatus);
  const upsertFlights = useTelemetryStore((state) => state.upsertFlights);
  const upsertMaritime = useTelemetryStore((state) => state.upsertMaritime);
  const setAirports = useTelemetryStore((state) => state.setAirports);
  const toggleFlightsVisible = useTelemetryStore((state) => state.toggleFlightsVisible);
  const toggleMaritimeVisible = useTelemetryStore((state) => state.toggleMaritimeVisible);
  const toggleAviationGrid = useTelemetryStore((state) => state.toggleAviationGrid);
  const toggleGroundStationLayer = useTelemetryStore((state) => state.toggleGroundStationLayer);

  const satellitesVisible = useSatelliteStore((state) => state.satellitesVisible);
  const starlinkFocusEnabled = useSatelliteStore((state) => state.starlinkFocusEnabled);
  const networkViewEnabled = useSatelliteStore((state) => state.networkViewEnabled);
  const missionFilters = useSatelliteStore((state) => state.missionFilters);
  const satelliteFeedStatus = useSatelliteStore((state) => state.feedStatus);
  const satelliteMessage = useSatelliteStore((state) => state.message);
  const satelliteCount = useSatelliteStore((state) => state.satelliteCount);
  const upsertSatellites = useSatelliteStore((state) => state.upsertSatellites);
  const toggleSatellitesVisible = useSatelliteStore((state) => state.toggleSatellitesVisible);
  const toggleStarlinkFocus = useSatelliteStore((state) => state.toggleStarlinkFocus);
  const toggleNetworkView = useSatelliteStore((state) => state.toggleNetworkView);
  const toggleMissionFilter = useSatelliteStore((state) => state.toggleMissionFilter);
  const setSatelliteFeedStatus = useSatelliteStore((state) => state.setSatelliteFeedStatus);

  const cablesVisible = useInfrastructureStore((state) => state.cablesVisible);
  const infrastructureFeedStatus = useInfrastructureStore((state) => state.feedStatus);
  const infrastructureMessage = useInfrastructureStore((state) => state.message);
  const cableCount = useInfrastructureStore((state) => state.cableCount);
  const setInfrastructureSnapshot = useInfrastructureStore((state) => state.setInfrastructureSnapshot);
  const toggleCablesVisible = useInfrastructureStore((state) => state.toggleCablesVisible);
  const setInfrastructureFeedStatus = useInfrastructureStore(
    (state) => state.setInfrastructureFeedStatus,
  );

  useEffect(() => {
    let cancelled = false;

    const syncTelemetry = async () => {
      setFeedStatus('reconnecting');
      const [flights, ships, airports] = await Promise.all([
        fetchFlightTelemetry(),
        fetchMaritimeTelemetry(),
        fetchAirports(),
      ]);

      if (cancelled) return;
      upsertFlights(flights);
      upsertMaritime(ships);
      setAirports(airports);
      setFeedStatus('connected');
    };

    void syncTelemetry();
    const intervalId = window.setInterval(
      syncTelemetry,
      INTERVALS.TELEMETRY_SYNC_MS,
    );

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [setAirports, setFeedStatus, upsertFlights, upsertMaritime]);

  useEffect(() => {
    let cancelled = false;

    const syncSatellites = async () => {
      setSatelliteFeedStatus('loading', 'Refreshing satellite feed.');
      const satellites = await fetchSatelliteTelemetry();
      if (cancelled) return;
      upsertSatellites(satellites);
      setSatelliteFeedStatus(
        satellites.length > 0 ? 'live' : 'error',
        satellites.length > 0
          ? `${satellites.length.toLocaleString()} satellites loaded.`
          : 'Satellite feed returned no objects.',
      );
    };

    void syncSatellites();
    const intervalId = window.setInterval(syncSatellites, 20_000);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [setSatelliteFeedStatus, upsertSatellites]);

  useEffect(() => {
    let cancelled = false;

    const syncClimate = async () => {
      try {
        const snapshot = await fetchClimateSnapshot();
        if (cancelled) return;
        setClimateSnapshot(snapshot);
      } catch {
        // swallow — renderer falls back to NONE; next poll will retry
      }
    };

    void syncClimate();
    const intervalId = window.setInterval(syncClimate, 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [setClimateSnapshot]);

  useEffect(() => {
    let cancelled = false;

    const syncInfrastructure = async () => {
      setInfrastructureFeedStatus('loading', 'Refreshing infrastructure feed.');
      const snapshot = await fetchInfrastructureSnapshot();
      if (cancelled) return;
      setInfrastructureSnapshot(snapshot.cables, snapshot.ships, snapshot.nodes);
      setInfrastructureFeedStatus(
        snapshot.cables.length > 0 ? 'live' : 'error',
        snapshot.cables.length > 0
          ? `${snapshot.cables.length.toLocaleString()} cable systems loaded.`
          : 'Infrastructure feed returned no cable systems.',
      );
    };

    void syncInfrastructure();
    const intervalId = window.setInterval(syncInfrastructure, 30_000);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [setInfrastructureFeedStatus, setInfrastructureSnapshot]);

  const currentSection = SECTION_TABS.find((tab) => tab.id === activeSection)!;

  const renderSection = () => {
    switch (activeSection) {
      case 'base':
        return (
          <>
            <ImageryGrid
              imageryOptions={imageryOptions}
              selectedImageryId={selectedImageryId}
              onSelect={(option) => setImagery(option.id)}
            />
            <ToggleRow
              label={autoBuildingsEnabled ? '3D Buildings (Auto)' : '3D Buildings'}
              checked={buildingsEnabled || autoBuildingsEnabled}
              onToggle={toggleBuildings}
            />
            <ToggleRow label="Camera Orbit" checked={orbitEnabled} onToggle={toggleOrbit} />
          </>
        );
      case 'intel':
        return (
          <>
            <ToggleRow label="Flights" checked={flightsVisible} onToggle={toggleFlightsVisible} />
            {flightsVisible && <FlightFiltersUI />}
            <ToggleRow label="Maritime Traffic" checked={maritimeVisible} onToggle={toggleMaritimeVisible} />
            <ToggleRow label="Satellites" checked={satellitesVisible} onToggle={toggleSatellitesVisible} />
            <ToggleRow label="Starlink Focus" checked={starlinkFocusEnabled} onToggle={toggleStarlinkFocus} />
            <ToggleRow label="Network View" checked={networkViewEnabled} onToggle={toggleNetworkView} />
            {(['SIGINT', 'NAV', 'COMMS', 'WEATHER'] as MissionFilter[]).map((filter) => (
              <ToggleRow
                key={filter}
                label={`${filter} Missions`}
                checked={missionFilters[filter]}
                onToggle={() => toggleMissionFilter(filter)}
              />
            ))}
          </>
        );
      case 'infra':
        return (
          <>
            <ToggleRow label="Subsea Cables" checked={cablesVisible} onToggle={toggleCablesVisible} />
            <ToggleRow label="Major Airports" checked={aviationGrid.major} onToggle={() => toggleAviationGrid('major')} />
            <ToggleRow label="Regional Airports" checked={aviationGrid.regional} onToggle={() => toggleAviationGrid('regional')} />
            <ToggleRow label="Local Airstrips" checked={aviationGrid.local} onToggle={() => toggleAviationGrid('local')} />
            <ToggleRow label="Helipads" checked={aviationGrid.heli} onToggle={() => toggleAviationGrid('heli')} />
            <ToggleRow label="Seaplane Bases" checked={aviationGrid.seaplane} onToggle={() => toggleAviationGrid('seaplane')} />
            <ToggleRow label="HFDL Stations" checked={groundStations.hfdl} onToggle={() => toggleGroundStationLayer('hfdl')} />
            <ToggleRow label="VDL + ACARS" checked={groundStations.comms} onToggle={() => toggleGroundStationLayer('comms')} />
            <ToggleRow label="Metro Rail" checked={visibleTransitNetworks.metro} onToggle={() => toggleTransitNetwork('metro')} />
            <ToggleRow label="Railway" checked={visibleTransitNetworks.railway} onToggle={() => toggleTransitNetwork('railway')} />
          </>
        );
      case 'weather':
        return (
          <>
            {WEATHER_CATEGORIES.map((cat) => {
              const isOpen = openWeatherCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  className={
                    isOpen
                      ? 'layer-card layer-card--toggle layer-card--active flex justify-between items-center w-full py-1.5 aether-data-row'
                      : 'layer-card layer-card--toggle flex justify-between items-center w-full py-1.5 aether-data-row'
                  }
                  onClick={() => setOpenWeatherCategory(isOpen ? null : cat.id)}
                >
                  <span className="layer-card__body">
                    <span className="layer-card__label">{cat.label}</span>
                  </span>
                  <span
                    className={
                      cat.live
                        ? 'layer-badge layer-badge--live'
                        : 'layer-badge'
                    }
                  >
                    {cat.live ? 'Live' : 'Soon'}
                  </span>
                </button>
              );
            })}
          </>
        );
      case 'system':
        return (
          <>
            <button
              type="button"
              className="layer-card layer-card--toggle layer-card--active flex justify-between items-center w-full py-1.5 aether-data-row"
              onClick={requestFlyHome}
            >
              <span className="layer-card__body">
                <span className="layer-card__label">Fly to Home</span>
                <span className="layer-card__meta">Reset camera view</span>
              </span>
              <span className="layer-switch layer-switch--on" aria-hidden="true">
                <span className="layer-switch__text">Go</span>
              </span>
            </button>
            <LiveFeedCard
              feeds={[
                { label: 'Flights', status: feedStatus, count: flightCount },
                { label: 'Maritime', status: feedStatus, count: shipCount },
                { label: 'Satellites', status: satelliteFeedStatus, count: satelliteCount, message: satelliteMessage },
                { label: 'Infrastructure', status: infrastructureFeedStatus, count: cableCount, message: infrastructureMessage },
              ]}
            />
          </>
        );
      default:
        return null;
    }
  };

  const showWeatherFlyout = activeSection === 'weather' && openWeatherCategory !== null;

  return (
    <>
    <aside
      className="layer-sidebar absolute top-24 left-4 z-40 w-[clamp(16rem,18vw,20rem)] h-[clamp(30rem,60vh,45rem)] aether-panel rounded-2xl flex flex-col overflow-hidden"
      style={{ pointerEvents: 'auto' }}
      aria-label="Global layer controls"
    >
      <div className="layer-sidebar__panel flex flex-col h-full overflow-hidden">
        <div className="layer-tabs" role="tablist" aria-label="Layer groups">
          {SECTION_TABS.map((section) => (
            <button
              key={section.id}
              type="button"
              role="tab"
              aria-selected={activeSection === section.id}
              className={
                activeSection === section.id
                  ? `layer-tab layer-tab--${section.id} layer-tab--active`
                  : `layer-tab layer-tab--${section.id}`
              }
              onClick={() => {
                setActiveSection(section.id);
                if (section.id !== 'weather') setOpenWeatherCategory(null);
              }}
            >
              {section.label}
            </button>
          ))}
        </div>
        <section className={`layer-section layer-section--${activeSection} flex flex-col flex-1 overflow-hidden`}>
          <div className="layer-section__header">
            <p className="layer-section__eyebrow aether-kicker">God's Eye</p>
            <h2 className="layer-section__title aether-glow-text">{currentSection.title}</h2>
          </div>
          <div className="layer-section__body flex-1 overflow-y-auto custom-scrollbar p-3">
            {renderSection()}
          </div>
        </section>
      </div>
    </aside>
    {showWeatherFlyout && openWeatherCategory && (
      <WeatherFlyout
        category={openWeatherCategory}
        activeLayers={activeClimateLayers}
        toggleLayer={toggleClimateLayer}
        onClose={() => setOpenWeatherCategory(null)}
      />
    )}
    </>
  );
}

interface LiveFeedItem {
  label: string;
  status: string;
  count: number;
  message?: string;
}

function LiveFeedCard({ feeds }: { feeds: LiveFeedItem[] }) {
  return (
    <div className="layer-card layer-card--status flex flex-col w-full py-2 aether-data-row" style={{ gap: '0.5rem' }}>
      <span className="layer-card__label">Live Feed</span>
      {feeds.map((feed) => (
        <div key={feed.label} className="flex justify-between items-center" style={{ fontSize: '0.72rem' }}>
          <span className="layer-card__meta" style={{ opacity: 0.85 }}>{feed.label}</span>
          <span
            style={{
              color: feed.status === 'live' || feed.status === 'connected' ? '#5eead4' : '#fbbf24',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {feed.count.toLocaleString()} · {feed.status}
          </span>
        </div>
      ))}
    </div>
  );
}

interface ImageryGridProps {
  imageryOptions: ImageryPanelOption[];
  selectedImageryId: string;
  onSelect: (option: ImageryPanelOption) => void;
}

function ImageryGrid({ imageryOptions, selectedImageryId, onSelect }: ImageryGridProps) {
  return (
    <div className="imagery-flyout__grid" style={{ marginBottom: '0.75rem' }}>
      {imageryOptions.map((option) => (
        <button
          key={option.id}
          type="button"
          className={
            option.id === selectedImageryId
              ? 'imagery-option imagery-option--active'
              : 'imagery-option'
          }
          onClick={() => onSelect(option)}
          title={option.tooltip}
        >
          <img className="imagery-option__thumb" src={option.iconUrl} alt="" />
          <span className="imagery-option__name">{option.name}</span>
        </button>
      ))}
    </div>
  );
}

function FlightFiltersUI() {
  const flightFilters = useTelemetryStore((state) => state.flightFilters);
  const toggleFlightFilter = useTelemetryStore((state) => state.toggleFlightFilter);

  const VEHICLE_TAXONOMY = {
    'Airplane': ['Fixed-Wing', 'Jet', 'Propeller'],
    'Helicopter': ['Rotorcraft'],
    'Drone': ['UAV'],
    'Other': ['Balloon', 'Glider', 'Airship']
  };

  const OPERATION_TAXONOMY = {
    'Military': ['Air Force', 'Navy', 'Army', 'Coast Guard', 'General Military'],
    'Cargo': ['FedEx', 'UPS', 'Amazon Air', 'DHL', 'Freight Carrier'],
    'Passenger': ['Delta', 'United', 'American', 'Southwest', 'Ryanair', 'Commercial Airline'],
    'Private': ['Fractional Ownership', 'Corporate Trust', 'Corporate / LLC', 'General Aviation']
  };

  return (
    <div style={{ paddingLeft: '0.75rem', marginBottom: '0.5rem', display: 'flex', flexDirection: 'column' }}>
      <h4 style={{ margin: '0.25rem 0', color: 'rgba(103,232,249,0.7)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Vehicle Types</h4>
      <FilterTree category="vehicle" taxonomy={VEHICLE_TAXONOMY} filters={flightFilters.vehicle} toggle={toggleFlightFilter} />
      
      <h4 style={{ margin: '0.5rem 0 0.25rem 0', color: 'rgba(103,232,249,0.7)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Operations</h4>
      <FilterTree category="operation" taxonomy={OPERATION_TAXONOMY} filters={flightFilters.operation} toggle={toggleFlightFilter} />
    </div>
  );
}

function FilterTree({ category, taxonomy, filters, toggle }: any) {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', borderLeft: '1px solid rgba(103,232,249,0.2)', paddingLeft: '0.5rem', marginLeft: '0.25rem' }}>
      {Object.entries(taxonomy).map(([topLevel, subLevels]) => {
        const isTopLevelActive = filters[topLevel]?.['*'] ?? true;
        
        return (
          <div key={topLevel} style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', padding: '0.15rem 0' }}>
              <button 
                type="button"
                style={{ fontSize: '0.8rem', color: '#cffafe', opacity: 0.85, background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left', flex: 1 }}
                onClick={() => setExpanded(expanded === topLevel ? null : topLevel)}
              >
                <span style={{ display: 'inline-block', width: '14px', fontSize: '0.6rem' }}>{expanded === topLevel ? '▼' : '▶'}</span> {topLevel}
              </button>
              <input 
                type="checkbox" 
                checked={isTopLevelActive} 
                onChange={(e) => toggle(category, topLevel, null, e.target.checked)} 
                style={{ cursor: 'pointer', accentColor: '#06b6d4' }}
              />
            </div>
            
            {expanded === topLevel && (
              <div style={{ display: 'flex', flexDirection: 'column', paddingLeft: '1rem', marginTop: '2px', gap: '2px' }}>
                {(subLevels as string[]).map((subLevel) => {
                  const isSubLevelActive = filters[topLevel]?.[subLevel] ?? isTopLevelActive;
                  return (
                    <div key={subLevel} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', padding: '0.1rem 0' }}>
                      <span style={{ fontSize: '0.7rem', color: '#cffafe', opacity: 0.65 }}>{subLevel}</span>
                      <input 
                        type="checkbox" 
                        checked={isSubLevelActive} 
                        onChange={(e) => toggle(category, topLevel, subLevel, e.target.checked)} 
                        style={{ cursor: 'pointer', accentColor: '#0891b2', transform: 'scale(0.85)' }}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ToggleRow({
  label,
  checked,
  onToggle,
}: {
  label: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      className={
        checked
          ? 'layer-card layer-card--toggle layer-card--active flex justify-between items-center w-full py-1.5 aether-data-row'
          : 'layer-card layer-card--toggle flex justify-between items-center w-full py-1.5 aether-data-row'
      }
      onClick={onToggle}
    >
      <span className="layer-card__body">
        <span className="layer-card__label">{label}</span>
      </span>
      <span className={checked ? 'layer-switch layer-switch--on' : 'layer-switch'} aria-hidden="true">
        <span className="layer-switch__thumb" />
        <span className="layer-switch__text">{checked ? 'On' : 'Off'}</span>
      </span>
    </button>
  );
}

function DisabledRow({ label, meta }: { label: string; meta?: string }) {
  return (
    <div
      className="layer-card layer-card--toggle flex justify-between items-center w-full py-1.5 aether-data-row"
      style={{ opacity: 0.45, cursor: 'not-allowed' }}
      aria-disabled="true"
    >
      <span className="layer-card__body">
        <span className="layer-card__label">{label}</span>
        {meta ? <span className="layer-card__meta">{meta}</span> : null}
      </span>
      <span className="layer-badge">Soon</span>
    </div>
  );
}

interface WeatherFlyoutProps {
  category: WeatherCategory;
  activeLayers: {
    precipitation: boolean;
    temperature: boolean;
    clouds: boolean;
    wind: boolean;
    pressure: boolean;
    fog: boolean;
    lighting: boolean;
  };
  toggleLayer: (
    layer: 'precipitation' | 'temperature' | 'clouds' | 'wind' | 'pressure' | 'fog' | 'lighting',
  ) => void;
  onClose: () => void;
}

function WeatherFlyout({ category, activeLayers, toggleLayer, onClose }: WeatherFlyoutProps) {
  const meta = WEATHER_CATEGORIES.find((c) => c.id === category);
  if (!meta) return null;

  return (
    <aside
      className="layer-sidebar absolute top-24 z-40 w-[clamp(16rem,20vw,22rem)] h-[clamp(30rem,60vh,45rem)] aether-panel rounded-2xl flex flex-col overflow-hidden"
      style={{
        left: 'calc(1rem + clamp(16rem, 18vw, 20rem) + 0.75rem)',
        pointerEvents: 'auto',
      }}
      aria-label={`${meta.label} controls`}
    >
      <div className="layer-sidebar__panel flex flex-col h-full overflow-hidden">
        <div className="layer-section__header flex justify-between items-start" style={{ paddingRight: '0.75rem' }}>
          <div>
            <p className="layer-section__eyebrow aether-kicker">{meta.source}</p>
            <h2 className="layer-section__title aether-glow-text">{meta.label}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="layer-badge"
            style={{ cursor: 'pointer' }}
            aria-label="Close category panel"
          >
            Close
          </button>
        </div>
        <div className="layer-section__body flex-1 overflow-y-auto custom-scrollbar p-3">
          {category === 'owm' && (
            <>
              <ToggleRow
                label="Precipitation"
                checked={activeLayers.precipitation}
                onToggle={() => toggleLayer('precipitation')}
              />
              <ToggleRow
                label="Temperature"
                checked={activeLayers.temperature}
                onToggle={() => toggleLayer('temperature')}
              />
              <ToggleRow
                label="Clouds"
                checked={activeLayers.clouds}
                onToggle={() => toggleLayer('clouds')}
              />
              <ToggleRow
                label="Wind"
                checked={activeLayers.wind}
                onToggle={() => toggleLayer('wind')}
              />
              <ToggleRow
                label="Pressure"
                checked={activeLayers.pressure}
                onToggle={() => toggleLayer('pressure')}
              />
            </>
          )}
          {category === 'rainviewer' && (
            <>
              <DisabledRow label="Radar (Real-time)" />
              <DisabledRow label="Radar History" />
              <DisabledRow label="Nowcast" />
              <DisabledRow label="IR Satellite Clouds" />
            </>
          )}
          {category === 'eonet' && (
            <>
              <DisabledRow label="Wildfires" />
              <DisabledRow label="Volcanoes" />
              <DisabledRow label="Severe Storms" />
              <DisabledRow label="Floods" />
              <DisabledRow label="Dust & Haze" />
              <DisabledRow label="Drought" />
              <DisabledRow label="Landslides" />
              <DisabledRow label="Icebergs" />
              <DisabledRow label="Sea & Lake Ice" />
            </>
          )}
          {category === 'usgs' && (
            <>
              <DisabledRow label="Earthquakes" />
              <DisabledRow label="Flood Gauges" />
              <DisabledRow label="Landsat Imagery" />
              <DisabledRow label="Volcano Alerts" />
            </>
          )}
          {category === 'agro' && (
            <>
              <DisabledRow label="NDVI" />
              <DisabledRow label="EVI" />
              <DisabledRow label="Soil Moisture" />
              <DisabledRow label="Soil Temperature" />
              <DisabledRow label="True-Color Satellite" />
              <DisabledRow label="False-Color Satellite" />
            </>
          )}
        </div>
      </div>
    </aside>
  );
}

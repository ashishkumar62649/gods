import type {
  AviationGridState,
  GroundStationsState,
} from '../flights/flightLayers';
import type { FlightFeedState } from '../flights/flights';
import {
  SATELLITE_MISSION_FILTERS,
  type SatelliteFeedState,
  type SatelliteMissionFilters,
} from '../satellites/satellites';
import type { InfrastructureFeedState } from '../infrastructure/infrastructure';
import type { MaritimeFeedState } from '../maritime/maritime';
import type { ClimateFeedState, WeatherLayerId, WeatherToggleState } from '../weather/weather';
import { WEATHER_LAYER_LABELS } from '../weather/weather';
import { AVIATION_GRID_OPTIONS } from './viewerConfig';
import type { SidebarSection } from './viewerTypes';

interface LayerSidebarProps {
  activeSection: SidebarSection;
  currentSection: { label: string; title: string };
  imageryPickerOpen: boolean;
  selectedImageryName: string;
  buildingsEnabled: boolean;
  autoBuildingsEnabled: boolean;
  orbitEnabled: boolean;
  flightsEnabled: boolean;
  satellitesEnabled: boolean;
  starlinkFocusEnabled: boolean;
  networkViewEnabled: boolean;
  subseaCablesEnabled: boolean;
  maritimeTrafficEnabled: boolean;
  metroEnabled: boolean;
  railwayEnabled: boolean;
  weatherToggles: WeatherToggleState;
  satelliteMissionFilters: SatelliteMissionFilters;
  aviationGrid: AviationGridState;
  isGridMenuOpen: boolean;
  groundStations: GroundStationsState;
  sigintInfrastructureOpen: boolean;
  airportLayerMessage: string;
  aviationGridSummary: string;
  flightFeed: FlightFeedState;
  satelliteFeed: SatelliteFeedState;
  infrastructureFeed: InfrastructureFeedState;
  maritimeFeed: MaritimeFeedState;
  climateFeed: ClimateFeedState;
  onSectionChange: (section: SidebarSection) => void;
  onToggleImageryPicker: () => void;
  onToggleBuildings: () => void;
  onToggleOrbit: () => void;
  onToggleFlights: () => void;
  onToggleSatellites: () => void;
  onToggleStarlinkFocus: () => void;
  onToggleNetworkView: () => void;
  onToggleSubseaCables: () => void;
  onToggleMaritimeTraffic: () => void;
  onToggleMetro: () => void;
  onToggleRailway: () => void;
  onToggleWeatherLayer: (layer: WeatherLayerId) => void;
  onToggleSatelliteMissionCategory: (category: keyof SatelliteMissionFilters) => void;
  onToggleGridMenu: () => void;
  onToggleAviationGridCategory: (layer: keyof AviationGridState) => void;
  onToggleSigintInfrastructure: () => void;
  onToggleGroundStationLayer: (layer: keyof GroundStationsState) => void;
  sectionTabs: Array<{ id: SidebarSection; label: string }>;
}

function renderSoonCard(label: string) {
  return (
    <div
      className="layer-card layer-card--soon flex justify-between items-center w-full py-1.5 aether-data-row"
      key={label}
    >
      <div className="layer-card__body">
        <p className="layer-card__label">{label}</p>
      </div>
      <span className="layer-badge">Soon</span>
    </div>
  );
}

export default function LayerSidebar({
  activeSection,
  currentSection,
  imageryPickerOpen,
  selectedImageryName,
  buildingsEnabled,
  autoBuildingsEnabled,
  orbitEnabled,
  flightsEnabled,
  satellitesEnabled,
  starlinkFocusEnabled,
  networkViewEnabled,
  subseaCablesEnabled,
  maritimeTrafficEnabled,
  metroEnabled,
  railwayEnabled,
  weatherToggles,
  satelliteMissionFilters,
  aviationGrid,
  isGridMenuOpen,
  groundStations,
  sigintInfrastructureOpen,
  airportLayerMessage,
  aviationGridSummary,
  flightFeed,
  satelliteFeed,
  infrastructureFeed,
  maritimeFeed,
  climateFeed,
  onSectionChange,
  onToggleImageryPicker,
  onToggleBuildings,
  onToggleOrbit,
  onToggleFlights,
  onToggleSatellites,
  onToggleStarlinkFocus,
  onToggleNetworkView,
  onToggleSubseaCables,
  onToggleMaritimeTraffic,
  onToggleMetro,
  onToggleRailway,
  onToggleWeatherLayer,
  onToggleSatelliteMissionCategory,
  onToggleGridMenu,
  onToggleAviationGridCategory,
  onToggleSigintInfrastructure,
  onToggleGroundStationLayer,
  sectionTabs,
}: LayerSidebarProps) {
  const renderWeatherToggle = (
    layerId: WeatherLayerId,
    description: string,
  ) => {
    const enabled = weatherToggles[layerId];
    return (
      <button
        type="button"
        className={
          enabled
            ? 'layer-card layer-card--toggle layer-card--intel layer-card--active flex justify-between items-center w-full py-1.5 aether-data-row'
            : 'layer-card layer-card--toggle layer-card--intel flex justify-between items-center w-full py-1.5 aether-data-row'
        }
        onClick={() => onToggleWeatherLayer(layerId)}
      >
        <span className="layer-card__body">
          <span className="layer-card__label">{WEATHER_LAYER_LABELS[layerId]}</span>
          <span className="layer-card__meta">
            {enabled
              ? `${WEATHER_LAYER_LABELS[layerId]} telemetry is active.`
              : description}
          </span>
        </span>
        <span
          className={enabled ? 'layer-switch layer-switch--on' : 'layer-switch'}
          aria-hidden="true"
        >
          <span className="layer-switch__thumb" />
          <span className="layer-switch__text">{enabled ? 'On' : 'Off'}</span>
        </span>
      </button>
    );
  };

  const renderSectionBody = () => {
    switch (activeSection) {
      case 'base':
        return (
          <>
            <div className="layer-flyout-wrap">
              <button
                type="button"
                className={
                  imageryPickerOpen
                    ? 'layer-card layer-card--toggle layer-card--base layer-card--active flex justify-between items-center w-full py-1.5 aether-data-row'
                    : 'layer-card layer-card--toggle layer-card--base flex justify-between items-center w-full py-1.5 aether-data-row'
                }
                onClick={onToggleImageryPicker}
              >
                <span className="layer-card__body">
                  <span className="layer-card__label">Imagery</span>
                  <span className="layer-card__meta">{selectedImageryName}</span>
                </span>
                <span className="layer-card__action">
                  <span className="layer-card__action-text">Browse</span>
                </span>
              </button>
            </div>

            <button
              type="button"
              className={
                buildingsEnabled || autoBuildingsEnabled
                  ? 'layer-card layer-card--toggle layer-card--base layer-card--active flex justify-between items-center w-full py-1.5 aether-data-row'
                  : 'layer-card layer-card--toggle layer-card--base flex justify-between items-center w-full py-1.5 aether-data-row'
              }
              onClick={onToggleBuildings}
            >
              <span className="layer-card__body">
                <span className="layer-card__label">Buildings</span>
                <span className="layer-card__meta">
                  Show grounded 3D city buildings.
                </span>
              </span>
              <span
                className={
                  buildingsEnabled || autoBuildingsEnabled
                    ? 'layer-switch layer-switch--on'
                    : 'layer-switch'
                }
                aria-hidden="true"
              >
                <span className="layer-switch__thumb" />
                <span className="layer-switch__text">
                  {buildingsEnabled || autoBuildingsEnabled ? 'On' : 'Off'}
                </span>
              </span>
            </button>

            <button
              type="button"
              className={
                orbitEnabled
                  ? 'layer-card layer-card--toggle layer-card--base layer-card--active flex justify-between items-center w-full py-1.5 aether-data-row'
                  : 'layer-card layer-card--toggle layer-card--base flex justify-between items-center w-full py-1.5 aether-data-row'
              }
              onClick={onToggleOrbit}
            >
              <span className="layer-card__body">
                <span className="layer-card__label">Orbit</span>
                <span className="layer-card__meta">
                  Landmark orbiting around the current globe view.
                </span>
              </span>
              <span
                className={orbitEnabled ? 'layer-switch layer-switch--on' : 'layer-switch'}
                aria-hidden="true"
              >
                <span className="layer-switch__thumb" />
                <span className="layer-switch__text">
                  {orbitEnabled ? 'On' : 'Off'}
                </span>
              </span>
            </button>

            {renderSoonCard('Boundaries')}
            {renderSoonCard('Labels')}
          </>
        );
      case 'intel':
        return (
          <>
            <button
              type="button"
              className={
                flightsEnabled
                  ? 'layer-card layer-card--toggle layer-card--intel layer-card--active flex justify-between items-center w-full py-1.5 aether-data-row'
                  : 'layer-card layer-card--toggle layer-card--intel flex justify-between items-center w-full py-1.5 aether-data-row'
              }
              onClick={onToggleFlights}
            >
              <span className="layer-card__body">
                <span className="layer-card__label">Flights</span>
                <span className="layer-card__meta">
                  {flightsEnabled
                    ? flightFeed.message
                    : 'Show live aircraft traffic on the globe.'}
                </span>
              </span>
              <span
                className={flightsEnabled ? 'layer-switch layer-switch--on' : 'layer-switch'}
                aria-hidden="true"
              >
                <span className="layer-switch__thumb" />
                <span className="layer-switch__text">
                  {flightsEnabled ? 'On' : 'Off'}
                </span>
              </span>
            </button>
            <div className="layer-card layer-card--status flex flex-col w-full py-1.5 aether-data-row">
              <button
                type="button"
                className="flex justify-between items-center w-full"
                onClick={onToggleGridMenu}
                aria-expanded={isGridMenuOpen}
              >
                <span className="layer-card__body">
                  <span className="layer-card__label">Aviation Grid</span>
                  <span className="layer-card__meta">{airportLayerMessage}</span>
                  <span className="layer-card__meta">{aviationGridSummary}</span>
                </span>
                <span className="layer-badge">
                  {isGridMenuOpen ? 'Open' : 'Closed'}
                </span>
              </button>
              {isGridMenuOpen && (
                <div className="mt-3 rounded-2xl border border-cyan-900/35 bg-slate-950/35 p-2">
                  <div className="flex flex-col gap-1.5">
                    {AVIATION_GRID_OPTIONS.map(({ key, label }) => (
                      <button
                        key={key}
                        type="button"
                        className={
                          aviationGrid[key]
                            ? 'flex justify-between items-center w-full rounded-xl px-3 py-2 text-left text-[10px] font-semibold tracking-[0.18em] uppercase bg-gradient-to-r from-cyan-900/40 to-blue-900/20 border border-cyan-500/40 text-cyan-300 aether-glow-text'
                            : 'flex justify-between items-center w-full rounded-xl px-3 py-2 text-left text-[10px] font-semibold tracking-[0.18em] uppercase border border-cyan-900/40 text-slate-300 bg-slate-950/30'
                        }
                        onClick={() => onToggleAviationGridCategory(key)}
                      >
                        <span>{label}</span>
                        <span className="text-[9px] tracking-[0.2em]">
                          {aviationGrid[key] ? 'ON' : 'OFF'}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="layer-card layer-card--status flex flex-col w-full py-1.5 aether-data-row">
              <button
                type="button"
                className="flex justify-between items-center w-full"
                onClick={onToggleSigintInfrastructure}
                aria-expanded={sigintInfrastructureOpen}
              >
                <span className="layer-card__body">
                  <span className="layer-card__label">SIGINT Infrastructure</span>
                  <span className="layer-card__meta">
                    Map HFDL stations plus combined VDL and ACARS comms sites.
                  </span>
                </span>
                <span className="layer-badge">
                  {sigintInfrastructureOpen ? 'Open' : 'Closed'}
                </span>
              </button>
              {sigintInfrastructureOpen && (
                <div className="grid grid-cols-2 gap-2 pt-3">
                  {([
                    ['hfdl', 'HFDL'],
                    ['comms', 'VDL+ACARS'],
                  ] as const).map(([layerKey, label]) => (
                    <button
                      key={layerKey}
                      type="button"
                      className={
                        groundStations[layerKey]
                          ? 'rounded-xl px-2 py-2 text-[10px] font-semibold tracking-[0.18em] uppercase bg-gradient-to-r from-cyan-900/40 to-blue-900/20 border border-cyan-500/40 text-cyan-300 aether-glow-text'
                          : 'rounded-xl px-2 py-2 text-[10px] font-semibold tracking-[0.18em] uppercase border border-cyan-900/40 text-slate-300 bg-slate-950/30'
                      }
                      onClick={() => onToggleGroundStationLayer(layerKey)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="layer-card layer-card--status flex justify-between items-center w-full py-1.5 aether-data-row">
              <div className="layer-card__body">
                <p className="layer-card__label">Flight Feed</p>
                <p className="layer-card__meta">
                  {flightFeed.fetchedAt
                    ? `${flightFeed.flightCount} shown from ${flightFeed.totalAvailable} available.`
                    : 'Waiting for the first flight snapshot.'}
                </p>
              </div>
              <span
                className={
                  flightFeed.status === 'live'
                    ? 'layer-badge layer-badge--live'
                    : 'layer-badge'
                }
              >
                {flightFeed.status === 'live'
                  ? 'Live'
                  : flightFeed.status === 'fallback'
                    ? 'Mock'
                    : flightFeed.status === 'loading'
                      ? 'Loading'
                      : flightFeed.status === 'error'
                        ? 'Error'
                        : 'Idle'}
              </span>
            </div>
            <button
              type="button"
              className={
                satellitesEnabled
                  ? 'layer-card layer-card--toggle layer-card--intel layer-card--active flex justify-between items-center w-full py-1.5 aether-data-row'
                  : 'layer-card layer-card--toggle layer-card--intel flex justify-between items-center w-full py-1.5 aether-data-row'
              }
              onClick={onToggleSatellites}
            >
              <span className="layer-card__body">
                <span className="layer-card__label">Satellites</span>
                <span className="layer-card__meta">
                  {satellitesEnabled
                    ? satelliteFeed.message
                    : 'Show active orbital objects with SGP4 positions.'}
                </span>
              </span>
              <span
                className={satellitesEnabled ? 'layer-switch layer-switch--on' : 'layer-switch'}
                aria-hidden="true"
              >
                <span className="layer-switch__thumb" />
                <span className="layer-switch__text">
                  {satellitesEnabled ? 'On' : 'Off'}
                </span>
              </span>
            </button>
            <button
              type="button"
              className={
                starlinkFocusEnabled
                  ? 'layer-card layer-card--toggle layer-card--intel layer-card--active flex justify-between items-center w-full py-1.5 aether-data-row'
                  : 'layer-card layer-card--toggle layer-card--intel flex justify-between items-center w-full py-1.5 aether-data-row'
              }
              onClick={onToggleStarlinkFocus}
            >
              <span className="layer-card__body">
                <span className="layer-card__label">Starlink Focus</span>
                <span className="layer-card__meta">
                  Dim non-Starlink satellites to reveal the constellation mesh.
                </span>
              </span>
              <span
                className={starlinkFocusEnabled ? 'layer-switch layer-switch--on' : 'layer-switch'}
                aria-hidden="true"
              >
                <span className="layer-switch__thumb" />
                <span className="layer-switch__text">
                  {starlinkFocusEnabled ? 'On' : 'Off'}
                </span>
              </span>
            </button>
            <button
              type="button"
              className={
                networkViewEnabled
                  ? 'layer-card layer-card--toggle layer-card--intel layer-card--active flex justify-between items-center w-full py-1.5 aether-data-row'
                  : 'layer-card layer-card--toggle layer-card--intel flex justify-between items-center w-full py-1.5 aether-data-row'
              }
              onClick={onToggleNetworkView}
            >
              <span className="layer-card__body">
                <span className="layer-card__label">Network View</span>
                <span className="layer-card__meta">
                  Draw close-range inter-satellite links inside constellations.
                </span>
              </span>
              <span
                className={networkViewEnabled ? 'layer-switch layer-switch--on' : 'layer-switch'}
                aria-hidden="true"
              >
                <span className="layer-switch__thumb" />
                <span className="layer-switch__text">
                  {networkViewEnabled ? 'On' : 'Off'}
                </span>
              </span>
            </button>
            <div className="layer-card layer-card--status flex flex-col w-full py-1.5 aether-data-row">
              <div className="layer-card__body pb-2">
                <p className="layer-card__label">Mission Filters</p>
                <p className="layer-card__meta">
                  Reduce orbital clutter by intelligence role.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {SATELLITE_MISSION_FILTERS.map(({ key, label }) => (
                  <button
                    key={key}
                    type="button"
                    className={
                      satelliteMissionFilters[key]
                        ? 'rounded-xl px-2 py-2 text-[10px] font-semibold tracking-[0.18em] uppercase bg-gradient-to-r from-cyan-900/40 to-blue-900/20 border border-cyan-500/40 text-cyan-300 aether-glow-text'
                        : 'rounded-xl px-2 py-2 text-[10px] font-semibold tracking-[0.18em] uppercase border border-cyan-900/40 text-slate-300 bg-slate-950/30'
                    }
                    onClick={() => onToggleSatelliteMissionCategory(key)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="layer-card layer-card--status flex justify-between items-center w-full py-1.5 aether-data-row">
              <div className="layer-card__body">
                <p className="layer-card__label">Satellite Feed</p>
                <p className="layer-card__meta">
                  {satelliteFeed.fetchedAt
                    ? `${satelliteFeed.satelliteCount.toLocaleString()} shown from ${satelliteFeed.totalAvailable.toLocaleString()} TLEs.`
                    : 'Waiting for the first satellite snapshot.'}
                </p>
              </div>
              <span
                className={
                  satelliteFeed.status === 'live'
                    ? 'layer-badge layer-badge--live'
                    : 'layer-badge'
                }
              >
                {satelliteFeed.status === 'live'
                  ? 'Live'
                  : satelliteFeed.status === 'loading'
                    ? 'Loading'
                    : satelliteFeed.status === 'error'
                      ? 'Error'
                      : 'Idle'}
              </span>
            </div>
            {renderSoonCard('Ships')}
            {renderSoonCard('Events')}
            {renderSoonCard('Airspace')}
            {renderSoonCard('Interference')}
          </>
        );
      case 'visual':
        return (
          <>
            <div className="layer-card layer-card--status flex justify-between items-center w-full py-1.5 aether-data-row">
              <div className="layer-card__body">
                <p className="layer-card__label">Global Climate</p>
                <p className="layer-card__meta">{climateFeed.message}</p>
              </div>
              <span
                className={
                  climateFeed.activeSource === 'OWM'
                    ? 'layer-badge layer-badge--live'
                    : 'layer-badge'
                }
              >
                Source: {climateFeed.sourceLabel}
              </span>
            </div>
            {renderWeatherToggle(
              'precipitation',
              'Overlay live rain and snow radar on the globe.',
            )}
            {renderWeatherToggle(
              'temperature',
              'Show the global heat map layer.',
            )}
            {renderWeatherToggle(
              'clouds',
              'Reveal worldwide cloud cover density.',
            )}
            {renderWeatherToggle(
              'wind',
              'Display the global wind speed field.',
            )}
            {renderWeatherToggle(
              'pressure',
              'Display atmospheric pressure telemetry.',
            )}
            <div className="layer-card layer-card--status flex justify-between items-center w-full py-1.5 aether-data-row">
              <div className="layer-card__body">
                <p className="layer-card__label">Standard View</p>
                <p className="layer-card__meta">
                  The current stable globe look remains active.
                </p>
              </div>
              <span className="layer-badge layer-badge--live">Live</span>
            </div>
            {renderSoonCard('Night Vision')}
            {renderSoonCard('Thermal')}
            {renderSoonCard('Cinematic')}
          </>
        );
      case 'infrastructure':
        return (
          <>
            <button
              type="button"
              className={
                subseaCablesEnabled
                  ? 'layer-card layer-card--toggle layer-card--intel layer-card--active flex justify-between items-center w-full py-1.5 aether-data-row'
                  : 'layer-card layer-card--toggle layer-card--intel flex justify-between items-center w-full py-1.5 aether-data-row'
              }
              onClick={onToggleSubseaCables}
            >
              <span className="layer-card__body">
                <span className="layer-card__label">Subsea Cables</span>
                <span className="layer-card__meta">
                  {subseaCablesEnabled
                    ? infrastructureFeed.message
                    : 'Show global internet cable corridors.'}
                </span>
              </span>
              <span
                className={subseaCablesEnabled ? 'layer-switch layer-switch--on' : 'layer-switch'}
                aria-hidden="true"
              >
                <span className="layer-switch__thumb" />
                <span className="layer-switch__text">
                  {subseaCablesEnabled ? 'On' : 'Off'}
                </span>
              </span>
            </button>

            <button
              type="button"
              className={
                metroEnabled
                  ? 'layer-card layer-card--toggle layer-card--intel layer-card--active flex justify-between items-center w-full py-1.5 aether-data-row'
                  : 'layer-card layer-card--toggle layer-card--intel flex justify-between items-center w-full py-1.5 aether-data-row'
              }
              onClick={onToggleMetro}
            >
              <span className="layer-card__body">
                <span className="layer-card__label">Metro Rail</span>
                <span className="layer-card__meta">
                  {metroEnabled
                    ? 'Glowing global subway and rail corridors are visible.'
                    : 'Render neon global metro and subway routes.'}
                </span>
              </span>
              <span
                className={metroEnabled ? 'layer-switch layer-switch--on' : 'layer-switch'}
                aria-hidden="true"
              >
                <span className="layer-switch__thumb" />
                <span className="layer-switch__text">
                  {metroEnabled ? 'On' : 'Off'}
                </span>
              </span>
            </button>

            <button
              type="button"
              className={
                railwayEnabled
                  ? 'layer-card layer-card--toggle layer-card--intel layer-card--active flex justify-between items-center w-full py-1.5 aether-data-row'
                  : 'layer-card layer-card--toggle layer-card--intel flex justify-between items-center w-full py-1.5 aether-data-row'
              }
              onClick={onToggleRailway}
            >
              <span className="layer-card__body">
                <span className="layer-card__label">Railway</span>
                <span className="layer-card__meta">
                  {railwayEnabled
                    ? 'Amber national rail corridors are streaming in.'
                    : 'Render country-scale heavy railway corridors.'}
                </span>
              </span>
              <span
                className={railwayEnabled ? 'layer-switch layer-switch--on' : 'layer-switch'}
                aria-hidden="true"
              >
                <span className="layer-switch__thumb" />
                <span className="layer-switch__text">
                  {railwayEnabled ? 'On' : 'Off'}
                </span>
              </span>
            </button>

            <button
              type="button"
              className={
                maritimeTrafficEnabled
                  ? 'layer-card layer-card--toggle layer-card--intel layer-card--active flex justify-between items-center w-full py-1.5 aether-data-row'
                  : 'layer-card layer-card--toggle layer-card--intel flex justify-between items-center w-full py-1.5 aether-data-row'
              }
              onClick={onToggleMaritimeTraffic}
            >
              <span className="layer-card__body">
                <span className="layer-card__label">Maritime Traffic</span>
                <span className="layer-card__meta">
                  {maritimeTrafficEnabled
                    ? maritimeFeed.message
                    : 'Render live cargo and tanker vessels from Global Fishing Watch.'}
                </span>
              </span>
              <span
                className={maritimeTrafficEnabled ? 'layer-switch layer-switch--on' : 'layer-switch'}
                aria-hidden="true"
              >
                <span className="layer-switch__thumb" />
                <span className="layer-switch__text">
                  {maritimeTrafficEnabled ? 'On' : 'Off'}
                </span>
              </span>
            </button>

            <div className="layer-card layer-card--status flex justify-between items-center w-full py-1.5 aether-data-row">
              <div className="layer-card__body">
                <p className="layer-card__label">Infrastructure Feed</p>
                <p className="layer-card__meta">
                  {infrastructureFeed.fetchedAt
                    ? `${infrastructureFeed.cableCount.toLocaleString()} cables, ${infrastructureFeed.shipCount.toLocaleString()} vessels, ${infrastructureFeed.nodeCount.toLocaleString()} nodes.`
                    : 'Waiting for infrastructure snapshot.'}
                </p>
              </div>
              <span
                className={
                  infrastructureFeed.status === 'live'
                    ? 'layer-badge layer-badge--live'
                    : 'layer-badge'
                }
              >
                {infrastructureFeed.status === 'live'
                  ? 'Live'
                  : infrastructureFeed.status === 'loading'
                    ? 'Loading'
                    : infrastructureFeed.status === 'error'
                      ? 'Error'
                      : 'Idle'}
              </span>
            </div>

            <div className="layer-card layer-card--status flex justify-between items-center w-full py-1.5 aether-data-row">
              <div className="layer-card__body">
                <p className="layer-card__label">Maritime Feed</p>
                <p className="layer-card__meta">
                  {maritimeFeed.fetchedAt
                    ? `${maritimeFeed.vesselCount.toLocaleString()} vessels from Global Fishing Watch.`
                    : maritimeFeed.message}
                </p>
              </div>
              <span
                className={
                  maritimeFeed.status === 'live'
                    ? 'layer-badge layer-badge--live'
                    : 'layer-badge'
                }
              >
                {maritimeFeed.status === 'live'
                  ? 'Live'
                  : maritimeFeed.status === 'loading'
                    ? 'Loading'
                    : maritimeFeed.status === 'error'
                      ? 'Error'
                      : 'Idle'}
              </span>
            </div>

            {infrastructureFeed.riskShipCount > 0 && (
              <div className="layer-card layer-card--status flex justify-between items-center w-full py-1.5 aether-data-row border-red-500/40">
                <div className="layer-card__body">
                  <p className="layer-card__label">Risk Proximity Alert</p>
                  <p className="layer-card__meta">
                    {infrastructureFeed.riskShipCount} slow vessel(s) near cable paths.
                  </p>
                </div>
                <span className="layer-badge">Alert</span>
              </div>
            )}
          </>
        );
      case 'system':
        return (
          <>
            {renderSoonCard('Performance')}
            {renderSoonCard('Feed Health')}
            {renderSoonCard('Layer Activity')}
            {renderSoonCard('Diagnostics')}
            {renderSoonCard('Experimental')}
          </>
        );
      default:
        return null;
    }
  };

  return (
    <aside
      className="layer-sidebar absolute top-24 left-4 z-40 w-[clamp(16rem,18vw,20rem)] h-[clamp(30rem,60vh,45rem)] aether-panel rounded-2xl flex flex-col overflow-hidden"
      aria-label="Layer controls"
    >
      <div className="layer-sidebar__panel flex flex-col h-full overflow-hidden">
        <div className="layer-tabs" role="tablist" aria-label="Layer groups">
          {sectionTabs.map((section) => (
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
              onClick={() => onSectionChange(section.id)}
            >
              {section.label}
            </button>
          ))}
        </div>

        <section className={`layer-section layer-section--${activeSection} flex flex-col flex-1 overflow-hidden`}>
          <div className="layer-section__header">
            <p className="layer-section__eyebrow aether-kicker">{currentSection.label}</p>
            <h2 className="layer-section__title aether-glow-text">{currentSection.title}</h2>
          </div>
          <div className="layer-section__body flex-1 overflow-y-auto custom-scrollbar p-3">
            {renderSectionBody()}
          </div>
        </section>
      </div>
    </aside>
  );
}

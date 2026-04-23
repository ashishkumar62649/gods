import type { FlightFeedState } from '../flights/flights';
import type { InfrastructureFeedState } from '../infrastructure/infrastructure';
import type { SatelliteFeedState } from '../satellites/satellites';

interface DevStatusPanelProps {
  open: boolean;
  activeGroupLabel: string;
  selectedImageryName: string;
  buildingsEnabled: boolean;
  flightsEnabled: boolean;
  satellitesEnabled: boolean;
  subseaCablesEnabled: boolean;
  maritimeTrafficEnabled: boolean;
  flightFeed: FlightFeedState;
  satelliteFeed: SatelliteFeedState;
  infrastructureFeed: InfrastructureFeedState;
  orbitEnabled: boolean;
}

export default function DevStatusPanel({
  open,
  activeGroupLabel,
  selectedImageryName,
  buildingsEnabled,
  flightsEnabled,
  satellitesEnabled,
  subseaCablesEnabled,
  maritimeTrafficEnabled,
  flightFeed,
  satelliteFeed,
  infrastructureFeed,
  orbitEnabled,
}: DevStatusPanelProps) {
  return (
    <aside
      id="dev-status-panel"
      className={
        open
          ? 'dev-status-panel dev-status-panel--open custom-scrollbar aether-floating-panel'
          : 'dev-status-panel custom-scrollbar aether-floating-panel'
      }
      aria-label="Developer status"
    >
      <div className="dev-status-panel__header">
        <h2 className="dev-status-panel__title">Developer Status</h2>
      </div>
      <div className="dev-status-panel__body">
        <div className="dev-status-row flex justify-between items-center w-full py-1.5 aether-data-row">
          <span className="dev-status-row__label">Active group</span>
          <span className="dev-status-row__value">{activeGroupLabel}</span>
        </div>
        <div className="dev-status-row flex justify-between items-center w-full py-1.5 aether-data-row">
          <span className="dev-status-row__label">Imagery</span>
          <span className="dev-status-row__value">{selectedImageryName}</span>
        </div>
        <div className="dev-status-row flex justify-between items-center w-full py-1.5 aether-data-row">
          <span className="dev-status-row__label">Scene</span>
          <span className="dev-status-row__value">3D only</span>
        </div>
        <div className="dev-status-row flex justify-between items-center w-full py-1.5 aether-data-row">
          <span className="dev-status-row__label">Buildings</span>
          <span className="dev-status-row__value">{buildingsEnabled ? 'On' : 'Off'}</span>
        </div>
        <div className="dev-status-row flex justify-between items-center w-full py-1.5 aether-data-row">
          <span className="dev-status-row__label">Flights</span>
          <span className="dev-status-row__value">
            {flightsEnabled ? `${flightFeed.flightCount} active` : 'Off'}
          </span>
        </div>
        <div className="dev-status-row flex justify-between items-center w-full py-1.5 aether-data-row">
          <span className="dev-status-row__label">Flight feed</span>
          <span className="dev-status-row__value">{flightFeed.sourceLabel}</span>
        </div>
        <div className="dev-status-row flex justify-between items-center w-full py-1.5 aether-data-row">
          <span className="dev-status-row__label">Satellites</span>
          <span className="dev-status-row__value">
            {satellitesEnabled ? `${satelliteFeed.satelliteCount} active` : 'Off'}
          </span>
        </div>
        <div className="dev-status-row flex justify-between items-center w-full py-1.5 aether-data-row">
          <span className="dev-status-row__label">Satellite feed</span>
          <span className="dev-status-row__value">{satelliteFeed.sourceLabel}</span>
        </div>
        <div className="dev-status-row flex justify-between items-center w-full py-1.5 aether-data-row">
          <span className="dev-status-row__label">Subsea cables</span>
          <span className="dev-status-row__value">
            {subseaCablesEnabled ? `${infrastructureFeed.cableCount} active` : 'Off'}
          </span>
        </div>
        <div className="dev-status-row flex justify-between items-center w-full py-1.5 aether-data-row">
          <span className="dev-status-row__label">Maritime traffic</span>
          <span className="dev-status-row__value">
            {maritimeTrafficEnabled ? `${infrastructureFeed.shipCount} watched` : 'Off'}
          </span>
        </div>
        <div className="dev-status-row flex justify-between items-center w-full py-1.5 aether-data-row">
          <span className="dev-status-row__label">Orbit</span>
          <span className="dev-status-row__value">{orbitEnabled ? 'On' : 'Off'}</span>
        </div>
      </div>
    </aside>
  );
}

import {
  FlightFeedState,
  FlightRecord,
  FlightRouteSnapshot,
  formatAltitudeMeters,
  formatHeading,
  formatLastUpdated,
  formatSpeed,
  getAirportDisplayCode,
  getFlightDisplayName,
} from './flights';
import type {
  FlightAssetView,
  FlightSensorLinkState,
} from './flightLayers';
import { getFlightVisualTypeLabel } from './flightVisuals';

interface FlightDetailsPanelProps {
  feed: FlightFeedState;
  flight: FlightRecord | null;
  route: FlightRouteSnapshot | null;
  assetView: FlightAssetView;
  sensorLink: FlightSensorLinkState;
  showRoute: boolean;
  showTrail: boolean;
  onFocus: () => void;
  onAssetViewChange: (nextView: FlightAssetView) => void;
  onSensorLinkChange: (nextLink: FlightSensorLinkState) => void;
  onToggleRoute: () => void;
  onToggleTrail: () => void;
  onClose: () => void;
}

export default function FlightDetailsPanel({
  feed,
  flight,
  route,
  assetView,
  sensorLink,
  showRoute,
  showTrail,
  onFocus,
  onAssetViewChange,
  onSensorLinkChange,
  onToggleRoute,
  onToggleTrail,
  onClose,
}: FlightDetailsPanelProps) {
  if (!flight) return null;

  const routeSummary = route?.found && route.origin && route.destination
    ? `${getAirportDisplayCode(route.origin)} -> ${getAirportDisplayCode(route.destination)}${route.source === 'estimated' ? ' (Estimated)' : ''}`
    : showRoute
      ? route?.error || 'Looking up route...'
      : 'Enable Route Arc to load endpoints and arc.';

  return (
    <aside className="flight-panel aether-details-shell aether-panel aether-radius-2xl" aria-label="Selected flight details">
      <div className="flight-panel__header">
        <div>
          <p className="flight-panel__eyebrow aether-kicker">Selected Flight</p>
          <h2 className="flight-panel__title aether-glow-text">{getFlightDisplayName(flight)}</h2>
        </div>
        <button
          type="button"
          className="flight-panel__close"
          onClick={onClose}
          aria-label="Close flight details"
        >
          X
        </button>
      </div>

      <div className="flight-panel__controls">
        <button
          type="button"
          className="flight-panel__action"
          onClick={onFocus}
          aria-label="Focus the camera on the selected aircraft"
          title="Focus the camera on the selected aircraft"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="3" />
            <path d="M12 2v4" />
            <path d="M12 18v4" />
            <path d="M2 12h4" />
            <path d="M18 12h4" />
          </svg>
          <span>Focus</span>
        </button>
      </div>

      <div className="flight-panel__controls">
        <div className="flight-panel__row">
          <span className="flight-panel__label aether-kicker">Asset View</span>
          <div className="flight-panel__segmented" role="group" aria-label="Asset view">
            <button
              type="button"
              className={
                assetView === 'symbology'
                  ? 'flight-panel__action flight-panel__action--active aether-control-active'
                  : 'flight-panel__action'
              }
              onClick={() => onAssetViewChange('symbology')}
            >
              Symbology
            </button>
            <button
              type="button"
              className={
                assetView === 'airframe'
                  ? 'flight-panel__action flight-panel__action--active aether-control-active'
                  : 'flight-panel__action'
              }
              onClick={() => onAssetViewChange('airframe')}
            >
              Airframe
            </button>
          </div>
        </div>

        <div className="flight-panel__row">
          <span className="flight-panel__label aether-kicker">Sensor Link</span>
          <div className="flight-panel__segmented" role="group" aria-label="Sensor link">
            <button
              type="button"
              className={
                sensorLink === 'release'
                  ? 'flight-panel__action flight-panel__action--active aether-control-active'
                  : 'flight-panel__action'
              }
              onClick={() => onSensorLinkChange('release')}
            >
              Release
            </button>
            <button
              type="button"
              className={
                sensorLink === 'tactical'
                  ? 'flight-panel__action flight-panel__action--active aether-control-active'
                  : 'flight-panel__action'
              }
              onClick={() => onSensorLinkChange('tactical')}
            >
              Tactical
            </button>
            <button
              type="button"
              className={
                sensorLink === 'pursuit'
                  ? 'flight-panel__action flight-panel__action--active aether-control-active'
                  : 'flight-panel__action'
              }
              onClick={() => onSensorLinkChange('pursuit')}
            >
              Pursuit
            </button>
            <button
              type="button"
              className={
                sensorLink === 'flight-deck'
                  ? 'flight-panel__action flight-panel__action--active aether-control-active'
                  : 'flight-panel__action'
              }
              onClick={() => onSensorLinkChange('flight-deck')}
            >
              Flight Deck
            </button>
          </div>
        </div>

        <button
          type="button"
          className={
            showRoute
              ? 'flight-panel__action flight-panel__action--active aether-control-active'
              : 'flight-panel__action'
          }
          onClick={onToggleRoute}
        >
          {showRoute ? 'Arc On' : 'Route Arc'}
        </button>
        <button
          type="button"
          className={
            showTrail
              ? 'flight-panel__action flight-panel__action--active aether-control-active'
              : 'flight-panel__action'
          }
          onClick={onToggleTrail}
        >
          {showTrail ? 'Trail On' : 'Trail'}
        </button>
      </div>

      <div className="flight-panel__body">
        <div className="flight-panel__row aether-data-row">
          <span className="flight-panel__label aether-kicker">ICAO24</span>
          <span className="flight-panel__value aether-value aether-glow-text">{flight.id.toUpperCase()}</span>
        </div>
        <div className="flight-panel__row aether-data-row">
          <span className="flight-panel__label aether-kicker">Altitude</span>
          <span className="flight-panel__value aether-value aether-glow-text">
            {formatAltitudeMeters(flight.altitudeMeters)}
          </span>
        </div>
        <div className="flight-panel__row aether-data-row">
          <span className="flight-panel__label aether-kicker">Speed</span>
          <span className="flight-panel__value aether-value aether-glow-text">
            {formatSpeed(flight.speedMetersPerSecond)}
          </span>
        </div>
        <div className="flight-panel__row aether-data-row">
          <span className="flight-panel__label aether-kicker">Heading</span>
          <span className="flight-panel__value aether-value aether-glow-text">
            {formatHeading(flight.headingDegrees)}
          </span>
        </div>
        <div className="flight-panel__row aether-data-row">
          <span className="flight-panel__label aether-kicker">Country</span>
          <span className="flight-panel__value aether-value aether-glow-text">
            {flight.originCountry?.trim() || 'Unknown'}
          </span>
        </div>
        <div className="flight-panel__row aether-data-row">
          <span className="flight-panel__label aether-kicker">Type</span>
          <span className="flight-panel__value aether-value aether-glow-text">{getFlightVisualTypeLabel(flight)}</span>
        </div>
        <div className="flight-panel__row aether-data-row">
          <span className="flight-panel__label aether-kicker">Updated</span>
          <span className="flight-panel__value aether-value aether-glow-text">
            {formatLastUpdated(flight.timestamp)}
          </span>
        </div>
        <div className="flight-panel__row aether-data-row">
          <span className="flight-panel__label aether-kicker">Feed</span>
          <span className="flight-panel__value aether-value aether-glow-text">{feed.sourceLabel}</span>
        </div>
        <div className="flight-panel__row aether-data-row">
          <span className="flight-panel__label aether-kicker">Route</span>
          <span className="flight-panel__value aether-value aether-glow-text">{routeSummary}</span>
        </div>
      </div>
    </aside>
  );
}

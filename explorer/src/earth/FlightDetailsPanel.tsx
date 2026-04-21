import {
  FlightRouteSnapshot,
  FlightFeedState,
  FlightRecord,
  formatAltitudeMeters,
  formatHeading,
  formatLastUpdated,
  formatSpeed,
  getAirportDisplayCode,
  getFlightDisplayName,
} from './flights';
import { getFlightVisualTypeLabel } from './flightVisuals';

interface FlightDetailsPanelProps {
  feed: FlightFeedState;
  flight: FlightRecord | null;
  route: FlightRouteSnapshot | null;
  isTracking: boolean;
  isDroneMode: boolean;
  isCockpitMode: boolean;
  showRoute: boolean;
  showTrail: boolean;
  onToggleDrone: () => void;
  onToggleCockpit: () => void;
  onToggleTracking: () => void;
  onToggleRoute: () => void;
  onToggleTrail: () => void;
  onClose: () => void;
}

export default function FlightDetailsPanel({
  feed,
  flight,
  route,
  isTracking,
  isDroneMode,
  isCockpitMode,
  showRoute,
  showTrail,
  onToggleDrone,
  onToggleCockpit,
  onToggleTracking,
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
    <aside className="flight-panel" aria-label="Selected flight details">
      <div className="flight-panel__header">
        <div>
          <p className="flight-panel__eyebrow">Selected Flight</p>
          <h2 className="flight-panel__title">{getFlightDisplayName(flight)}</h2>
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
          className={
            isDroneMode
              ? 'flight-panel__action flight-panel__action--active'
              : 'flight-panel__action'
          }
          onClick={onToggleDrone}
          title="Chase cam — camera follows behind the plane"
        >
          {isDroneMode ? 'Chase On' : 'Chase'}
        </button>
        <button
          type="button"
          className={
            isCockpitMode
              ? 'flight-panel__action flight-panel__action--active'
              : 'flight-panel__action'
          }
          onClick={onToggleCockpit}
          title="Cockpit — ride on the plane, look 360°"
        >
          {isCockpitMode ? 'Cockpit On' : 'Cockpit'}
        </button>
        <button
          type="button"
          className={
            isTracking
              ? 'flight-panel__action flight-panel__action--active'
              : 'flight-panel__action'
          }
          onClick={onToggleTracking}
        >
          {isTracking ? 'Tracking' : 'Track'}
        </button>
        <button
          type="button"
          className={
            showRoute
              ? 'flight-panel__action flight-panel__action--active'
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
              ? 'flight-panel__action flight-panel__action--active'
              : 'flight-panel__action'
          }
          onClick={onToggleTrail}
        >
          {showTrail ? 'Trail On' : 'Trail'}
        </button>
      </div>

      <div className="flight-panel__body">
        <div className="flight-panel__row">
          <span className="flight-panel__label">ICAO24</span>
          <span className="flight-panel__value">{flight.id.toUpperCase()}</span>
        </div>
        <div className="flight-panel__row">
          <span className="flight-panel__label">Altitude</span>
          <span className="flight-panel__value">
            {formatAltitudeMeters(flight.altitudeMeters)}
          </span>
        </div>
        <div className="flight-panel__row">
          <span className="flight-panel__label">Speed</span>
          <span className="flight-panel__value">
            {formatSpeed(flight.speedMetersPerSecond)}
          </span>
        </div>
        <div className="flight-panel__row">
          <span className="flight-panel__label">Heading</span>
          <span className="flight-panel__value">
            {formatHeading(flight.headingDegrees)}
          </span>
        </div>
        <div className="flight-panel__row">
          <span className="flight-panel__label">Country</span>
          <span className="flight-panel__value">
            {flight.originCountry?.trim() || 'Unknown'}
          </span>
        </div>
        <div className="flight-panel__row">
          <span className="flight-panel__label">Type</span>
          <span className="flight-panel__value">{getFlightVisualTypeLabel(flight)}</span>
        </div>
        <div className="flight-panel__row">
          <span className="flight-panel__label">Updated</span>
          <span className="flight-panel__value">
            {formatLastUpdated(flight.timestamp)}
          </span>
        </div>
        <div className="flight-panel__row">
          <span className="flight-panel__label">Feed</span>
          <span className="flight-panel__value">{feed.sourceLabel}</span>
        </div>
        <div className="flight-panel__row">
          <span className="flight-panel__label">Route</span>
          <span className="flight-panel__value">{routeSummary}</span>
        </div>
      </div>
    </aside>
  );
}

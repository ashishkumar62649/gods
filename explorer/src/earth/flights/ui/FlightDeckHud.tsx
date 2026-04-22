import {
  formatAltitudeMeters,
  formatHeading,
  formatSpeed,
  type FlightRecord,
  type FlightRouteSnapshot,
} from '../flights';

interface FlightDeckHudProps {
  flight: FlightRecord | null;
  route: FlightRouteSnapshot | null;
}

export default function FlightDeckHud({
  flight,
  route,
}: FlightDeckHudProps) {
  if (!flight) return null;

  return (
    <div className="cockpit-hud" aria-label="Flight deck HUD">
      <div className="cockpit-hud__badge">FLIGHT DECK LINK</div>
      <div className="cockpit-hud__flight">
        {flight.callsign?.trim() || flight.id.toUpperCase()}
      </div>
      {route?.found && route.origin && route.destination && (
        <div className="cockpit-hud__route">
          <span className="cockpit-hud__route-from">
            {route.origin.iataCode || route.origin.ident}
            {route.origin.municipality ? ` · ${route.origin.municipality}` : ''}
          </span>
          <span className="cockpit-hud__route-arrow">→</span>
          <span className="cockpit-hud__route-to">
            {route.destination.iataCode || route.destination.ident}
            {route.destination.municipality ? ` · ${route.destination.municipality}` : ''}
          </span>
        </div>
      )}
      <div className="cockpit-hud__stats">
        <span>{formatAltitudeMeters(flight.altitudeMeters)}</span>
        <span className="cockpit-hud__sep">·</span>
        <span>{formatSpeed(flight.speedMetersPerSecond)}</span>
        <span className="cockpit-hud__sep">·</span>
        <span>{formatHeading(flight.headingDegrees)}</span>
      </div>
      <div className="cockpit-hud__hint">Drag to look · Click map to release</div>
    </div>
  );
}

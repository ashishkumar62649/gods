import IntelligenceCard from '../../components/cards/IntelligenceCard';
import type { FlightRouteSnapshot } from '../../earth/flights/flights';

interface RouteOverviewCardProps {
  route: FlightRouteSnapshot | null;
}

export default function RouteOverviewCard({ route }: RouteOverviewCardProps) {
  const stops = route?.found
    ? [
        route.origin
          ? { code: route.origin.iataCode ?? route.origin.ident, city: route.origin.municipality ?? route.origin.name }
          : { code: 'ORG', city: 'Origin unavailable' },
        route.destination
          ? { code: route.destination.iataCode ?? route.destination.ident, city: route.destination.municipality ?? route.destination.name }
          : { code: 'DST', city: 'Destination unavailable' },
      ]
    : [];

  return (
    <IntelligenceCard title="Route Overview">
      <div className="route-stops">
        {stops.length > 0 ? stops.map((stop) => (
          <span key={stop.code}>
            <b>{stop.code}</b>
            <small>{stop.city}</small>
          </span>
        )) : <span><b>Route</b><small>Lookup unavailable</small></span>}
      </div>
      <div className="route-progress"><i style={{ width: route?.found ? '100%' : '0%' }} /></div>
      <p>{route?.found ? 'Route context resolved. Position progress requires a persisted route-track model.' : 'Route source has not resolved this callsign.'}</p>
    </IntelligenceCard>
  );
}

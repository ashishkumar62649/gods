import { useTelemetryStore } from '../../core/store/useTelemetryStore';

export default function TelemetryHud() {
  const selectedEntityId = useTelemetryStore((state) => state.selectedEntityId);
  const flights = useTelemetryStore((state) => state.flights);
  const maritime = useTelemetryStore((state) => state.maritime);

  if (!selectedEntityId) {
    return null;
  }

  const flight = flights[selectedEntityId];
  const ship = maritime[selectedEntityId];
  const data = flight || ship;
  if (!data) {
    return null;
  }

  const label = flight?.callsign || selectedEntityId;

  return (
    <aside
      style={{
        position: 'absolute',
        right: '1rem',
        bottom: '1rem',
        zIndex: 10,
        minWidth: '18rem',
        background: 'rgba(0, 8, 12, 0.72)',
        color: 'white',
        padding: '1rem',
        border: '1px solid rgba(0,255,255,0.35)',
        borderRadius: '8px',
        backdropFilter: 'blur(8px)',
        pointerEvents: 'auto',
      }}
    >
      <h3>{label}</h3>
      <p>ID: {selectedEntityId}</p>
      <p>Altitude: {flight ? `${Math.round(flight.alt)} m` : 'Surface'}</p>
      <p>Speed: {ship ? `${Math.round(ship.speed)} kn` : 'Unknown'}</p>
      <p>Lat: {data.lat.toFixed(4)}</p>
      <p>Lon: {data.lon.toFixed(4)}</p>
      <p>Heading: {Math.round(data.heading)} deg</p>
    </aside>
  );
}

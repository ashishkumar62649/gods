import { useTelemetryStore } from '../../core/store/useTelemetryStore';

export default function TelemetryHud() {
  const selectedEntityId = useTelemetryStore((state) => state.selectedEntityId);
  const selectedEntityKind = useTelemetryStore((state) => state.selectedEntityKind);
  const flight = useTelemetryStore((state) =>
    selectedEntityId && selectedEntityKind === 'flight'
      ? state.flights[selectedEntityId]
      : undefined,
  );
  const ship = useTelemetryStore((state) =>
    selectedEntityId && selectedEntityKind === 'ship'
      ? state.maritime[selectedEntityId]
      : undefined,
  );
  const assetView = useTelemetryStore((state) => state.assetView);
  const sensorLink = useTelemetryStore((state) => state.sensorLink);
  const showSelectedFlightTrail = useTelemetryStore((state) => state.showSelectedFlightTrail);
  const setAssetView = useTelemetryStore((state) => state.setAssetView);
  const setSensorLink = useTelemetryStore((state) => state.setSensorLink);
  const toggleSelectedFlightTrail = useTelemetryStore((state) => state.toggleSelectedFlightTrail);
  const setSelectedEntity = useTelemetryStore((state) => state.setSelectedEntity);

  if (!selectedEntityId) {
    return null;
  }

  const data = flight || ship;
  if (!data) {
    return null;
  }

  const label = flight?.callsign || ship?.name || selectedEntityId;

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
      <button
        type="button"
        onClick={() => setSelectedEntity(null)}
        style={{
          float: 'right',
          background: 'transparent',
          color: '#9ff',
          border: '1px solid rgba(0,255,255,0.25)',
          borderRadius: 6,
        }}
      >
        X
      </button>
      <h3>{label}</h3>
      <p>ID: {selectedEntityId}</p>
      <p>Altitude: {flight ? `${Math.round(flight.alt)} m` : 'Surface'}</p>
      <p>Speed: {ship ? `${Math.round(ship.speed)} kn` : flight ? `${Math.round(flight.velocityMps * 3.6)} km/h` : 'Unknown'}</p>
      <p>Lat: {data.lat.toFixed(4)}</p>
      <p>Lon: {data.lon.toFixed(4)}</p>
      <p>Heading: {Math.round(data.heading)} deg</p>
      {flight ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.45rem', marginTop: '0.75rem' }}>
          <button
            type="button"
            onClick={() => setSensorLink(sensorLink === 'focus' ? 'release' : 'focus')}
            style={buttonStyle(sensorLink === 'focus')}
          >
            Focus
          </button>
          <button
            type="button"
            onClick={() => setSensorLink(sensorLink === 'cockpit' ? 'release' : 'cockpit')}
            style={buttonStyle(sensorLink === 'cockpit')}
          >
            Cockpit
          </button>
          <button
            type="button"
            onClick={() => setAssetView(assetView === 'airframe' ? 'symbology' : 'airframe')}
            style={buttonStyle(assetView === 'airframe')}
          >
            3D Airframe
          </button>
          <button
            type="button"
            onClick={toggleSelectedFlightTrail}
            style={buttonStyle(showSelectedFlightTrail)}
          >
            Trail
          </button>
        </div>
      ) : null}
    </aside>
  );
}

function buttonStyle(active: boolean) {
  return {
    border: `1px solid ${active ? 'rgba(103,232,249,0.88)' : 'rgba(103,232,249,0.24)'}`,
    background: active ? 'rgba(8,145,178,0.42)' : 'rgba(8,47,73,0.24)',
    color: '#e6fbff',
    borderRadius: 6,
    padding: '0.4rem',
    cursor: 'pointer',
  };
}

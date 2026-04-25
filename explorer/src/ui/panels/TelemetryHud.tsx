import { useEffect } from 'react';
import { fetchFlightRoute, fetchFlightTrace } from '../../core/api/telemetryApi';
import { useTelemetryStore } from '../../core/store/useTelemetryStore';
import { useInfrastructureStore } from '../../core/store/useInfrastructureStore';

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
  const infraShip = useInfrastructureStore((state) =>
    selectedEntityId && selectedEntityKind === 'ship'
      ? state.ships.find((s) => s.vessel_id === selectedEntityId)
      : undefined,
  );
  const assetView = useTelemetryStore((state) => state.assetView);
  const sensorLink = useTelemetryStore((state) => state.sensorLink);
  const showSelectedFlightTrail = useTelemetryStore((state) => state.showSelectedFlightTrail);
  const showSelectedFlightRoute = useTelemetryStore((state) => state.showSelectedFlightRoute);
  const selectedFlightRoute = useTelemetryStore((state) => state.selectedFlightRoute);
  
  const setAssetView = useTelemetryStore((state) => state.setAssetView);
  const setSensorLink = useTelemetryStore((state) => state.setSensorLink);
  const toggleSelectedFlightTrail = useTelemetryStore((state) => state.toggleSelectedFlightTrail);
  const toggleSelectedFlightRoute = useTelemetryStore((state) => state.toggleSelectedFlightRoute);
  const setSelectedEntity = useTelemetryStore((state) => state.setSelectedEntity);
  const setSelectedFlightRoute = useTelemetryStore((state) => state.setSelectedFlightRoute);
  const setSelectedFlightTrace = useTelemetryStore((state) => state.setSelectedFlightTrace);

  useEffect(() => {
    if (!selectedEntityId || selectedEntityKind !== 'flight' || !flight) {
      setSelectedFlightRoute(null);
      setSelectedFlightTrace(null);
      return;
    }

    const abortController = new AbortController();

    const fetchExtraData = async () => {
      try {
        if (flight.callsign) {
          const route = await fetchFlightRoute(flight.callsign, abortController.signal);
          setSelectedFlightRoute(route);
        }
        if (flight.id) {
          const trace = await fetchFlightTrace(flight.id, abortController.signal);
          setSelectedFlightTrace(trace);
        }
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.error('[TelemetryHud] Failed to fetch route/trace', err);
        }
      }
    };
    
    void fetchExtraData();

    return () => {
      abortController.abort();
    };
  }, [
    selectedEntityId,
    selectedEntityKind,
    flight?.callsign,
    flight?.id,
    setSelectedFlightRoute,
    setSelectedFlightTrace,
  ]);

  if (!selectedEntityId) {
    return null;
  }

  const data = flight || ship || infraShip;
  if (!data) {
    return null;
  }

  const label = flight?.callsign || ship?.name || infraShip?.name || selectedEntityId;
  const lat = flight?.lat ?? ship?.lat ?? infraShip?.latitude ?? 0;
  const lon = flight?.lon ?? ship?.lon ?? infraShip?.longitude ?? 0;
  const heading = flight?.heading ?? ship?.heading ?? infraShip?.heading_deg ?? 0;

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
      {flight && (
        <div style={{ padding: '0.3rem 0', borderBottom: '1px solid rgba(103,232,249,0.1)' }}>
          <p style={{ margin: '2px 0', fontSize: '0.9em' }}>
            <span style={{ opacity: 0.7 }}>Vehicle: </span> 
            {flight.vehicleType === 'Helicopter' ? '🚁' : flight.vehicleType === 'Drone' ? '🛸' : '✈️'} {flight.vehicleSubtype}
          </p>
          <p style={{ margin: '2px 0', fontSize: '0.9em' }}>
            <span style={{ opacity: 0.7 }}>Operation: </span> 
            {flight.operationType === 'Military' ? '🪖' : flight.operationType === 'Cargo' ? '📦' : flight.operationType === 'Passenger' ? '👥' : '🤝'} {flight.operationSubtype}
          </p>
        </div>
      )}
      <p style={{ marginTop: '0.25rem' }}>Altitude: {flight ? `${Math.round(flight.alt)} m` : 'Surface'}</p>
      <p>Speed: {
        infraShip && infraShip.speed_knots != null ? `${Math.round(infraShip.speed_knots)} kn` :
        ship ? (ship.speed > 0 ? `${Math.round(ship.speed)} kn` : 'N/A (Historical)') :
        flight ? `${Math.round(flight.velocityMps * 3.6)} km/h` : 'Unknown'
      }</p>
      <p>Lat: {lat.toFixed(4)}</p>
      <p>Lon: {lon.toFixed(4)}</p>
      <p>Heading: {Math.round(heading)} deg</p>
      {flight && selectedFlightRoute?.found && (
        <div style={{ marginTop: '0.5rem', marginBottom: '0.5rem', fontSize: '0.9em', color: '#a5f3fc' }}>
          <div><strong>From:</strong> {selectedFlightRoute.origin?.name || 'Unknown'}</div>
          <div><strong>To:</strong> {selectedFlightRoute.destination?.name || 'Unknown'}</div>
        </div>
      )}
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
          <button
            type="button"
            onClick={toggleSelectedFlightRoute}
            style={buttonStyle(showSelectedFlightRoute)}
          >
            Route Arc
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

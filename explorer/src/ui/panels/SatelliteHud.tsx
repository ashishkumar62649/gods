import { useSatelliteStore } from '../../core/store/useSatelliteStore';

export default function SatelliteHud() {
  const selectedSatelliteId = useSatelliteStore((state) => state.selectedSatelliteId);
  const satellite = useSatelliteStore((state) =>
    selectedSatelliteId ? state.satellites[selectedSatelliteId] : undefined,
  );
  const setSelectedSatellite = useSatelliteStore((state) => state.setSelectedSatellite);

  if (!selectedSatelliteId) {
    return null;
  }

  if (!satellite) {
    return null;
  }

  return (
    <aside
      style={{
        position: 'absolute',
        top: '1rem',
        right: '1rem',
        zIndex: 10,
        width: '20rem',
        maxWidth: 'calc(100vw - 2rem)',
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
        onClick={() => setSelectedSatellite(null)}
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
      <h3>{satellite.object_name || `NORAD ${satellite.id_norad}`}</h3>
      <p>NORAD: {satellite.id_norad}</p>
      <p>Mission: {satellite.mission_category}</p>
      <p>Constellation: {satellite.constellation_id || 'Unassigned'}</p>
      <p>Altitude: {Math.round(satellite.altitude_km).toLocaleString()} km</p>
      <p>Velocity: {satellite.velocity_kps?.toFixed(2) ?? 'Unknown'} km/s</p>
      <p>Inclination: {satellite.inclination_deg?.toFixed(2) ?? 'Unknown'} deg</p>
      <p>Status: {satellite.decay_status === 'DECAYING' ? 'Decay watch' : 'Stable'}</p>
    </aside>
  );
}

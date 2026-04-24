import { useTransitStore } from '../../core/store/useTransitStore';

export default function TransitPanel() {
  const visibleNetworks = useTransitStore((state) => state.visibleNetworks);
  const activeZoomBand = useTransitStore((state) => state.activeZoomBand);
  const toggleNetwork = useTransitStore((state) => state.toggleNetwork);

  return (
    <aside
      style={{
        position: 'absolute',
        top: '12rem',
        left: '1rem',
        zIndex: 10,
        background: 'rgba(0,0,0,0.8)',
        color: 'white',
        padding: '1rem',
        borderRadius: '8px',
        pointerEvents: 'auto',
      }}
    >
      <h3>Global Transit Network</h3>
      <p>Zoom Level: {activeZoomBand}</p>

      <label>
        <input
          type="checkbox"
          checked={visibleNetworks.metro}
          onChange={() => toggleNetwork('metro')}
        />
        Metro
      </label>

      <label>
        <input
          type="checkbox"
          checked={visibleNetworks.railway}
          onChange={() => toggleNetwork('railway')}
        />
        Railway
      </label>
    </aside>
  );
}

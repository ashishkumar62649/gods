import { useEffect } from 'react';
import { fetchClimateState } from '../../core/api/weatherApi';
import { INTERVALS } from '../../core/config/constants';
import { useClimateStore } from '../../core/store/useClimateStore';

export default function ClimatePanel() {
  const activeLayers = useClimateStore((state) => state.activeLayers);
  const dataSource = useClimateStore((state) => state.dataSource);
  const isLoading = useClimateStore((state) => state.isLoading);
  const toggleLayer = useClimateStore((state) => state.toggleLayer);
  const setSyncState = useClimateStore((state) => state.setSyncState);

  useEffect(() => {
    let cancelled = false;

    const syncData = async () => {
      try {
        const result = await fetchClimateState();
        if (cancelled) {
          return;
        }

        setSyncState(result.dataSource, result.lastSync ?? Math.floor(Date.now() / 1000));
      } catch (error) {
        console.error('[Climate Panel] Climate sync failed:', error);
      }
    };

    void syncData();
    const intervalId = window.setInterval(syncData, INTERVALS.WEATHER_SYNC_MS);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [setSyncState]);

  return (
    <aside
      style={{
        position: 'absolute',
        top: '1rem',
        left: '1rem',
        zIndex: 10,
        background: 'rgba(0,0,0,0.8)',
        color: 'white',
        padding: '1rem',
        borderRadius: '8px',
        pointerEvents: 'auto',
      }}
    >
      <h3>Global Climate Telemetry</h3>
      <p>Source: {isLoading ? 'SYNCING' : dataSource}</p>

      <label>
        <input
          type="checkbox"
          checked={activeLayers.precipitation}
          onChange={() => toggleLayer('precipitation')}
        />
        Precipitation
      </label>

      <label>
        <input
          type="checkbox"
          checked={activeLayers.fog}
          onChange={() => toggleLayer('fog')}
        />
        Fog
      </label>

      <label>
        <input
          type="checkbox"
          checked={activeLayers.lighting}
          onChange={() => toggleLayer('lighting')}
        />
        Lighting
      </label>
    </aside>
  );
}

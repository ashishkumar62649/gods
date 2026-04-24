import { useEffect, useState } from 'react';
import {
  fetchFlightTelemetry,
  fetchMaritimeTelemetry,
} from '../../core/api/telemetryApi';
import { INTERVALS } from '../../core/config/constants';
import { useTelemetryStore } from '../../core/store/useTelemetryStore';

export default function TelemetryPanel() {
  const feedStatus = useTelemetryStore((state) => state.feedStatus);
  const setFeedStatus = useTelemetryStore((state) => state.setFeedStatus);
  const upsertFlights = useTelemetryStore((state) => state.upsertFlights);
  const upsertMaritime = useTelemetryStore((state) => state.upsertMaritime);
  const [pollingEnabled, setPollingEnabled] = useState(true);

  useEffect(() => {
    if (!pollingEnabled) {
      setFeedStatus('disconnected');
      return undefined;
    }

    let cancelled = false;

    const syncTelemetry = async () => {
      setFeedStatus('reconnecting');
      const [flights, ships] = await Promise.all([
        fetchFlightTelemetry(),
        fetchMaritimeTelemetry(),
      ]);

      if (cancelled) {
        return;
      }

      upsertFlights(flights);
      upsertMaritime(ships);
      setFeedStatus('connected');
    };

    void syncTelemetry();
    const intervalId = window.setInterval(
      syncTelemetry,
      INTERVALS.TELEMETRY_SYNC_MS,
    );

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [pollingEnabled, setFeedStatus, upsertFlights, upsertMaritime]);

  return (
    <aside
      style={{
        position: 'absolute',
        top: '22rem',
        left: '1rem',
        zIndex: 10,
        background: 'rgba(0,0,0,0.8)',
        color: 'white',
        padding: '1rem',
        borderRadius: '8px',
        pointerEvents: 'auto',
      }}
    >
      <h3>Global Live Telemetry</h3>
      <p>Feed: {feedStatus}</p>

      <label>
        <input
          type="checkbox"
          checked={pollingEnabled}
          onChange={() => setPollingEnabled((enabled) => !enabled)}
        />
        Polling
      </label>
    </aside>
  );
}

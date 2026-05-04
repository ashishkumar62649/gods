import { useEffect, useMemo, useState } from 'react';
import MetricCard from '../../components/cards/MetricCard';
import RightIntelligencePanel from '../../components/shell/RightIntelligencePanel';
import { fetchApiJson } from '../../core/api/intelApi';
import { useUiStore } from '../../store/uiStore';
import { useLiveDataStore } from '../../store/liveDataStore';
import { relativeUpdated } from '../../utils/liveData';
import type { Severity } from '../../app/appTypes';

const icons = ['AC', 'ST', 'CB', 'SH', 'EM', 'SR'];

interface HealthPayload {
  storeSize?: number;
  satellites?: { count?: number };
  infrastructure?: { cableCount?: number; cables?: number; ships?: number };
  emergencies?: { cached?: number };
  aircraft?: { available?: boolean; loaded?: number };
}

interface SourcePayload {
  sources?: Array<{ operational_status?: string; status?: string }>;
}

export default function WorldSituationPanel() {
  const nowMs = useLiveDataStore((state) => state.nowMs);
  const setRightPanelOpen = useUiStore((state) => state.setRightPanelOpen);
  const setMode = useUiStore((state) => state.setMode);
  const [health, setHealth] = useState<HealthPayload | null>(null);
  const [sourceHealth, setSourceHealth] = useState<SourcePayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      fetchApiJson<HealthPayload>('/api/health', controller.signal),
      fetchApiJson<SourcePayload>('/api/v2/source-health?limit=20', controller.signal),
    ])
      .then(([healthPayload, sourcePayload]) => {
        setHealth(healthPayload);
        setSourceHealth(sourcePayload);
        setError(null);
      })
      .catch((loadError) => {
        if (controller.signal.aborted) return;
        setHealth(null);
        setSourceHealth(null);
        setError(loadError instanceof Error ? loadError.message : String(loadError));
      });
    return () => controller.abort();
  }, []);

  const metrics = useMemo(() => {
    const sources = sourceHealth?.sources ?? [];
    const healthySources = sources.filter((source) =>
      ['live', 'healthy', 'ok', 'success'].includes(String(source.operational_status ?? source.status ?? '').toLowerCase()),
    ).length;
    const sourceTotal = sources.length;
    return [
      metric('Flights Online', health?.storeSize ?? 'offline', health?.storeSize ? 'elevated' : 'moderate', 88),
      metric('Satellites', health?.satellites?.count ?? 0, 'moderate', 82),
      metric('Internet Cables', health?.infrastructure?.cableCount ?? health?.infrastructure?.cables ?? 0, 'healthy', 80),
      metric('Ships Cached', health?.infrastructure?.ships ?? 0, 'moderate', 70),
      metric('Emergency Signals', health?.emergencies?.cached ?? 0, (health?.emergencies?.cached ?? 0) > 0 ? 'high' : 'healthy', 86),
      metric('Source Health', sourceTotal > 0 ? `${healthySources} / ${sourceTotal}` : 'offline', healthySources > 0 ? 'healthy' : 'elevated', 72),
    ];
  }, [health, sourceHealth]);

  return (
    <RightIntelligencePanel>
      <div className="god-panel-scroll">
        <header className="panel-title-row">
          <div>
            <h2>Global Situation</h2>
            <span>{error ? `Backend unavailable: ${error}` : `Last updated: ${relativeUpdated(nowMs, 4)}`}</span>
          </div>
          <button type="button" onClick={() => setRightPanelOpen(false)}>Close</button>
        </header>
        <div className="metric-stack">
          {metrics.map((card, index) => (
            <MetricCard icon={icons[index]} key={card.label} {...card} />
          ))}
        </div>
        <button className="wide-action" type="button" onClick={() => setMode('watch-zones')}>View All Alerts & Events</button>
      </div>
    </RightIntelligencePanel>
  );
}

function metric(label: string, value: string | number, severity: Severity, confidence: number) {
  return { label, value, severity, confidence };
}

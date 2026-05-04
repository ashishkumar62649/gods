import { useEffect, useMemo, useState } from 'react';
import ConfidenceBar from '../../components/cards/ConfidenceBar';
import StatusBadge from '../../components/cards/StatusBadge';
import RightIntelligencePanel from '../../components/shell/RightIntelligencePanel';
import { fetchApiJson } from '../../core/api/intelApi';
import { useWatchZoneStore } from '../../store/watchZoneStore';
import AlertEvidenceCard from './AlertEvidenceCard';

export interface HazardRecord {
  id?: string;
  event_id?: string;
  title?: string;
  event_type?: string;
  severity?: string;
  source_name?: string;
  observed_time?: string;
  latitude?: number;
  longitude?: number;
  centroid_latitude?: number;
  centroid_longitude?: number;
  confidence_score?: number;
}

export default function ActiveAlertsPanel() {
  const severity = useWatchZoneStore((state) => state.severity);
  const sortDescending = useWatchZoneStore((state) => state.sortDescending);
  const toggleSort = useWatchZoneStore((state) => state.toggleSort);
  const setSeverity = useWatchZoneStore((state) => state.setSeverity);
  const [hazards, setHazards] = useState<HazardRecord[]>([]);
  const [status, setStatus] = useState<'loading' | 'live' | 'empty' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setStatus('loading');
    setError(null);
    fetchApiJson<{ hazards?: HazardRecord[] }>('/api/v2/hazards?limit=80', controller.signal)
      .then((payload) => {
        const rows = payload.hazards ?? [];
        setHazards(rows);
        setStatus(rows.length > 0 ? 'live' : 'empty');
      })
      .catch((loadError) => {
        if (controller.signal.aborted) return;
        setHazards([]);
        setStatus('error');
        setError(loadError instanceof Error ? loadError.message : String(loadError));
      });
    return () => controller.abort();
  }, []);

  const alerts = useMemo(() => hazards
    .filter((hazard) => severity === 'All' || normalizedSeverity(hazard) === severity.toLowerCase())
    .sort((a, b) => {
      const left = confidence(a);
      const right = confidence(b);
      return sortDescending ? right - left : left - right;
    }), [hazards, severity, sortDescending]);

  return (
    <RightIntelligencePanel>
      <div className="god-panel-scroll alert-panel">
        <header className="panel-title-row">
          <h2>Active Alerts <span>{status === 'live' ? `${alerts.length} Active` : statusLabel(status)}</span></h2>
          <button type="button" onClick={toggleSort}>Sort</button>
        </header>
        {status === 'loading' ? <p className="panel-empty">Loading hazard database events...</p> : null}
        {status === 'error' ? <p className="panel-empty">{error ?? 'Hazard endpoint unavailable.'}</p> : null}
        {status === 'empty' ? <p className="panel-empty">No active hazard events returned by the database.</p> : null}
        {alerts.map((alert, index) => (
          <article className={`alert-card ${index === 0 ? 'is-expanded' : ''}`} key={alert.event_id ?? alert.id ?? `${alert.title}-${index}`}>
            <header>
              <div>
                <strong>{alert.title ?? alert.event_type ?? 'Hazard event'}</strong>
                <span>{regionLabel(alert)}</span>
              </div>
              <StatusBadge tone={alert.severity}>{alert.severity ?? 'active'}</StatusBadge>
              <small>{formatObservedTime(alert.observed_time)}</small>
            </header>
            <ConfidenceBar value={confidence(alert)} />
            {index === 0 ? <AlertEvidenceCard hazard={alert} /> : null}
          </article>
        ))}
        <button className="wide-action" type="button" onClick={() => setSeverity('All')}>View All Alerts & History</button>
      </div>
    </RightIntelligencePanel>
  );
}

function confidence(hazard: HazardRecord) {
  return Math.round(hazard.confidence_score ?? 65);
}

function normalizedSeverity(hazard: HazardRecord) {
  return String(hazard.severity ?? 'active').toLowerCase();
}

function regionLabel(hazard: HazardRecord) {
  const lat = hazard.centroid_latitude ?? hazard.latitude;
  const lon = hazard.centroid_longitude ?? hazard.longitude;
  const source = hazard.source_name ? `${hazard.source_name} | ` : '';
  if (typeof lat !== 'number' || typeof lon !== 'number') return `${source}location unavailable`;
  return `${source}${lat.toFixed(2)}, ${lon.toFixed(2)}`;
}

function formatObservedTime(value?: string) {
  if (!value) return 'time unavailable';
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return value;
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(timestamp));
}

function statusLabel(status: 'loading' | 'live' | 'empty' | 'error') {
  switch (status) {
    case 'loading':
      return 'Loading';
    case 'empty':
      return 'No DB events';
    case 'error':
      return 'Backend unavailable';
    default:
      return 'Live';
  }
}

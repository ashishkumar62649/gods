import ConfidenceBar from '../../components/cards/ConfidenceBar';
import StatusBadge from '../../components/cards/StatusBadge';
import type { HazardRecord } from './ActiveAlertsPanel';

interface AlertEvidenceCardProps {
  hazard: HazardRecord | null;
}

export default function AlertEvidenceCard({ hazard }: AlertEvidenceCardProps) {
  const evidence = hazard ? [
    { label: 'Event Type', source: hazard.event_type ?? 'Hazard database', time: formatHazardTime(hazard.observed_time), impact: hazard.severity ?? 'active' },
    { label: 'Source', source: hazard.source_name ?? 'Unknown source', time: formatHazardTime(hazard.observed_time), impact: 'observed' },
    { label: 'Location', source: formatHazardLocation(hazard), time: 'current query', impact: 'mapped' },
  ] : [];

  return (
    <div className="evidence-card">
      <p className="god-kicker">Why This Location Is At Risk</p>
      <p>{hazard?.title ?? 'No hazard evidence is selected yet.'}</p>
      {evidence.map((item) => (
        <div className="evidence-row" key={item.label}>
          <div>
            <b>{item.label}</b>
            <span>{item.source}</span>
          </div>
          <small>{item.time}</small>
          <StatusBadge tone={item.impact.includes('High') ? 'high' : 'elevated'}>{item.impact}</StatusBadge>
        </div>
      ))}
      <ConfidenceBar value={Math.round(hazard?.confidence_score ?? 0)} label="Overall Confidence" />
    </div>
  );
}

function formatHazardTime(value?: string | null) {
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

function formatHazardLocation(hazard: HazardRecord) {
  const lat = hazard.centroid_latitude ?? hazard.latitude;
  const lon = hazard.centroid_longitude ?? hazard.longitude;
  if (typeof lat !== 'number' || typeof lon !== 'number') return 'geometry unavailable';
  return `${lat.toFixed(2)}, ${lon.toFixed(2)}`;
}

import ConfidenceBar from '../../components/cards/ConfidenceBar';
import StatusBadge from '../../components/cards/StatusBadge';
import { watchZonesMock } from './watchZonesMock';

export default function AlertEvidenceCard() {
  return (
    <div className="evidence-card">
      <p className="god-kicker">Why This Location Is At Risk</p>
      <p>Multiple open-source datasets indicate elevated risk of riverine flooding in the Hooghly Basin.</p>
      {watchZonesMock.evidence.map((item) => (
        <div className="evidence-row" key={item.label}>
          <div>
            <b>{item.label}</b>
            <span>{item.source}</span>
          </div>
          <small>{item.time}</small>
          <StatusBadge tone={item.impact.includes('High') ? 'high' : 'elevated'}>{item.impact}</StatusBadge>
        </div>
      ))}
      <ConfidenceBar value={72} label="Overall Confidence" />
    </div>
  );
}

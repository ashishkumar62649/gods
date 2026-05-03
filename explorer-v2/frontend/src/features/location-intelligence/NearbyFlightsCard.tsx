import ConfidenceBar from '../../components/cards/ConfidenceBar';
import IntelligenceCard from '../../components/cards/IntelligenceCard';

export default function NearbyFlightsCard({ count }: { count: number }) {
  return (
    <IntelligenceCard title="Nearby Flights">
      <strong className="big-number">{count}</strong>
      <span>Within 150 km</span>
      <dl className="compact-dl">
        <dt>Commercial</dt><dd>{Math.max(0, count - 6)}</dd>
        <dt>Military</dt><dd>{Math.min(5, Math.floor(count / 4))}</dd>
        <dt>Other</dt><dd>{Math.max(0, count - Math.max(0, count - 6) - Math.min(5, Math.floor(count / 4)))}</dd>
      </dl>
      <ConfidenceBar value={78 + Math.min(12, count)} />
    </IntelligenceCard>
  );
}

import ConfidenceBar from '../../components/cards/ConfidenceBar';
import IntelligenceCard from '../../components/cards/IntelligenceCard';

export default function NearbyHazardsCard({ count }: { count: number }) {
  return (
    <IntelligenceCard title="Nearby Fires">
      <strong className="big-number">{count}</strong>
      <span>{count > 6 ? '0-50 km elevated cluster' : 'No major cluster detected'}</span>
      <ConfidenceBar value={62 + Math.min(24, count * 3)} />
    </IntelligenceCard>
  );
}

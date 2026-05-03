import ConfidenceBar from '../../components/cards/ConfidenceBar';
import IntelligenceCard from '../../components/cards/IntelligenceCard';

interface PopulationExposureCardProps {
  populationM: number;
  confidence: number;
}

export default function PopulationExposureCard({ populationM, confidence }: PopulationExposureCardProps) {
  const high = populationM * 0.18;
  const moderate = populationM * 0.48;
  const low = Math.max(0, populationM - high - moderate);

  return (
    <IntelligenceCard title="Population Exposure">
      <strong className="big-number">{populationM.toFixed(1)}M</strong>
      <span>Within 100 km</span>
      <dl className="compact-dl">
        <dt>High</dt><dd>{high.toFixed(1)}M</dd>
        <dt>Moderate</dt><dd>{moderate.toFixed(1)}M</dd>
        <dt>Low</dt><dd>{low.toFixed(1)}M</dd>
      </dl>
      <ConfidenceBar value={confidence} />
    </IntelligenceCard>
  );
}

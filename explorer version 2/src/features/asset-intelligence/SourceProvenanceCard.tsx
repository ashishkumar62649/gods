import IntelligenceCard from '../../components/cards/IntelligenceCard';
import { assetMock } from './assetMock';

export default function SourceProvenanceCard() {
  return (
    <IntelligenceCard title="Source Provenance">
      <div className="source-grid">
        {assetMock.sourceProvenance.map((source) => (
          <span key={source.label}>
            <b>{source.label}</b>
            <small>{source.status}</small>
          </span>
        ))}
      </div>
    </IntelligenceCard>
  );
}

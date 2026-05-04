import IntelligenceCard from '../../components/cards/IntelligenceCard';
import type { AssetSource } from '../../data/contracts/assetContracts';

export default function SourceProvenanceCard({ sources }: { sources: AssetSource[] }) {
  return (
    <IntelligenceCard title="Source Provenance">
      <div className="source-grid">
        {sources.map((source) => (
          <span key={source.label}>
            <b>{source.label}</b>
            <small>{source.status}</small>
          </span>
        ))}
      </div>
    </IntelligenceCard>
  );
}

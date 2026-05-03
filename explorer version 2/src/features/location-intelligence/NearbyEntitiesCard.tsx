import IntelligenceCard from '../../components/cards/IntelligenceCard';
import { useLiveDataStore } from '../../store/liveDataStore';

const baseEntities = ['Port authority', 'Military facility', 'Energy operator', 'Regional utility'];

export default function NearbyEntitiesCard() {
  const feedCycle = useLiveDataStore((state) => state.feedCycle);
  const entities = baseEntities.map((entity, index) => `${entity} ${12 + index * 19 + (feedCycle % 8)} km`);

  return (
    <IntelligenceCard title="Nearby Entities">
      <ul className="entity-list">
        {entities.map((entity) => <li key={entity}>{entity}</li>)}
      </ul>
      <button type="button">View all (24)</button>
    </IntelligenceCard>
  );
}

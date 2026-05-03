import IntelligenceCard from '../../components/cards/IntelligenceCard';
import { useLiveDataStore } from '../../store/liveDataStore';
import { relativeUpdated } from '../../utils/liveData';

export default function LatestEventsCard() {
  const nowMs = useLiveDataStore((state) => state.nowMs);

  return (
    <IntelligenceCard title="Latest News / Events">
      <ul className="event-list">
        <li>Weather bulletin refreshed {relativeUpdated(nowMs, 80)}.</li>
        <li>Infrastructure status sync completed {relativeUpdated(nowMs, 190)}.</li>
        <li>Open-source event scan updated {relativeUpdated(nowMs, 360)}.</li>
      </ul>
    </IntelligenceCard>
  );
}

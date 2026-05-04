import StatusBadge from '../../components/cards/StatusBadge';
import { watchZonesMock } from '../../data/mock/watch-zones/watchZonesMock';
import { useWatchZoneStore } from '../../store/watchZoneStore';

export default function ChangeHistoryTimeline() {
  const historyPlaying = useWatchZoneStore((state) => state.historyPlaying);
  const toggleHistoryPlaying = useWatchZoneStore((state) => state.toggleHistoryPlaying);

  return (
    <section className="change-history god-glass">
      <header>
        <span className="god-kicker">Change History</span>
        <b>Past 24 Hours</b>
        <button type="button" onClick={toggleHistoryPlaying}>{historyPlaying ? 'Pause' : 'Play'}</button>
      </header>
      <div className={`history-track ${historyPlaying ? 'is-playing' : ''}`}>
        {watchZonesMock.history.map((item) => (
          <article key={`${item.time}-${item.title}`}>
            <span>{item.time}</span>
            <strong>{item.title}</strong>
            <p>{item.detail}</p>
            <StatusBadge tone={item.severity}>{item.severity}</StatusBadge>
          </article>
        ))}
      </div>
    </section>
  );
}

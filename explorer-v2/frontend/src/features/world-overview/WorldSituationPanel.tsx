import MetricCard from '../../components/cards/MetricCard';
import RightIntelligencePanel from '../../components/shell/RightIntelligencePanel';
import { useLiveDataStore } from '../../store/liveDataStore';
import { makeWorldMetrics, relativeUpdated } from '../../utils/liveData';

const icons = ['ST', 'AC', 'FR', 'EQ', 'AL', 'SR'];

export default function WorldSituationPanel() {
  const nowMs = useLiveDataStore((state) => state.nowMs);
  const metrics = makeWorldMetrics(nowMs);

  return (
    <RightIntelligencePanel>
      <div className="god-panel-scroll">
        <header className="panel-title-row">
          <div>
            <h2>Global Situation</h2>
            <span>Last updated: {relativeUpdated(nowMs, 4)}</span>
          </div>
          <button type="button">Close</button>
        </header>
        <div className="metric-stack">
          {metrics.map((card, index) => (
            <MetricCard icon={icons[index]} key={card.label} {...card} />
          ))}
        </div>
        <button className="wide-action" type="button">View All Alerts & Events</button>
      </div>
    </RightIntelligencePanel>
  );
}

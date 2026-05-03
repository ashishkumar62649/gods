import ConfidenceBar from '../../components/cards/ConfidenceBar';
import StatusBadge from '../../components/cards/StatusBadge';
import RightIntelligencePanel from '../../components/shell/RightIntelligencePanel';
import { useLiveDataStore } from '../../store/liveDataStore';
import { makeWatchAlerts } from '../../utils/liveData';
import AlertEvidenceCard from './AlertEvidenceCard';

export default function ActiveAlertsPanel() {
  const nowMs = useLiveDataStore((state) => state.nowMs);
  const alerts = makeWatchAlerts(nowMs);

  return (
    <RightIntelligencePanel>
      <div className="god-panel-scroll alert-panel">
        <header className="panel-title-row">
          <h2>Active Alerts <span>{alerts.length} Active</span></h2>
          <button type="button">Sort</button>
        </header>
        {alerts.map((alert, index) => (
          <article className={`alert-card ${index === 2 ? 'is-expanded' : ''}`} key={alert.id}>
            <header>
              <div>
                <strong>{alert.title}</strong>
                <span>{alert.region}</span>
              </div>
              <StatusBadge tone={alert.severity}>{alert.severity}</StatusBadge>
              <small>{alert.time}</small>
            </header>
            <ConfidenceBar value={alert.confidence} />
            {index === 2 ? <AlertEvidenceCard /> : null}
          </article>
        ))}
        <button className="wide-action" type="button">View All Alerts & History</button>
      </div>
    </RightIntelligencePanel>
  );
}

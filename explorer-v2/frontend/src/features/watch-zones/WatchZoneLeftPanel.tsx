import StatusBadge from '../../components/cards/StatusBadge';
import LeftControlPanel from '../../components/shell/LeftControlPanel';
import { useUiStore } from '../../store/uiStore';
import { watchZonesMock } from './watchZonesMock';

export default function WatchZoneLeftPanel() {
  const toggleLeftPanel = useUiStore((state) => state.toggleLeftPanel);

  return (
    <LeftControlPanel>
      <div className="god-panel-scroll">
        <header className="panel-title-row"><h2>Watch Zones</h2><button type="button" onClick={toggleLeftPanel}>Collapse</button></header>
        <input className="panel-search" placeholder="Search watch zones..." />
        <div className="zone-tabs">
          <button type="button" className="is-active">All 12</button>
          <button type="button">High 4</button>
          <button type="button">Med 5</button>
          <button type="button">Low 3</button>
        </div>
        <div className="zone-list">
          {watchZonesMock.zones.map((zone) => (
            <article className={zone.id === 'bay' ? 'is-selected' : ''} key={zone.id}>
              <div>
                <strong>{zone.name}</strong>
                <span>{zone.category}</span>
                <small>Updated {zone.updated}</small>
              </div>
              <StatusBadge tone={zone.severity}>{zone.severity}</StatusBadge>
            </article>
          ))}
        </div>
        <button className="wide-action" type="button">+ Create Watch Zone</button>
      </div>
    </LeftControlPanel>
  );
}

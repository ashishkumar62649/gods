import StatusBadge from '../../components/cards/StatusBadge';
import LeftControlPanel from '../../components/shell/LeftControlPanel';
import { useUiStore } from '../../store/uiStore';
import { useWatchZoneStore } from '../../store/watchZoneStore';
import { watchZonesMock } from '../../data/mock/watch-zones/watchZonesMock';

export default function WatchZoneLeftPanel() {
  const toggleLeftPanel = useUiStore((state) => state.toggleLeftPanel);
  const search = useWatchZoneStore((state) => state.search);
  const severity = useWatchZoneStore((state) => state.severity);
  const selectedZoneId = useWatchZoneStore((state) => state.selectedZoneId);
  const setSearch = useWatchZoneStore((state) => state.setSearch);
  const setSeverity = useWatchZoneStore((state) => state.setSeverity);
  const selectZone = useWatchZoneStore((state) => state.selectZone);
  const normalizedSearch = search.trim().toLowerCase();
  const zones = watchZonesMock.zones.filter((zone) => {
    const severityMatch = severity === 'All' || zone.severity.toLowerCase() === severity.toLowerCase();
    const searchMatch =
      !normalizedSearch ||
      zone.name.toLowerCase().includes(normalizedSearch) ||
      zone.category.toLowerCase().includes(normalizedSearch);
    return severityMatch && searchMatch;
  });
  const severityCounts = watchZonesMock.zones.reduce<Record<string, number>>((counts, zone) => {
    const key = zone.severity.toLowerCase();
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});

  return (
    <LeftControlPanel>
      <div className="god-panel-scroll">
        <header className="panel-title-row"><h2>Watch Zones</h2><button type="button" onClick={toggleLeftPanel}>Collapse</button></header>
        <input
          className="panel-search"
          placeholder="Search watch zones..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <div className="zone-tabs">
          <button type="button" className={severity === 'All' ? 'is-active' : ''} onClick={() => setSeverity('All')}>All {watchZonesMock.zones.length}</button>
          <button type="button" className={severity === 'High' ? 'is-active' : ''} onClick={() => setSeverity('High')}>High {severityCounts.high ?? 0}</button>
          <button type="button" className={severity === 'Moderate' ? 'is-active' : ''} onClick={() => setSeverity('Moderate')}>Med {severityCounts.moderate ?? 0}</button>
          <button type="button" className={severity === 'Low' ? 'is-active' : ''} onClick={() => setSeverity('Low')}>Low {severityCounts.low ?? 0}</button>
        </div>
        <div className="zone-list">
          {zones.map((zone) => (
            <article
              className={zone.id === selectedZoneId ? 'is-selected' : ''}
              key={zone.id}
              onClick={() => selectZone(zone.id)}
            >
              <div>
                <strong>{zone.name}</strong>
                <span>{zone.category}</span>
                <small>Updated {zone.updated}</small>
              </div>
              <StatusBadge tone={zone.severity}>{zone.severity}</StatusBadge>
            </article>
          ))}
        </div>
        <button className="wide-action" type="button" disabled title="Requires persisted watch-zone API">+ Create Watch Zone</button>
      </div>
    </LeftControlPanel>
  );
}

import FilterDropdown from '../../components/controls/FilterDropdown';
import { useWatchZoneStore } from '../../store/watchZoneStore';

export default function WatchZoneFilterBar() {
  const severity = useWatchZoneStore((state) => state.severity);
  const category = useWatchZoneStore((state) => state.category);
  const source = useWatchZoneStore((state) => state.source);
  const timeWindow = useWatchZoneStore((state) => state.timeWindow);
  const setSeverity = useWatchZoneStore((state) => state.setSeverity);
  const setCategory = useWatchZoneStore((state) => state.setCategory);
  const setSource = useWatchZoneStore((state) => state.setSource);
  const setTimeWindow = useWatchZoneStore((state) => state.setTimeWindow);
  const toggleSort = useWatchZoneStore((state) => state.toggleSort);

  return (
    <section className="watch-filter-bar god-glass">
      <FilterDropdown label="Severity" value={severity} options={['All', 'High', 'Elevated', 'Moderate', 'Low']} onChange={setSeverity} />
      <FilterDropdown label="Category" value={category} options={['All', 'Weather', 'Flood', 'Maritime', 'Security', 'Operations']} onChange={setCategory} />
      <FilterDropdown label="Source" value={source} options={['All', 'Hazards DB', 'Weather DB', 'Maritime feeds']} onChange={setSource} />
      <FilterDropdown label="Time Window" value={timeWindow} options={['Past 24 Hours', 'Past 7 Days', 'Live Only']} onChange={setTimeWindow} />
      <button type="button" onClick={toggleSort}>Sort</button>
      <button type="button" onClick={() => window.localStorage.setItem('god-eyes-watch-zone-view', JSON.stringify({ severity, category, source, timeWindow }))}>Save View</button>
    </section>
  );
}

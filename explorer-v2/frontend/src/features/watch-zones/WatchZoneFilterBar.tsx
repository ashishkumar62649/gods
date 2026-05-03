import FilterDropdown from '../../components/controls/FilterDropdown';

export default function WatchZoneFilterBar() {
  return (
    <section className="watch-filter-bar god-glass">
      <FilterDropdown label="Severity" value="All" />
      <FilterDropdown label="Category" value="All" />
      <FilterDropdown label="Source" value="All" />
      <FilterDropdown label="Time Window" value="Past 24 Hours" />
      <button type="button">Filters</button>
      <button type="button">Save View</button>
    </section>
  );
}

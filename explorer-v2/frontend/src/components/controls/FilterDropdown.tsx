interface FilterDropdownProps {
  label: string;
  value: string;
}

export default function FilterDropdown({ label, value }: FilterDropdownProps) {
  return (
    <label className="filter-dropdown">
      <span>{label}</span>
      <select value={value} onChange={() => undefined}>
        <option>{value}</option>
      </select>
    </label>
  );
}

interface FilterDropdownProps {
  label: string;
  value: string;
  options?: string[];
  onChange?: (value: string) => void;
}

export default function FilterDropdown({
  label,
  value,
  options = [value],
  onChange,
}: FilterDropdownProps) {
  return (
    <label className="filter-dropdown">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange?.(event.target.value)}>
        {options.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

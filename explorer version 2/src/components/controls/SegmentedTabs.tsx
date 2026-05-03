interface SegmentedTabsProps {
  options: Array<{ id: string; label: string }>;
  active: string;
  onChange: (id: string) => void;
}

export default function SegmentedTabs({ options, active, onChange }: SegmentedTabsProps) {
  return (
    <div className="segmented-tabs">
      {options.map((option) => (
        <button
          className={option.id === active ? 'is-active' : ''}
          type="button"
          key={option.id}
          onClick={() => onChange(option.id)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

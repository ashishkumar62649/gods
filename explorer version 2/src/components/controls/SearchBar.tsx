interface SearchBarProps {
  value?: string;
  placeholder?: string;
  onChange?: (value: string) => void;
  onSubmit?: (value: string) => void;
}

export default function SearchBar({
  value = '',
  placeholder = 'Search for a location, asset, event...',
  onChange,
  onSubmit,
}: SearchBarProps) {
  return (
    <form
      className="search-command"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit?.(value);
      }}
    >
      <span>Q</span>
      <input
        aria-label={placeholder}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
      />
      <kbd>Ctrl K</kbd>
    </form>
  );
}

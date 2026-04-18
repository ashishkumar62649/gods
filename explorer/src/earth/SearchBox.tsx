import { FormEvent, useState } from 'react';

interface SearchBoxProps {
  /**
   * Called when the user submits a query (Enter or Go button).
   * Return a Promise so the button can show a busy state while the
   * geocoder + flyTo run.
   */
  onSearch: (query: string) => void | Promise<void>;
}

/**
 * Minimal search input for "go to any place".
 * Controlled React input, form-based so Enter naturally submits.
 * Styling lives in app.css (.search-box).
 */
export default function SearchBox({ onSearch }: SearchBoxProps) {
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const query = value.trim();
    if (!query || busy) return;
    setBusy(true);
    try {
      await onSearch(query);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="search-box" onSubmit={handleSubmit} role="search">
      <input
        type="text"
        className="search-box__input"
        placeholder="Search a place (Delhi, Eiffel Tower…)"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        aria-label="Search a place"
        autoComplete="off"
        spellCheck={false}
      />
      <button
        type="submit"
        className="search-box__submit"
        disabled={busy || !value.trim()}
        aria-label="Go to place"
      >
        {busy ? '…' : 'Go'}
      </button>
    </form>
  );
}

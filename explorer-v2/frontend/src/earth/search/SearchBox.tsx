import { FormEvent, useEffect, useRef, useState } from 'react';

interface SearchBoxProps {
  /**
   * Called when the user submits a query (Enter or Go button).
   * Return a Promise so the button can show a busy state while the
   * geocoder + flyTo run.
   */
  onSearch: (query: string) => void | Promise<void>;
}

const RECENT_SEARCHES_KEY = 'god-eyes-recent-searches';
const MAX_RECENT_SEARCHES = 6;

function loadRecentSearches() {
  if (typeof window === 'undefined') return [];

  try {
    const raw = window.localStorage.getItem(RECENT_SEARCHES_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((value): value is string => typeof value === 'string')
      .slice(0, MAX_RECENT_SEARCHES);
  } catch {
    return [];
  }
}

function saveRecentSearches(values: string[]) {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(values));
  } catch {
    // Ignore persistence failures. Search still works without local history.
  }
}

/**
 * Search input for "go to any place".
 * Keeps a small recent-search history and opens it as a dropdown when the
 * field is focused, matching the everyday search patterns the user asked for.
 */
export default function SearchBox({ onSearch }: SearchBoxProps) {
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>(loadRecentSearches);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }

    window.addEventListener('pointerdown', handlePointerDown);
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
    };
  }, []);

  async function runSearch(query: string) {
    if (!query || busy) return;

    setBusy(true);
    try {
      await onSearch(query);
      const nextRecentSearches = [
        query,
        ...recentSearches.filter(
          (recentQuery) => recentQuery.toLowerCase() !== query.toLowerCase(),
        ),
      ].slice(0, MAX_RECENT_SEARCHES);

      setRecentSearches(nextRecentSearches);
      saveRecentSearches(nextRecentSearches);
      setDropdownOpen(false);
    } finally {
      setBusy(false);
    }
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    await runSearch(value.trim());
  }

  return (
    <div
      className="search-box absolute top-4 left-4 z-50 w-[clamp(16rem,18vw,20rem)] aether-panel rounded-xl"
      ref={rootRef}
      style={{ pointerEvents: 'auto' }}
    >
      <form
        className="search-box__surface"
        onSubmit={handleSubmit}
        role="search"
      >
        <input
          type="text"
          className="search-box__input"
          placeholder="Search a place"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onFocus={() => setDropdownOpen(true)}
          aria-label="Search a place"
          autoComplete="off"
          spellCheck={false}
        />
        <button
          type="submit"
          className="search-box__submit"
          disabled={busy || !value.trim()}
          aria-label="Search a place"
        >
          {busy ? '...' : 'Enter'}
        </button>
      </form>
      {dropdownOpen && recentSearches.length > 0 ? (
        <div className="search-box__dropdown custom-scrollbar" role="listbox">
          <p className="search-box__dropdown-title">Recent Searches</p>
          <div className="search-box__dropdown-list">
            {recentSearches.map((recentQuery) => (
              <button
                key={recentQuery}
                type="button"
                className="search-box__recent"
                onClick={() => {
                  setValue(recentQuery);
                  void runSearch(recentQuery);
                }}
              >
                {recentQuery}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

import { APP_MODES, type AppMode } from '../../app/appModes';
import { useUiStore } from '../../store/uiStore';
import { useMapStore } from '../../core/store/useMapStore';
import SearchBox from '../../earth/search/SearchBox';
import IconButton from '../controls/IconButton';
import SourceStatusChips from './SourceStatusChips';
import { useLiveDataStore } from '../../store/liveDataStore';
import { formatClock, formatDate } from '../../utils/liveData';

export default function TopBar() {
  const mode = useUiStore((state) => state.mode);
  const setMode = useUiStore((state) => state.setMode);
  const requestSearch = useMapStore((state) => state.requestSearch);
  const nowMs = useLiveDataStore((state) => state.nowMs);
  const recordSearchContext = useLiveDataStore((state) => state.recordSearchContext);
  const selectedLocationName = useLiveDataStore((state) => state.selectedLocationName);

  const handleSearch = (query: string) => {
    recordSearchContext(query);
    requestSearch(query);
  };

  return (
    <header className="top-bar">
      <div className="brand-lockup">
        <span className="brand-mark">G</span>
        <strong>GODS Explorer</strong>
      </div>
      <select value={mode} onChange={(event) => setMode(event.target.value as AppMode)}>
        {APP_MODES.map((item) => (
          <option value={item.id} key={item.id}>
            {item.label}
          </option>
        ))}
      </select>
      <div className="top-search">
        <SearchBox onSearch={handleSearch} />
      </div>
      <div className="time-block">
        <strong>{formatClock(nowMs, 'UTC')}</strong>
        <span>{formatDate(nowMs, 'UTC')} UTC</span>
      </div>
      <div className="time-block">
        <strong>Local {formatClock(nowMs)}</strong>
        <span>{selectedLocationName}</span>
      </div>
      <SourceStatusChips />
      <div className="top-actions">
        <IconButton label="Notifications">N</IconButton>
        <IconButton label="Settings">S</IconButton>
        <IconButton label="Download">D</IconButton>
        <span className="avatar">A</span>
      </div>
    </header>
  );
}

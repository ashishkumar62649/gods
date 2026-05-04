import { APP_MODES, type AppMode } from '../../app/appModes';
import { useUiStore } from '../../store/uiStore';
import { useMapStore } from '../../core/store/useMapStore';
import SearchBox from '../../earth/search/SearchBox';
import IconButton from '../controls/IconButton';
import SourceStatusChips from './SourceStatusChips';
import { useLiveDataStore } from '../../store/liveDataStore';
import { useLayerStore } from '../../store/layerStore';
import { useTimelineStore } from '../../store/timelineStore';
import { formatClock, formatDate } from '../../utils/liveData';

export default function TopBar() {
  const mode = useUiStore((state) => state.mode);
  const setMode = useUiStore((state) => state.setMode);
  const toggleMapLayerPicker = useUiStore((state) => state.toggleMapLayerPicker);
  const requestSearch = useMapStore((state) => state.requestSearch);
  const nowMs = useLiveDataStore((state) => state.nowMs);
  const recordSearchContext = useLiveDataStore((state) => state.recordSearchContext);
  const selectedLocationName = useLiveDataStore((state) => state.selectedLocationName);
  const activeLayers = useLayerStore((state) => state.activeLayers);
  const timeline = useTimelineStore();

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
        <IconButton label="Notifications" onClick={() => setMode('watch-zones')}>N</IconButton>
        <IconButton label="Settings" onClick={toggleMapLayerPicker}>S</IconButton>
        <IconButton
          label="Download"
          onClick={() => downloadViewSnapshot({
            mode,
            selectedLocationName,
            activeLayers,
            timeline: {
              mode: timeline.mode,
              currentTime: new Date(timeline.currentTimeMs).toISOString(),
              startTime: new Date(timeline.startTimeMs).toISOString(),
              endTime: new Date(timeline.endTimeMs).toISOString(),
              playbackSpeed: timeline.playbackSpeed,
            },
          })}
        >
          D
        </IconButton>
        <span className="avatar">A</span>
      </div>
    </header>
  );
}

function downloadViewSnapshot(payload: unknown) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `god-eyes-view-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

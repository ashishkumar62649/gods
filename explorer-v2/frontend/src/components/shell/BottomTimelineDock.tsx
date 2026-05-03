import { useTimelineStore } from '../../store/timelineStore';
import { useLiveDataStore } from '../../store/liveDataStore';
import { formatDate, timelineTicks } from '../../utils/liveData';
import SegmentedTabs from '../controls/SegmentedTabs';
import TimelineButton from '../controls/TimelineButton';

interface BottomTimelineDockProps {
  variant?: 'world' | 'asset' | 'location' | 'watch-zones';
}

const modeOptions = [
  { id: 'past-24h', label: 'Past 24h' },
  { id: 'forecast-72h', label: 'Forecast 72h' },
  { id: 'live', label: 'Live' },
];

const rowsByVariant = {
  world: ['Satellite (True Color)', 'Radar (Precipitation)', 'Wind (10m)'],
  asset: ['Aircraft (ADS-B)', 'Weather (Radar)'],
  location: ['Satellite (True Color)', 'Radar (Precipitation)', 'Wind (10m)'],
  'watch-zones': ['Change History', 'Alert Confidence'],
};

export default function BottomTimelineDock({ variant = 'world' }: BottomTimelineDockProps) {
  const isPlaying = useTimelineStore((state) => state.isPlaying);
  const togglePlaying = useTimelineStore((state) => state.togglePlaying);
  const speed = useTimelineStore((state) => state.speed);
  const setSpeed = useTimelineStore((state) => state.setSpeed);
  const timelineMode = useTimelineStore((state) => state.timelineMode);
  const setTimelineMode = useTimelineStore((state) => state.setTimelineMode);
  const nowMs = useLiveDataStore((state) => state.nowMs);
  const ticks = timelineTicks(nowMs);

  return (
    <section className={`bottom-timeline god-glass bottom-timeline--${variant}`}>
      <header>
        <span className="god-kicker">Timeline</span>
        <b>{formatDate(nowMs)}</b>
        <TimelineButton onClick={togglePlaying}>{isPlaying ? 'Pause' : 'Play'}</TimelineButton>
        <select value={speed} onChange={(event) => setSpeed(Number(event.target.value) as 1 | 2 | 4)}>
          <option value={1}>1x</option>
          <option value={2}>2x</option>
          <option value={4}>4x</option>
        </select>
        <SegmentedTabs
          active={timelineMode}
          options={modeOptions}
          onChange={(id) => setTimelineMode(id as 'past-24h' | 'forecast-72h' | 'live')}
        />
      </header>
      <div className="timeline-ruler">
        {ticks.map((tick) => (
          <span key={tick}>{tick}</span>
        ))}
      </div>
      <div className="timeline-rows">
        {rowsByVariant[variant].map((row, index) => (
          <div className="timeline-row" key={row}>
            <span>{row}</span>
            <i className={`line-${index + 1}`} />
          </div>
        ))}
      </div>
    </section>
  );
}

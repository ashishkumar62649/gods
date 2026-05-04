import type { CSSProperties } from 'react';
import { useTimelineStore, type TimelineMode } from '../../store/timelineStore';
import { formatDate, timelineTicks } from '../../utils/liveData';
import SegmentedTabs from '../controls/SegmentedTabs';
import TimelineButton from '../controls/TimelineButton';

interface BottomTimelineDockProps {
  variant?: 'world' | 'asset' | 'location' | 'watch-zones';
}

const modeOptions = [
  { id: 'live', label: 'Live' },
  { id: 'historical', label: 'Past 24h' },
  { id: 'forecast', label: 'Forecast 72h' },
];

const rowsByVariant = {
  world: [
    ['weather', 'Weather grid'],
    ['hazards', 'Hazard events'],
    ['satellites', 'Satellite orbits'],
  ],
  asset: [
    ['flights', 'Aircraft positions'],
    ['weather', 'Route weather'],
    ['satellites', 'Satellite context'],
  ],
  location: [
    ['weather', 'Local weather'],
    ['hazards', 'Nearby hazards'],
    ['infrastructure', 'Infrastructure context'],
  ],
  'watch-zones': [
    ['hazards', 'Change history'],
    ['weather', 'Trigger confidence'],
  ],
} as const;

export default function BottomTimelineDock({ variant = 'world' }: BottomTimelineDockProps) {
  const isPlaying = useTimelineStore((state) => state.isPlaying);
  const togglePlaying = useTimelineStore((state) => state.togglePlaying);
  const speed = useTimelineStore((state) => state.playbackSpeed);
  const setSpeed = useTimelineStore((state) => state.setPlaybackSpeed);
  const mode = useTimelineStore((state) => state.mode);
  const setMode = useTimelineStore((state) => state.setMode);
  const currentTimeMs = useTimelineStore((state) => state.currentTimeMs);
  const startTimeMs = useTimelineStore((state) => state.startTimeMs);
  const endTimeMs = useTimelineStore((state) => state.endTimeMs);
  const scrubPercent = useTimelineStore((state) => state.scrubPercent);
  const scrubToPercent = useTimelineStore((state) => state.scrubToPercent);
  const supportedDomains = useTimelineStore((state) => state.supportedDomains);
  const unsupportedDomainMessages = useTimelineStore((state) => state.unsupportedDomainMessages);
  const ticks = timelineTicks(startTimeMs, endTimeMs);

  return (
    <section className={`bottom-timeline god-glass bottom-timeline--${variant}`}>
      <header>
        <span className="god-kicker">Timeline</span>
        <b>{formatDate(currentTimeMs)}</b>
        <TimelineButton onClick={togglePlaying}>{isPlaying ? 'Pause' : 'Play'}</TimelineButton>
        <select value={speed} onChange={(event) => setSpeed(Number(event.target.value) as 1 | 2 | 4)}>
          <option value={1}>1x</option>
          <option value={2}>2x</option>
          <option value={4}>4x</option>
        </select>
        <SegmentedTabs
          active={mode}
          options={modeOptions}
          onChange={(id) => setMode(id as TimelineMode)}
        />
      </header>
      <div className="timeline-scrubber">
        <span>{formatDate(startTimeMs)}</span>
        <input
          aria-label="Timeline scrubber"
          max={100}
          min={0}
          type="range"
          value={scrubPercent}
          onChange={(event) => scrubToPercent(Number(event.target.value))}
        />
        <span>{formatDate(endTimeMs)}</span>
      </div>
      <div className="timeline-ruler">
        {ticks.map((tick) => (
          <span key={tick}>{tick}</span>
        ))}
      </div>
      <div className="timeline-rows">
        {rowsByVariant[variant].map(([domain, row], index) => {
          const capability = supportedDomains[domain];
          const supported = capability?.[mode] ?? false;
          const markerStyle = { '--timeline-marker': `${scrubPercent}%` } as CSSProperties;
          return (
            <div className={`timeline-row ${supported ? '' : 'timeline-row--unsupported'}`} key={row}>
              <span>{row}</span>
              <i className={`line-${index + 1}`} style={markerStyle} />
              <small>{supported ? `${mode} ready` : unsupportedDomainMessages[domain]}</small>
            </div>
          );
        })}
      </div>
    </section>
  );
}

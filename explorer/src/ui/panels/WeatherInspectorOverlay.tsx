import { useWeatherInspectStore } from '../../core/store/useWeatherInspectStore';
import WeatherInspectorCard from './WeatherInspectorCard';
import WeatherReticle from './WeatherReticle';

const KEYFRAMES = `
@keyframes weather-live-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.55; }
}
@keyframes weather-aqi-throb {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.04); }
}
`;

export default function WeatherInspectorOverlay() {
  const pinnedPoints = useWeatherInspectStore((s) => s.pinnedPoints);
  const isFetching = useWeatherInspectStore((s) => s.isFetching);
  const lastError = useWeatherInspectStore((s) => s.lastError);
  const cursorPoint = useWeatherInspectStore((s) => s.cursorPoint);
  const tacticalLevel = useWeatherInspectStore((s) => s.tacticalLevel);

  const showCursor = cursorPoint !== null && tacticalLevel !== 'orbital';
  const hasAnything = pinnedPoints.length > 0 || isFetching || lastError || showCursor;

  return (
    <>
      <style>{KEYFRAMES}</style>
      <WeatherReticle />
      {hasAnything && (
        <div
          style={{
            position: 'absolute',
            top: '6rem',
            right: '1rem',
            zIndex: 30,
            maxHeight: 'calc(100vh - 8rem)',
            overflowY: 'auto',
            pointerEvents: 'auto',
            width: '20rem',
          }}
          className="custom-scrollbar"
          aria-label="Weather inspector"
        >
          {showCursor && cursorPoint && (
            <WeatherInspectorCard
              point={cursorPoint}
              variant="cursor"
              tacticalLevel={tacticalLevel}
            />
          )}
          {isFetching && (
            <div
              style={{
                background: 'rgba(8, 15, 30, 0.85)',
                border: '1px solid rgba(34, 211, 238, 0.25)',
                borderRadius: '0.5rem',
                padding: '0.4rem 0.7rem',
                marginBottom: '0.4rem',
                color: '#67e8f9',
                fontSize: '0.65rem',
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
              }}
            >
              Sampling point…
            </div>
          )}
          {lastError && !isFetching && (
            <div
              style={{
                background: 'rgba(48, 12, 12, 0.85)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                borderRadius: '0.5rem',
                padding: '0.4rem 0.7rem',
                marginBottom: '0.4rem',
                color: '#fecaca',
                fontSize: '0.65rem',
              }}
            >
              {lastError}
            </div>
          )}
          {pinnedPoints.map((p) => (
            <WeatherInspectorCard key={p.id} point={p} variant="pinned" />
          ))}
        </div>
      )}
    </>
  );
}

import {
  SURFACE_ALTITUDE_M,
  TRANSITION_ALTITUDE_M,
  useWeatherInspectStore,
} from '../../core/store/useWeatherInspectStore';

function altitudeOpacity(meters: number | null): number {
  if (meters === null) return 0;
  if (meters > TRANSITION_ALTITUDE_M) return 0;
  if (meters <= SURFACE_ALTITUDE_M) return 1;
  // Linear ramp from 100 km (0) to 50 km (1).
  return (TRANSITION_ALTITUDE_M - meters) / (TRANSITION_ALTITUDE_M - SURFACE_ALTITUDE_M);
}

export default function WeatherReticle() {
  const altitude = useWeatherInspectStore((s) => s.cameraAltitudeMeters);
  const tacticalLevel = useWeatherInspectStore((s) => s.tacticalLevel);

  const opacity = altitudeOpacity(altitude);
  if (opacity <= 0) return null;

  const stroke =
    tacticalLevel === 'surface'
      ? 'rgba(34, 211, 238, 0.95)'
      : 'rgba(34, 211, 238, 0.55)';

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 25,
      }}
      aria-hidden="true"
    >
      <svg
        width="80"
        height="80"
        viewBox="0 0 80 80"
        style={{
          opacity,
          transition: 'opacity 0.35s ease-out',
          filter: 'drop-shadow(0 0 6px rgba(34, 211, 238, 0.55))',
        }}
      >
        <defs>
          <filter id="reticle-chroma" x="-20%" y="-20%" width="140%" height="140%">
            <feOffset in="SourceGraphic" dx="0.7" dy="0" result="r" />
            <feColorMatrix
              in="r"
              type="matrix"
              values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.45 0"
              result="rred"
            />
            <feOffset in="SourceGraphic" dx="-0.7" dy="0" result="b" />
            <feColorMatrix
              in="b"
              type="matrix"
              values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 0.45 0"
              result="bblue"
            />
            <feMerge>
              <feMergeNode in="rred" />
              <feMergeNode in="bblue" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <g filter="url(#reticle-chroma)">
          <circle cx="40" cy="40" r="22" fill="none" stroke={stroke} strokeWidth="1" />
          <circle cx="40" cy="40" r="2" fill={stroke} />
          <line x1="40" y1="2" x2="40" y2="14" stroke={stroke} strokeWidth="1" />
          <line x1="40" y1="66" x2="40" y2="78" stroke={stroke} strokeWidth="1" />
          <line x1="2" y1="40" x2="14" y2="40" stroke={stroke} strokeWidth="1" />
          <line x1="66" y1="40" x2="78" y2="40" stroke={stroke} strokeWidth="1" />
        </g>
      </svg>
    </div>
  );
}

import {
  formatOrbitValue,
  formatSatelliteAltitude,
  formatSatelliteVelocity,
  getSatelliteDisplayName,
  type SatelliteFeedState,
  type SatelliteRecord,
} from '../satellites';

interface SatelliteDetailsPanelProps {
  feed: SatelliteFeedState;
  satellite: SatelliteRecord | null;
  onFocus: (satellite: SatelliteRecord) => void;
  onClose: () => void;
}

export default function SatelliteDetailsPanel({
  feed,
  satellite,
  onFocus,
  onClose,
}: SatelliteDetailsPanelProps) {
  if (!satellite) return null;

  return (
    <aside className="flight-panel absolute top-4 right-4 z-40 w-[clamp(18rem,20vw,22rem)] max-h-[calc(100vh-2rem)] aether-panel rounded-2xl flex flex-col overflow-hidden" aria-label="Selected satellite details">
      <div className="flight-panel__header">
        <div>
          <p className="flight-panel__eyebrow aether-kicker text-[9px] tracking-[0.25em]">Selected Satellite</p>
          <h2 className="flight-panel__title aether-glow-text">
            {getSatelliteDisplayName(satellite)}
          </h2>
        </div>
        <button
          type="button"
          className="flight-panel__close"
          onClick={onClose}
          aria-label="Close satellite details"
        >
          X
        </button>
      </div>

      <div className="flight-panel__controls">
        <button
          type="button"
          className="flight-panel__action flight-panel__action--active aether-control-active"
          onClick={() => onFocus(satellite)}
        >
          Focus Orbit
        </button>
        <div className="flight-panel__row flex justify-between items-center w-full py-1.5 aether-data-row">
          <span className="flight-panel__label aether-kicker text-[9px] tracking-[0.25em]">Path</span>
          <span className="flight-panel__value aether-value aether-glow-text text-[11px] leading-tight">
            +90 min glow arc
          </span>
        </div>
      </div>

      <div className="flight-panel__body flex-1 overflow-y-auto custom-scrollbar p-3">
        <div className="flight-panel__row flex justify-between items-center w-full py-1.5 aether-data-row">
          <span className="flight-panel__label aether-kicker text-[9px] tracking-[0.25em]">NORAD</span>
          <span className="flight-panel__value aether-value aether-glow-text text-[11px] leading-tight">
            {satellite.id_norad}
          </span>
        </div>
        <div className="flight-panel__row flex justify-between items-center w-full py-1.5 aether-data-row">
          <span className="flight-panel__label aether-kicker text-[9px] tracking-[0.25em]">Inclination</span>
          <span className="flight-panel__value aether-value aether-glow-text text-[11px] leading-tight">
            {formatOrbitValue(satellite.inclination_deg, 'deg', 2)}
          </span>
        </div>
        <div className="flight-panel__row flex justify-between items-center w-full py-1.5 aether-data-row">
          <span className="flight-panel__label aether-kicker text-[9px] tracking-[0.25em]">Period</span>
          <span className="flight-panel__value aether-value aether-glow-text text-[11px] leading-tight">
            {formatOrbitValue(satellite.period_minutes, 'min', 1)}
          </span>
        </div>
        <div className="flight-panel__row flex justify-between items-center w-full py-1.5 aether-data-row">
          <span className="flight-panel__label aether-kicker text-[9px] tracking-[0.25em]">Velocity</span>
          <span className="flight-panel__value aether-value aether-glow-text text-[11px] leading-tight">
            {formatSatelliteVelocity(satellite.velocity_kps)}
          </span>
        </div>
        <div className="flight-panel__row flex justify-between items-center w-full py-1.5 aether-data-row">
          <span className="flight-panel__label aether-kicker text-[9px] tracking-[0.25em]">Altitude</span>
          <span className="flight-panel__value aether-value aether-glow-text text-[11px] leading-tight">
            {formatSatelliteAltitude(satellite.altitude_km)}
          </span>
        </div>
        <div className="flight-panel__row flex justify-between items-center w-full py-1.5 aether-data-row">
          <span className="flight-panel__label aether-kicker text-[9px] tracking-[0.25em]">Origin</span>
          <span className="flight-panel__value aether-value aether-glow-text text-[11px] leading-tight">
            {satellite.country_origin?.trim() || 'Unknown'}
          </span>
        </div>
        <div className="flight-panel__row flex justify-between items-center w-full py-1.5 aether-data-row">
          <span className="flight-panel__label aether-kicker text-[9px] tracking-[0.25em]">Feed</span>
          <span className="flight-panel__value aether-value aether-glow-text text-[11px] leading-tight">
            {feed.sourceLabel}
          </span>
        </div>
      </div>
    </aside>
  );
}

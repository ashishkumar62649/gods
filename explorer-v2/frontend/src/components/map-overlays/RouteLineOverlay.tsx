import { useLiveDataStore } from '../../store/liveDataStore';
import { makeAssetTelemetry } from '../../utils/liveData';

export default function RouteLineOverlay() {
  const nowMs = useLiveDataStore((state) => state.nowMs);
  const telemetry = makeAssetTelemetry(nowMs);

  return (
    <svg className="route-line-overlay" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      <path d="M32 24 C42 30, 43 42, 56 45 S69 55, 77 65" />
      <circle cx={32 + telemetry.routeProgress * 0.45} cy={24 + telemetry.routeProgress * 0.34} r="1.6" className="route-live-dot" />
      <circle cx="45" cy="29" r="1.1" />
      <circle cx="56" cy="45" r="1.1" />
      <circle cx="77" cy="65" r="1.1" />
    </svg>
  );
}

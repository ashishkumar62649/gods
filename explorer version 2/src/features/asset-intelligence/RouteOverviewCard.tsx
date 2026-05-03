import IntelligenceCard from '../../components/cards/IntelligenceCard';
import { useLiveDataStore } from '../../store/liveDataStore';
import { makeAssetTelemetry } from '../../utils/liveData';
import { assetMock } from './assetMock';

export default function RouteOverviewCard() {
  const nowMs = useLiveDataStore((state) => state.nowMs);
  const telemetry = makeAssetTelemetry(nowMs);

  return (
    <IntelligenceCard title="Route Overview">
      <div className="route-stops">
        {assetMock.route.map((stop) => (
          <span key={stop.code}>
            <b>{stop.code}</b>
            <small>{stop.city}</small>
          </span>
        ))}
      </div>
      <div className="route-progress"><i style={{ width: `${telemetry.routeProgress}%` }} /></div>
      <p>Route progress {telemetry.routeProgress}% <span>Next waypoint updates from feed</span></p>
    </IntelligenceCard>
  );
}

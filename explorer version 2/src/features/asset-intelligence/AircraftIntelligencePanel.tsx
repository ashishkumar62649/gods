import MiniMetricCard from '../../components/cards/MiniMetricCard';
import RiskScoreRing from '../../components/cards/RiskScoreRing';
import StatusBadge from '../../components/cards/StatusBadge';
import RightIntelligencePanel from '../../components/shell/RightIntelligencePanel';
import { useLiveDataStore } from '../../store/liveDataStore';
import { makeAssetTelemetry } from '../../utils/liveData';
import { assetMock } from './assetMock';
import RouteOverviewCard from './RouteOverviewCard';
import SourceProvenanceCard from './SourceProvenanceCard';
import WeatherAlongRouteCard from './WeatherAlongRouteCard';
import WhatToWatchCard from './WhatToWatchCard';

export default function AircraftIntelligencePanel() {
  const asset = assetMock.selectedAsset;
  const nowMs = useLiveDataStore((state) => state.nowMs);
  const telemetry = makeAssetTelemetry(nowMs);
  const metrics = [
    { label: 'Altitude', value: `${telemetry.altitudeFt.toLocaleString('en-US')} ft` },
    { label: 'Speed', value: `${telemetry.speedKt} kt` },
    { label: 'Heading', value: `${String(telemetry.headingDeg).padStart(3, '0')} deg` },
    { label: 'Registration', value: '08-8194' },
    { label: 'Owner / Operator', value: 'United States Air Force' },
    { label: 'Nearest Airport', value: telemetry.routeProgress > 62 ? 'VECC / CCU' : 'VIDP / DEL' },
    { label: 'Distance', value: `${telemetry.distanceNm} NM` },
  ];

  return (
    <RightIntelligencePanel>
      <div className="god-panel-scroll aircraft-panel">
        <header className="panel-title-row">
          <div>
            <h2>Aircraft Intelligence</h2>
            <strong>{telemetry.callsign}</strong>
            <span>{asset.aircraft}</span>
            <small>Telemetry updated {telemetry.updatedLabel}</small>
          </div>
          <button type="button">Close</button>
        </header>
        <div className="badge-row">
          <StatusBadge tone="active">{asset.status}</StatusBadge>
          {asset.badges.map((badge) => <StatusBadge tone={badge.toLowerCase()} key={badge}>{badge}</StatusBadge>)}
        </div>
        <div className="mini-grid">
          {metrics.map((metric) => <MiniMetricCard key={metric.label} {...metric} />)}
        </div>
        <RouteOverviewCard />
        <WeatherAlongRouteCard />
        <div className="anomaly-card">
          <RiskScoreRing score={telemetry.anomaly} label={telemetry.anomaly > 80 ? 'High' : 'Elevated'} />
          <div className="sparkline" />
          <strong>{telemetry.anomalyTrend}</strong>
        </div>
        <SourceProvenanceCard />
        <WhatToWatchCard />
      </div>
    </RightIntelligencePanel>
  );
}

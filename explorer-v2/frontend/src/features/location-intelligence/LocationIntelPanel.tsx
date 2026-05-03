import ConfidenceBar from '../../components/cards/ConfidenceBar';
import IntelligenceCard from '../../components/cards/IntelligenceCard';
import RiskScoreRing from '../../components/cards/RiskScoreRing';
import RightIntelligencePanel from '../../components/shell/RightIntelligencePanel';
import { useLiveDataStore } from '../../store/liveDataStore';
import { makeLocationSnapshot } from '../../utils/liveData';
import CurrentWeatherCard from './CurrentWeatherCard';
import LatestEventsCard from './LatestEventsCard';
import { locationMock } from './locationMock';
import NearbyEntitiesCard from './NearbyEntitiesCard';
import NearbyFlightsCard from './NearbyFlightsCard';
import NearbyHazardsCard from './NearbyHazardsCard';
import PopulationExposureCard from './PopulationExposureCard';

export default function LocationIntelPanel() {
  const nowMs = useLiveDataStore((state) => state.nowMs);
  const selectedLocationName = useLiveDataStore((state) => state.selectedLocationName);
  const selectedLocationLat = useLiveDataStore((state) => state.selectedLocationLat);
  const selectedLocationLon = useLiveDataStore((state) => state.selectedLocationLon);
  const selectedLocationElevationM = useLiveDataStore((state) => state.selectedLocationElevationM);
  const snapshot = makeLocationSnapshot(nowMs, {
    name: selectedLocationName,
    lat: selectedLocationLat,
    lon: selectedLocationLon,
    elevationM: selectedLocationElevationM,
  });

  return (
    <RightIntelligencePanel>
      <div className="god-panel-scroll location-panel">
        <header className="panel-title-row">
          <div>
            <h2>Location Intelligence</h2>
            <strong>{snapshot.location.name}</strong>
            <span>{snapshot.location.coordinates} | {snapshot.location.elevation}</span>
            <small>Updated {snapshot.updatedLabel}</small>
          </div>
          <button type="button">Share</button>
        </header>
        <div className="location-grid">
          <CurrentWeatherCard snapshot={snapshot} />
          <NearbyFlightsCard count={snapshot.nearbyFlights} />
          <IntelligenceCard title="Nearby Airports / Ports">
            <ul className="entity-list">
              <li>CCU Netaji Subhas Chandra Bose Intl 15 km</li>
              <li>IXB Bagdogra Airport 167 km</li>
              <li>HDC Haldia Port 122 km</li>
              <li>KDS Kakdwip Port 78 km</li>
            </ul>
            <ConfidenceBar value={90} />
          </IntelligenceCard>
          <NearbyHazardsCard count={snapshot.fires} />
          <IntelligenceCard title="Nearby Earthquakes">
            <strong className="big-number">{snapshot.earthquakes}</strong>
            <span>{snapshot.earthquakes > 0 ? 'Latest tremor signal inside monitoring radius' : 'No recent seismic signals in radius'}</span>
            <ConfidenceBar value={snapshot.confidence - 3} />
          </IntelligenceCard>
          <PopulationExposureCard populationM={snapshot.populationM} confidence={snapshot.confidence} />
          <LatestEventsCard />
          <IntelligenceCard title="Risk Score">
            <RiskScoreRing score={snapshot.risk} label={snapshot.riskLabel} confidence={snapshot.confidence} />
            <dl className="compact-dl">
              <dt>Weather</dt><dd>{Math.min(98, snapshot.weather.humidity)}%</dd>
              <dt>Flooding</dt><dd>{Math.min(95, snapshot.risk + 4)}%</dd>
              <dt>Air Traffic</dt><dd>{Math.min(90, snapshot.nearbyFlights * 3)}%</dd>
              <dt>Seismic</dt><dd>{Math.min(80, snapshot.earthquakes * 18)}%</dd>
              <dt>Fire</dt><dd>{Math.min(92, snapshot.fires * 8)}%</dd>
            </dl>
          </IntelligenceCard>
          <NearbyEntitiesCard />
        </div>
        <div className="sources-row">
          {locationMock.sources.map((source) => <span key={source}>{source}</span>)}
        </div>
      </div>
    </RightIntelligencePanel>
  );
}

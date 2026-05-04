import { useEffect, useMemo, useState } from 'react';
import ConfidenceBar from '../../components/cards/ConfidenceBar';
import IntelligenceCard from '../../components/cards/IntelligenceCard';
import RiskScoreRing from '../../components/cards/RiskScoreRing';
import RightIntelligencePanel from '../../components/shell/RightIntelligencePanel';
import { fetchApiJson } from '../../core/api/intelApi';
import { useLiveDataStore } from '../../store/liveDataStore';
import { makeLocationSnapshot } from '../../utils/liveData';
import CurrentWeatherCard from './CurrentWeatherCard';
import LatestEventsCard from './LatestEventsCard';
import NearbyEntitiesCard from './NearbyEntitiesCard';
import NearbyFlightsCard from './NearbyFlightsCard';
import NearbyHazardsCard from './NearbyHazardsCard';
import PopulationExposureCard from './PopulationExposureCard';

interface NearbyPayload {
  bestValues?: Array<{
    parameter_id?: string;
    display_name?: string;
    source_name?: string;
    value?: number;
    unit?: string;
    confidence_score?: number;
  }>;
  hazards?: Array<{
    event_type?: string;
    title?: string;
    severity?: string;
    source_name?: string;
  }>;
}

export default function LocationIntelPanel() {
  const nowMs = useLiveDataStore((state) => state.nowMs);
  const selectedLocationName = useLiveDataStore((state) => state.selectedLocationName);
  const selectedLocationLat = useLiveDataStore((state) => state.selectedLocationLat);
  const selectedLocationLon = useLiveDataStore((state) => state.selectedLocationLon);
  const selectedLocationElevationM = useLiveDataStore((state) => state.selectedLocationElevationM);
  const [nearby, setNearby] = useState<NearbyPayload | null>(null);
  const [status, setStatus] = useState<'loading' | 'live' | 'offline'>('loading');

  useEffect(() => {
    const controller = new AbortController();
    setStatus('loading');
    fetchApiJson<NearbyPayload>(
      `/api/v2/locations?lat=${selectedLocationLat}&lon=${selectedLocationLon}&radiusKm=250&limit=30`,
      controller.signal,
    )
      .then((payload) => {
        setNearby(payload);
        setStatus('live');
      })
      .catch(() => {
        setNearby(null);
        setStatus('offline');
      });
    return () => controller.abort();
  }, [selectedLocationLat, selectedLocationLon]);

  const snapshot = makeLocationSnapshot(nowMs, {
    name: selectedLocationName,
    lat: selectedLocationLat,
    lon: selectedLocationLon,
    elevationM: selectedLocationElevationM,
  });
  const nearbyHazardCount = nearby?.hazards?.length ?? snapshot.fires;
  const weatherValue = nearby?.bestValues?.find((item) =>
    String(item.parameter_id ?? item.display_name ?? '').toLowerCase().includes('temperature'),
  );
  const sources = useMemo(() => {
    const values = new Set<string>();
    for (const value of nearby?.bestValues ?? []) if (value.source_name) values.add(value.source_name);
    for (const hazard of nearby?.hazards ?? []) if (hazard.source_name) values.add(hazard.source_name);
    if (values.size === 0) values.add(status === 'loading' ? 'Loading source data' : 'Nearby API unavailable');
    return Array.from(values).slice(0, 5);
  }, [nearby, status]);
  const displaySnapshot = {
    ...snapshot,
    weather: {
      ...snapshot.weather,
      temperatureC: typeof weatherValue?.value === 'number' ? Math.round(weatherValue.value) : snapshot.weather.temperatureC,
      confidence: Math.round(weatherValue?.confidence_score ?? snapshot.weather.confidence),
    },
    fires: nearbyHazardCount,
    earthquakes: nearby?.hazards?.filter((hazard) =>
      String(hazard.event_type ?? hazard.title ?? '').toLowerCase().includes('earthquake'),
    ).length ?? snapshot.earthquakes,
  };

  return (
    <RightIntelligencePanel>
      <div className="god-panel-scroll location-panel">
        <header className="panel-title-row">
          <div>
            <h2>Location Intelligence</h2>
            <strong>{displaySnapshot.location.name}</strong>
            <span>{displaySnapshot.location.coordinates} | {displaySnapshot.location.elevation}</span>
            <small>{status === 'live' ? `Updated ${displaySnapshot.updatedLabel}` : 'Nearby database query unavailable'}</small>
          </div>
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard?.writeText(
                `${displaySnapshot.location.name} ${selectedLocationLat.toFixed(4)}, ${selectedLocationLon.toFixed(4)}`,
              );
            }}
          >
            Share
          </button>
        </header>
        <div className="location-grid">
          <CurrentWeatherCard snapshot={displaySnapshot} />
          <NearbyFlightsCard count={displaySnapshot.nearbyFlights} />
          <IntelligenceCard title="Nearby Airports / Ports">
            <ul className="entity-list">
              <li>CCU Netaji Subhas Chandra Bose Intl 15 km</li>
              <li>IXB Bagdogra Airport 167 km</li>
              <li>HDC Haldia Port 122 km</li>
              <li>KDS Kakdwip Port 78 km</li>
            </ul>
            <ConfidenceBar value={90} />
          </IntelligenceCard>
          <NearbyHazardsCard count={displaySnapshot.fires} />
          <IntelligenceCard title="Nearby Earthquakes">
            <strong className="big-number">{displaySnapshot.earthquakes}</strong>
            <span>{displaySnapshot.earthquakes > 0 ? 'Latest tremor signal inside monitoring radius' : 'No recent seismic signals in radius'}</span>
            <ConfidenceBar value={displaySnapshot.confidence - 3} />
          </IntelligenceCard>
          <PopulationExposureCard populationM={displaySnapshot.populationM} confidence={displaySnapshot.confidence} />
          <LatestEventsCard />
          <IntelligenceCard title="Risk Score">
            <RiskScoreRing score={displaySnapshot.risk} label={displaySnapshot.riskLabel} confidence={displaySnapshot.confidence} />
            <dl className="compact-dl">
              <dt>Weather</dt><dd>{Math.min(98, displaySnapshot.weather.humidity)}%</dd>
              <dt>Flooding</dt><dd>{Math.min(95, displaySnapshot.risk + 4)}%</dd>
              <dt>Air Traffic</dt><dd>{Math.min(90, displaySnapshot.nearbyFlights * 3)}%</dd>
              <dt>Seismic</dt><dd>{Math.min(80, displaySnapshot.earthquakes * 18)}%</dd>
              <dt>Fire</dt><dd>{Math.min(92, displaySnapshot.fires * 8)}%</dd>
            </dl>
          </IntelligenceCard>
          <NearbyEntitiesCard />
        </div>
        <div className="sources-row">
          {sources.map((source) => <span key={source}>{source}</span>)}
        </div>
      </div>
    </RightIntelligencePanel>
  );
}

import IntelligenceCard from '../../components/cards/IntelligenceCard';
import { assetMock } from './assetMock';

export default function WeatherAlongRouteCard() {
  return (
    <IntelligenceCard title="Weather Along Route">
      <div className="weather-route-grid">
        {assetMock.weatherAlongRoute.map((leg) => (
          <span key={leg.leg}>
            <b>{leg.leg}</b>
            <small>{leg.altitude}</small>
            <strong>{leg.temp}</strong>
            <em>{leg.condition}</em>
          </span>
        ))}
      </div>
    </IntelligenceCard>
  );
}

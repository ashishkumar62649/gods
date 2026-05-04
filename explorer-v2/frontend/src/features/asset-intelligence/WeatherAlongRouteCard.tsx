import IntelligenceCard from '../../components/cards/IntelligenceCard';

interface WeatherLeg {
  leg: string;
  altitude: string;
  temp: string;
  condition: string;
}

export default function WeatherAlongRouteCard({ legs }: { legs: WeatherLeg[] }) {
  return (
    <IntelligenceCard title="Weather Along Route">
      <div className="weather-route-grid">
        {legs.map((leg) => (
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

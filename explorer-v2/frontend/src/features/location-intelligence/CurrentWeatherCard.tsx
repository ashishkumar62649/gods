import ConfidenceBar from '../../components/cards/ConfidenceBar';
import IntelligenceCard from '../../components/cards/IntelligenceCard';
import type { makeLocationSnapshot } from '../../utils/liveData';

interface CurrentWeatherCardProps {
  snapshot: ReturnType<typeof makeLocationSnapshot>;
}

export default function CurrentWeatherCard({ snapshot }: CurrentWeatherCardProps) {
  const wx = snapshot.weather;

  return (
    <IntelligenceCard title="Current Weather">
      <div className="weather-now">
        <strong>{wx.temperatureC} C</strong>
        <span>Feels like {wx.feelsLikeC} C</span>
        <b>{wx.condition}</b>
      </div>
      <dl className="compact-dl">
        <dt>Wind</dt><dd>{wx.wind}</dd>
        <dt>Humidity</dt><dd>{wx.humidity}%</dd>
        <dt>Pressure</dt><dd>{wx.pressureHpa} hPa</dd>
        <dt>Visibility</dt><dd>{wx.visibilityKm} km</dd>
      </dl>
      <ConfidenceBar value={wx.confidence} />
    </IntelligenceCard>
  );
}

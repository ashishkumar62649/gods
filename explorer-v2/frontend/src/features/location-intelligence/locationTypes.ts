import type { WeatherSnapshot } from '../../data/contracts/weatherContracts';

export interface LocationIntelligenceData {
  location: { name: string; coordinates: string; elevation: string };
  weather: WeatherSnapshot;
  cards: Array<{ title: string; value: string; detail: string; confidence: number }>;
  risk: { score: number; label: string; factors: Array<{ label: string; value: number }>; confidence: number };
  sources: string[];
}

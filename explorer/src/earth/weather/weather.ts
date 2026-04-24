export type ClimateSource = 'OWM' | 'FALLBACK';
export type WeatherFeedStatus = 'idle' | 'loading' | 'live' | 'error';
export type WeatherLayerId =
  | 'precipitation'
  | 'temperature'
  | 'clouds'
  | 'wind'
  | 'pressure';

export interface ClimateStateSnapshot {
  timestamp: string;
  activeSource: ClimateSource;
  precipitationUrl: string;
  temperatureUrl: string;
  cloudsUrl: string;
  windUrl: string;
  pressureUrl: string;
}

export interface ClimateFeedState {
  status: WeatherFeedStatus;
  sourceLabel: string;
  message: string;
  fetchedAt: string | null;
  activeSource: ClimateSource | null;
}

export type WeatherToggleState = Record<WeatherLayerId, boolean>;

export const INITIAL_WEATHER_TOGGLES: WeatherToggleState = {
  precipitation: false,
  temperature: false,
  clouds: false,
  wind: false,
  pressure: false,
};

export const WEATHER_LAYER_LABELS: Record<WeatherLayerId, string> = {
  precipitation: 'Precipitation',
  temperature: 'Global Temperature',
  clouds: 'Cloud Cover',
  wind: 'Wind Speed',
  pressure: 'Atmospheric Pressure',
};

export const WEATHER_API_BASE = import.meta.env.VITE_FLIGHT_API_BASE?.trim() ?? '';
export const WEATHER_STATE_API_URL = `${WEATHER_API_BASE}/api/climate/state`;
export const WEATHER_STATE_POLL_INTERVAL_MS = 60_000;
export const WEATHER_NATIVE_PREFIX = 'cesium-native://';

export async function fetchClimateState(
  signal?: AbortSignal,
): Promise<ClimateStateSnapshot> {
  const response = await fetch(WEATHER_STATE_API_URL, { signal });
  if (!response.ok) {
    throw new Error(`Climate feed returned ${response.status}`);
  }

  return (await response.json()) as ClimateStateSnapshot;
}

export function isWeatherLayerEnabled(toggles: WeatherToggleState) {
  return Object.values(toggles).some(Boolean);
}

export function getClimateSourceLabel(source: ClimateSource | null) {
  return source === 'OWM'
    ? 'OWM'
    : source === 'FALLBACK'
      ? 'Fallback Network'
      : 'Offline';
}

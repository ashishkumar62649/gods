import { INTERVALS } from '../config/constants';
import { API_ROUTES, EXTERNAL_FEEDS } from '../config/endpoints';
import type { ClimateSnapshot } from '../store/useClimateStore';

const OPEN_METEO_FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const OPEN_METEO_AIR_QUALITY_URL = 'https://air-quality-api.open-meteo.com/v1/air-quality';

export interface PointWeatherCurrent {
  time: string;
  temperature_2m: number;
  apparent_temperature: number;
  relative_humidity_2m: number;
  surface_pressure: number;
  wind_speed_10m: number;
  wind_direction_10m: number;
  wind_gusts_10m: number | null;
  cloud_cover: number;
  visibility: number | null;
  weather_code: number;
}

export interface PointWeatherDaily {
  time: string[];
  temperature_2m_max: number[];
  temperature_2m_min: number[];
  weather_code: number[];
  sunrise: string[];
  sunset: string[];
}

export interface PointAirQuality {
  us_aqi: number | null;
  european_aqi: number | null;
  pm10: number | null;
  pm2_5: number | null;
  carbon_monoxide: number | null;
  nitrogen_dioxide: number | null;
  sulphur_dioxide: number | null;
  ozone: number | null;
  uv_index: number | null;
}

export interface PointWeather {
  latitude: number;
  longitude: number;
  current: PointWeatherCurrent;
  daily: PointWeatherDaily;
  airQuality: PointAirQuality | null;
  fetchedAt: number;
}

export async function fetchPointWeather(lat: number, lon: number): Promise<PointWeather> {
  const forecastParams = new URLSearchParams({
    latitude: lat.toFixed(4),
    longitude: lon.toFixed(4),
    current: [
      'temperature_2m',
      'apparent_temperature',
      'relative_humidity_2m',
      'surface_pressure',
      'wind_speed_10m',
      'wind_direction_10m',
      'wind_gusts_10m',
      'cloud_cover',
      'visibility',
      'weather_code',
    ].join(','),
    daily: [
      'temperature_2m_max',
      'temperature_2m_min',
      'weather_code',
      'sunrise',
      'sunset',
    ].join(','),
    forecast_days: '5',
    timezone: 'auto',
  });

  const aqParams = new URLSearchParams({
    latitude: lat.toFixed(4),
    longitude: lon.toFixed(4),
    current: [
      'us_aqi',
      'european_aqi',
      'pm10',
      'pm2_5',
      'carbon_monoxide',
      'nitrogen_dioxide',
      'sulphur_dioxide',
      'ozone',
      'uv_index',
    ].join(','),
  });

  const [forecastResponse, aqResponse] = await Promise.all([
    fetch(`${OPEN_METEO_FORECAST_URL}?${forecastParams.toString()}`),
    fetch(`${OPEN_METEO_AIR_QUALITY_URL}?${aqParams.toString()}`),
  ]);

  if (!forecastResponse.ok) {
    throw new Error(`Open-Meteo forecast returned ${forecastResponse.status}`);
  }

  const forecast = await forecastResponse.json();
  const airQuality = aqResponse.ok ? (await aqResponse.json()).current ?? null : null;

  return {
    latitude: lat,
    longitude: lon,
    current: forecast.current,
    daily: forecast.daily,
    airQuality,
    fetchedAt: Date.now(),
  };
}

interface RainViewerFrame {
  time?: number;
}

interface RainViewerResponse {
  generated?: number;
  radar?: {
    nowcast?: RainViewerFrame[];
    past?: RainViewerFrame[];
  };
}

interface ClimateStateSnapshot {
  timestamp: string;
  activeSource: 'OWM' | 'FALLBACK';
  precipitationUrl: string;
  temperatureUrl: string;
  cloudsUrl: string;
  windUrl: string;
  pressureUrl: string;
}

function isRealTileUrl(url: string | null | undefined): url is string {
  return typeof url === 'string' && url.startsWith('http');
}

export async function fetchClimateSnapshot(): Promise<ClimateSnapshot> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(
    () => controller.abort(),
    INTERVALS.WEATHER_SYNC_MS / 2,
  );

  try {
    const response = await fetch(API_ROUTES.LOCAL_CLIMATE_STATE, {
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Climate SSOT returned ${response.status}`);
    }

    const snapshot = (await response.json()) as ClimateStateSnapshot;
    const parsedTimestamp = Date.parse(snapshot.timestamp);

    return {
      source: snapshot.activeSource,
      timestamp: Number.isFinite(parsedTimestamp)
        ? Math.floor(parsedTimestamp / 1000)
        : Math.floor(Date.now() / 1000),
      urls: {
        precipitation: isRealTileUrl(snapshot.precipitationUrl) ? snapshot.precipitationUrl : null,
        temperature: isRealTileUrl(snapshot.temperatureUrl) ? snapshot.temperatureUrl : null,
        clouds: isRealTileUrl(snapshot.cloudsUrl) ? snapshot.cloudsUrl : null,
        wind: isRealTileUrl(snapshot.windUrl) ? snapshot.windUrl : null,
        pressure: isRealTileUrl(snapshot.pressureUrl) ? snapshot.pressureUrl : null,
      },
    };
  } catch {
    const fallbackResponse = await fetch(EXTERNAL_FEEDS.RAINVIEWER_TIME);
    if (!fallbackResponse.ok) {
      throw new Error(`RainViewer fallback returned ${fallbackResponse.status}`);
    }

    const fallbackPayload = (await fallbackResponse.json()) as RainViewerResponse;
    const frames = [
      ...(fallbackPayload.radar?.nowcast ?? []),
      ...(fallbackPayload.radar?.past ?? []),
    ];
    const parsedTimestamp =
      frames
        .map((frame) => frame.time)
        .filter((time): time is number => Number.isFinite(time))
        .at(-1) ??
      (Number.isFinite(fallbackPayload.generated)
        ? fallbackPayload.generated
        : Math.floor(Date.now() / 1000));

    const rainviewerUrl = EXTERNAL_FEEDS.RAINVIEWER_TILE_TEMPLATE.replace(
      '{timestamp}',
      String(parsedTimestamp),
    );

    return {
      source: 'FALLBACK',
      timestamp: parsedTimestamp ?? Math.floor(Date.now() / 1000),
      urls: {
        precipitation: rainviewerUrl,
        temperature: null,
        clouds: null,
        wind: null,
        pressure: null,
      },
    };
  } finally {
    window.clearTimeout(timeoutId);
  }
}

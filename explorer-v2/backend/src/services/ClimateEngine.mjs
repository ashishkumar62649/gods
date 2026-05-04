import { FETCH_TIMEOUT_MS, OWM_API_KEY } from '../config/constants.mjs';
import {
  readLatestClimateState,
  writeLatestClimateState,
} from '../domain/models/ClimateState.mjs';

export const CLIMATE_REFRESH_INTERVAL_MS = 10 * 60 * 1000;
export const CLIMATE_NATIVE_URLS = {
  temperature: 'cesium-native://temperature',
  clouds: 'cesium-native://clouds',
  wind: 'cesium-native://wind',
  pressure: 'cesium-native://pressure',
};

const OWM_TILE_BASE_URL = 'https://tile.openweathermap.org/map';
const OWM_SAMPLE_LAYER = 'clouds_new';
const OWM_LAYER_IDS = {
  precipitation: 'precipitation_new',
  temperature: 'temp_new',
  clouds: 'clouds_new',
  wind: 'wind_new',
  pressure: 'pressure_new',
};
const RAINVIEWER_INDEX_URL = 'https://api.rainviewer.com/public/weather-maps.json';

let refreshTimer = null;
let refreshInFlight = null;
let lastRefreshAt = null;

export function getClimateEngineStats() {
  const latest = readLatestClimateState();
  return {
    lastRefreshAt,
    activeSource: latest?.activeSource ?? 'UNINITIALIZED',
    timestamp: latest?.timestamp ?? null,
  };
}

export function getLatestClimateState() {
  return readLatestClimateState();
}

export function startClimateRefreshLoop() {
  if (refreshTimer) {
    return refreshTimer;
  }

  void refreshClimateState().catch((error) => {
    console.error('[Climate] Initial refresh failed:', error);
  });

  refreshTimer = setInterval(() => {
    void refreshClimateState().catch((error) => {
      console.error('[Climate] Scheduled refresh failed:', error);
    });
  }, CLIMATE_REFRESH_INTERVAL_MS);

  return refreshTimer;
}

export async function refreshClimateState() {
  if (refreshInFlight) {
    return refreshInFlight;
  }

  refreshInFlight = (async () => {
    try {
      const nextState = await resolveWinningClimateState();
      writeLatestClimateState(nextState);
      lastRefreshAt = nextState.timestamp;
      return nextState;
    } catch (error) {
      const previousState = readLatestClimateState();
      if (previousState) {
        console.error('[Climate] Refresh failed; keeping previous SSOT:', error);
        return previousState;
      }

      throw error;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

async function resolveWinningClimateState() {
  try {
    await validateOwmAccess();
    return buildOwmClimateState();
  } catch (error) {
    if (shouldFallbackToSecondaryNetwork(error)) {
      console.warn('[Climate] OWM unavailable; switching to fallback network.');
      return buildFallbackClimateState();
    }

    throw error;
  }
}

function buildOwmClimateState() {
  const timestamp = new Date().toISOString();
  return {
    timestamp,
    activeSource: 'OWM',
    precipitationUrl: buildOwmTileUrl(OWM_LAYER_IDS.precipitation),
    temperatureUrl: buildOwmTileUrl(OWM_LAYER_IDS.temperature),
    cloudsUrl: buildOwmTileUrl(OWM_LAYER_IDS.clouds),
    windUrl: buildOwmTileUrl(OWM_LAYER_IDS.wind),
    pressureUrl: buildOwmTileUrl(OWM_LAYER_IDS.pressure),
  };
}

async function buildFallbackClimateState() {
  const rainViewerIndex = await fetchJsonWithTimeout(RAINVIEWER_INDEX_URL);
  const radarFrames = [
    ...(Array.isArray(rainViewerIndex?.radar?.nowcast)
      ? rainViewerIndex.radar.nowcast
      : []),
    ...(Array.isArray(rainViewerIndex?.radar?.past)
      ? rainViewerIndex.radar.past
      : []),
  ];
  const latestRadarFrame = radarFrames.at(-1);
  if (!rainViewerIndex?.host || !latestRadarFrame?.path) {
    throw new Error('Fallback precipitation feed did not provide a radar tile path.');
  }

  return {
    timestamp: new Date().toISOString(),
    activeSource: 'FALLBACK',
    precipitationUrl:
      `${rainViewerIndex.host}${latestRadarFrame.path}/256/{z}/{x}/{y}/2/1_1.png`,
    temperatureUrl: CLIMATE_NATIVE_URLS.temperature,
    cloudsUrl: CLIMATE_NATIVE_URLS.clouds,
    windUrl: CLIMATE_NATIVE_URLS.wind,
    pressureUrl: CLIMATE_NATIVE_URLS.pressure,
  };
}

async function validateOwmAccess() {
  if (!OWM_API_KEY) {
    throw new ClimateSourceError(401, 'OWM API key is missing.');
  }

  const sampleUrl = buildOwmTileUrl(OWM_SAMPLE_LAYER)
    .replace('{z}', '0')
    .replace('{x}', '0')
    .replace('{y}', '0');
  const response = await fetchWithTimeout(sampleUrl);
  if (response.ok) {
    return;
  }

  throw new ClimateSourceError(
    response.status,
    `OWM tile validation failed with status ${response.status}.`,
  );
}

function buildOwmTileUrl(layerId) {
  return `${OWM_TILE_BASE_URL}/${layerId}/{z}/{x}/{y}.png?appid=${OWM_API_KEY}`;
}

function shouldFallbackToSecondaryNetwork(error) {
  if (!(error instanceof ClimateSourceError)) {
    return false;
  }

  return [401, 429, 500].includes(error.status) || error.status === 0;
}

async function fetchJsonWithTimeout(url) {
  const response = await fetchWithTimeout(url);
  if (!response.ok) {
    throw new Error(`Climate fetch failed with status ${response.status} for ${url}`);
  }

  return response.json();
}

async function fetchWithTimeout(url) {
  const signal = AbortSignal.timeout(FETCH_TIMEOUT_MS);
  return fetch(url, { signal });
}

class ClimateSourceError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'ClimateSourceError';
    this.status = status;
  }
}

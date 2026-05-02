import {
  parseLimit,
  queryActiveHazards,
  queryBestCurrentValues,
  queryCurrentWeather,
  queryIntelSummary,
  queryLatestAirQuality,
  queryLatestHydrology,
  queryNearbyIntel,
  querySourceHealth,
} from '../services/weatherIntelDb.mjs';

function meta(count, url) {
  return {
    count,
    timestamp: Date.now(),
    query: Object.fromEntries(url.searchParams.entries()),
  };
}

function optionsFromUrl(url) {
  return {
    limit: parseLimit(url.searchParams.get('limit')),
    parameter: url.searchParams.get('parameter') || null,
    source: url.searchParams.get('source') || null,
    eventType: url.searchParams.get('eventType') || null,
    latitude: url.searchParams.get('lat') || url.searchParams.get('latitude') || null,
    longitude: url.searchParams.get('lon') || url.searchParams.get('longitude') || null,
    radiusKm: url.searchParams.get('radiusKm') || null,
    activeOnly: url.searchParams.get('activeOnly') !== 'false',
  };
}

async function sendIntel(res, sendJson, url, key, loader) {
  try {
    const rows = await loader();
    sendJson(res, 200, {
      [key]: rows,
      meta: meta(rows.length, url),
    });
  } catch (error) {
    console.error(`[WeatherIntel] ${url.pathname} failed:`, error);
    sendJson(res, 503, {
      error: 'Weather intelligence database query failed.',
      detail: error instanceof Error ? error.message : String(error),
      meta: meta(0, url),
    });
  }
}

export async function handleWeatherIntelRoute(req, res, sendJson, url) {
  if (req.method !== 'GET') return false;
  if (!url.pathname.startsWith('/api/intel/')) return false;

  const options = optionsFromUrl(url);

  if (url.pathname === '/api/intel/weather/current') {
    await sendIntel(res, sendJson, url, 'weather', () => queryCurrentWeather(options));
    return true;
  }

  if (url.pathname === '/api/intel/best-current') {
    await sendIntel(res, sendJson, url, 'values', () => queryBestCurrentValues(options));
    return true;
  }

  if (url.pathname === '/api/intel/hazards/active') {
    await sendIntel(res, sendJson, url, 'hazards', () => queryActiveHazards(options));
    return true;
  }

  if (url.pathname === '/api/intel/air-quality/latest') {
    await sendIntel(res, sendJson, url, 'airQuality', () => queryLatestAirQuality(options));
    return true;
  }

  if (url.pathname === '/api/intel/hydrology/latest') {
    await sendIntel(res, sendJson, url, 'hydrology', () => queryLatestHydrology(options));
    return true;
  }

  if (url.pathname === '/api/intel/source-health') {
    await sendIntel(res, sendJson, url, 'sources', () => querySourceHealth(options));
    return true;
  }

  if (url.pathname === '/api/intel/nearby') {
    try {
      const payload = await queryNearbyIntel(options);
      sendJson(res, 200, {
        ...payload,
        meta: meta(payload.bestValues.length + payload.hazards.length, url),
      });
    } catch (error) {
      console.error('[WeatherIntel] nearby failed:', error);
      sendJson(res, 400, {
        error: 'Nearby weather intelligence query failed.',
        detail: error instanceof Error ? error.message : String(error),
        meta: meta(0, url),
      });
    }
    return true;
  }

  if (url.pathname === '/api/intel/summary') {
    try {
      sendJson(res, 200, await queryIntelSummary());
    } catch (error) {
      console.error('[WeatherIntel] summary failed:', error);
      sendJson(res, 503, {
        error: 'Weather intelligence summary failed.',
        detail: error instanceof Error ? error.message : String(error),
      });
    }
    return true;
  }

  return false;
}

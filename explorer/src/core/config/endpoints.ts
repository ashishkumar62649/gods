interface CoreImportMetaEnv {
  readonly VITE_MAPTILER_API_KEY?: string;
  readonly VITE_MAPTILER_STYLE_ID?: string;
  readonly VITE_FLIGHT_API_BASE?: string;
}

const env = import.meta.env as CoreImportMetaEnv;

function readEnv(key: keyof CoreImportMetaEnv): string | undefined {
  const value = env[key];
  return typeof value === 'string' && value.trim().length > 0
    ? value.trim()
    : undefined;
}

export const ENVIRONMENT = {
  MAPTILER_API_KEY: readEnv('VITE_MAPTILER_API_KEY'),
  MAPTILER_STYLE_ID: readEnv('VITE_MAPTILER_STYLE_ID'),
  API_BASE: readEnv('VITE_FLIGHT_API_BASE') ?? '',
} as const;

export const API_ROUTES = {
  LOCAL_CLIMATE_STATE: '/api/climate/state',
  LOCAL_AIRPORTS: '/api/airports',
  LOCAL_FLIGHTS: '/api/flights',
  LOCAL_INFRASTRUCTURE: '/api/infrastructure',
  LOCAL_MARITIME: '/api/maritime',
  LOCAL_SATELLITES: '/api/satellites',
  LOCAL_TELEMETRY: '/api/telemetry',
} as const;

export const EXTERNAL_FEEDS = {
  RAINVIEWER_TIME: 'https://api.rainviewer.com/public/weather-maps.json',
  RAINVIEWER_TILE_TEMPLATE:
    'https://tilecache.rainviewer.com/v2/radar/{timestamp}/512/{z}/{x}/{y}/2/1_1.png',
  OPEN_METEO_BASE: 'https://api.open-meteo.com/v1/forecast',
  USGS_EARTHQUAKES:
    'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson',
  NASA_EONET: 'https://eonet.gsfc.nasa.gov/api/v3/events',
} as const;

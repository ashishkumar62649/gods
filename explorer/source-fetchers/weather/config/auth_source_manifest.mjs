import { COMMON_FEED_OPTIONS, NO_AUTH_LIMITS, loadWatchConfig, loadWeatherParameterRows } from "./no_auth_source_manifest.mjs";

export const AUTH_LIMITS = {
  ...NO_AUTH_LIMITS,
  firmsCsv: 10 * 1024 * 1024,
  airQualityJson: 10 * 1024 * 1024,
  modisCatalogJson: 10 * 1024 * 1024,
  clmsMetadataJson: 10 * 1024 * 1024,
};

export const AUTH_SOURCE_ALIASES = {
  nasa_firms: ["NASA FIRMS"],
  openaq: ["OpenAQ"],
  nasa_earthdata_modis: ["NASA MODIS", "MODIS"],
  copernicus_land_clms: ["Copernicus Land", "CLMS"],
};

export const AUTH_SOURCES = {
  nasa_firms: {
    name: "NASA FIRMS",
    docsUrl: "https://firms.modaps.eosdis.nasa.gov/api/",
    category: "fires",
    formats: ["csv", "geojson", "kml", "wms", "mvt"],
    envVars: ["NASA_FIRMS_MAP_KEY"],
    rateRule: "Keyed MAP_KEY API. v1 fetches small area CSV feeds only.",
  },
  openaq: {
    name: "OpenAQ",
    docsUrl: "https://docs.openaq.org/",
    category: "air_quality",
    formats: ["json"],
    envVars: ["OPENAQ_API_KEY"],
    rateRule: "Header API key. v1 fetches latest small parameter samples.",
  },
  nasa_earthdata_modis: {
    name: "NASA Earthdata / MODIS",
    docsUrl: "https://cmr.earthdata.nasa.gov/search/site/docs/search/api",
    category: "satellite_land",
    formats: ["json", "umm-json", "hdf", "hdf5", "geotiff"],
    envVars: ["EARTHDATA_API_KEY", "EARTHDATA_TOKEN"],
    rateRule: "Earthdata bearer token. v1 fetches CMR collection/granule metadata only.",
  },
  copernicus_land_clms: {
    name: "Copernicus Land Monitoring Service",
    docsUrl: "https://land.copernicus.eu/en/faq/download",
    category: "land",
    formats: ["json", "geojson", "geotiff", "netcdf"],
    envVars: ["COPERNICUS_LAND_CREDENTIALS_PATH"],
    rateRule: "Structured CLMS service credential. v1 exchanges token and fetches metadata endpoints only.",
  },
};

export const AUTH_COMMON_FEED_OPTIONS = {
  ...COMMON_FEED_OPTIONS,
  timeoutMs: 20000,
  rateLimitPerMin: 30,
};

export async function getAuthSourceParameterNames(sourceId) {
  const aliases = AUTH_SOURCE_ALIASES[sourceId] || [];
  const rows = await loadWeatherParameterRows();
  return rows
    .filter((row) => aliases.some((alias) => row.sourceText.toLowerCase().includes(alias.toLowerCase())))
    .map((row) => row.parameter);
}

export async function buildAuthSourceManifest() {
  const entries = {};
  for (const [sourceId, source] of Object.entries(AUTH_SOURCES)) {
    entries[sourceId] = {
      id: sourceId,
      ...source,
      parameterNames: await getAuthSourceParameterNames(sourceId),
    };
  }
  return entries;
}

export { loadWatchConfig };

export function authSourceExpected(sourceId, detail) {
  const source = AUTH_SOURCES[sourceId];
  const docs = source ? ` Docs: ${source.docsUrl}` : "";
  return `${detail}${docs}`;
}

import { loadWeatherParameterRows } from "./no_auth_source_manifest.mjs";

export const EXPECTED_WEATHER_PARAMETER_COUNT = 283;

export const COVERAGE_STATUSES = [
  "raw_sample",
  "catalog_only",
  "partial",
  "derived_later",
  "missing_source",
];

export const MISSING_GLOBAL_SOURCE_PARAMETERS = new Set([
  "landslide warning",
  "rockfall risk",
  "flash drought",
  "allergen level",
  "dam level",
  "dam release",
  "avalanche risk",
  "avalanche warning",
  "deforestation",
  "coastline change",
  "road closures",
  "bridge closures",
  "port status",
  "rail disruption",
  "livestock density",
]);

export const DERIVED_LATER_PARAMETERS = new Set([
  "supercell risk",
  "microburst risk",
  "downburst risk",
  "mudslide risk",
  "fire spread direction",
  "fire spread speed",
  "heatwave",
  "cold wave",
  "urban flood risk",
  "slope",
  "aspect",
  "risk score",
  "hazard severity",
  "exposure score",
  "vulnerability score",
  "confidence score",
  "data freshness",
  "source reliability",
]);

export const GLOBAL_SOURCE_IDENTIFIED_CATALOG_PARAMETERS = new Map([
  [
    "deforestation",
    "Global Forest Watch/Hansen-style global forest-change products are identified; add a product fetcher before raw coverage is claimed.",
  ],
  [
    "coastline change",
    "Global satellite/coastal products are identified; add a safe catalog/product fetcher before raw coverage is claimed.",
  ],
  [
    "livestock density",
    "FAO Gridded Livestock of the World is identified; add a catalog/product fetcher before raw coverage is claimed.",
  ],
]);

const CATALOG_ONLY_PATTERNS = [
  /\bERA5\b/i,
  /\bCAMS\b/i,
  /\bEWDS\b/i,
  /\bGloFAS\b/i,
  /\bCopernicus CEMS\b/i,
  /\bCopernicus EMS\b/i,
  /\bCopernicus Drought Observatory\b/i,
  /\bCopernicus Marine\b/i,
  /\b(NASA LIS|GPM|IMERG|NOAA satellite precipitation)\b/i,
  /\b(Global Flood Database|JRC flood hazard maps)\b/i,
  /\b(NASA Black Marble|VIIRS night lights)\b/i,
];

const SOURCE_RULES = [
  {
    pattern: /\bOpen-Meteo\b/i,
    sourceFamily: "global_weather_api",
    fetcherId: "open_meteo",
    rawDataFolder: "open_meteo",
    status: "raw_sample",
    note: "Global Open-Meteo raw forecast/sample data is available.",
  },
  {
    pattern: /\b(NOAA GFS|GFS|NOAA NODD)\b/i,
    sourceFamily: "global_weather_model",
    fetcherId: "noaa_nodd_gfs",
    rawDataFolder: "noaa_nodd_gfs",
    status: "raw_sample",
    note: "Global GFS access is proven through NOAA open-data listings and safe samples.",
  },
  {
    pattern: /\b(NASA GIBS|GIBS)\b/i,
    sourceFamily: "global_satellite_imagery",
    fetcherId: "nasa_gibs",
    rawDataFolder: "nasa_gibs",
    status: "raw_sample",
    note: "Global NASA GIBS WMTS capabilities and tile samples are available.",
  },
  {
    pattern: /\b(NASA FIRMS|FIRMS)\b/i,
    sourceFamily: "global_active_fire",
    fetcherId: "nasa_firms",
    rawDataFolder: "nasa_firms",
    status: "raw_sample",
    note: "Global NASA FIRMS active-fire CSV samples are available when credentials are configured.",
  },
  {
    pattern: /\b(OpenAQ)\b/i,
    sourceFamily: "global_air_quality",
    fetcherId: "openaq",
    rawDataFolder: "openaq",
    status: "raw_sample",
    note: "OpenAQ global air-quality samples are available when credentials are configured.",
  },
  {
    pattern: /\b(GDACS)\b/i,
    sourceFamily: "global_disaster_alerts",
    fetcherId: "gdacs",
    rawDataFolder: "gdacs",
    status: "raw_sample",
    note: "GDACS global disaster alert feeds are available.",
  },
  {
    pattern: /\b(USGS Earthquake API|USGS Earthquake|USGS event details|USGS ShakeMap)\b/i,
    sourceFamily: "global_earthquake",
    fetcherId: "usgs_earthquake",
    rawDataFolder: "usgs_earthquake",
    status: "raw_sample",
    note: "USGS global earthquake feeds and event details are available.",
  },
  {
    pattern: /\b(USGS fault databases|GEM Global Active Faults|USGS hydrologic units|HydroSHEDS|USGS NHD|OSM waterways)\b/i,
    sourceFamily: "global_geophysical_reference",
    fetcherId: "reference_context",
    rawDataFolder: "reference_context",
    status: "raw_sample",
    note: "Global/reference geophysical proof data is available through the reference context fetcher.",
  },
  {
    pattern: /\b(Smithsonian GVP)\b/i,
    sourceFamily: "global_volcano_reference",
    fetcherId: "smithsonian_gvp",
    rawDataFolder: "smithsonian_gvp",
    status: "partial",
    note: "Smithsonian GVP global volcano reference access is partly proven; some endpoints return 403.",
  },
  {
    pattern: /\b(WorldPop)\b/i,
    sourceFamily: "global_population",
    fetcherId: "worldpop",
    rawDataFolder: "worldpop",
    status: "partial",
    note: "WorldPop metadata is proven; large GeoTIFF payloads remain deferred until storage policy is set.",
  },
  {
    pattern: /\b(Copernicus Land|CLMS)\b/i,
    sourceFamily: "global_land_surface",
    fetcherId: "copernicus_land_clms",
    rawDataFolder: "copernicus_land_clms",
    status: "partial",
    note: "Copernicus Land metadata/search access is proven; product download is deferred.",
  },
  {
    pattern: /\b(NASA MODIS|MODIS|Earthdata)\b/i,
    sourceFamily: "global_satellite_land",
    fetcherId: "nasa_earthdata_modis",
    rawDataFolder: "nasa_earthdata_modis",
    status: "partial",
    note: "NASA Earthdata/MODIS catalog and safe sample access are proven; full products are deferred.",
  },
  {
    pattern: /\b(RainViewer)\b/i,
    sourceFamily: "global_radar_tiles",
    fetcherId: "rainviewer",
    rawDataFolder: "rainviewer",
    status: "raw_sample",
    note: "RainViewer global radar map index and tile samples are available.",
  },
  {
    pattern: /\b(NOAA DART|DART|NDBC)\b/i,
    sourceFamily: "global_ocean_tsunami",
    fetcherId: "noaa_dart",
    rawDataFolder: "noaa_dart",
    status: "raw_sample",
    note: "NOAA DART/NDBC buoy feeds provide global ocean/tsunami proof data.",
  },
  {
    pattern: /\b(NHC|JTWC|JMA|IBTrACS)\b/i,
    sourceFamily: "global_cyclone_tracking",
    fetcherId: "noaa_cyclone",
    rawDataFolder: "noaa_cyclone",
    status: "raw_sample",
    note: "Global cyclone proof data is available through NHC/JTWC/GDACS-style feeds.",
  },
  {
    pattern: /\b(NOAA GOES|GOES)\b/i,
    sourceFamily: "satellite_imagery",
    fetcherId: "noaa_goes",
    rawDataFolder: "noaa_goes",
    status: "raw_sample",
    note: "GOES listings and NetCDF byte samples are available; global coverage should prefer global satellite sources when possible.",
  },
  {
    pattern: /\b(NOAA MRMS|MRMS|NEXRAD|radar)\b/i,
    sourceFamily: "radar_products",
    fetcherId: "noaa_radar",
    rawDataFolder: "noaa_radar",
    status: "raw_sample",
    note: "Radar product proof data is available; this is regional fallback coverage where no global radar equivalent exists.",
  },
  {
    pattern: /\b(NOAA SPC|SPC)\b/i,
    sourceFamily: "severe_storm_products",
    fetcherId: "noaa_spc",
    rawDataFolder: "noaa_spc",
    status: "raw_sample",
    note: "SPC severe-weather proof data is available as regional fallback coverage.",
  },
  {
    pattern: /\b(NOAA\/NWS|NWS API|NWS alerts|NWS observations|NWS)\b/i,
    sourceFamily: "weather_alerts",
    fetcherId: "noaa_nws",
    rawDataFolder: "noaa_nws",
    status: "raw_sample",
    note: "NWS proof data is available as regional fallback coverage where global alert feeds are unavailable.",
  },
  {
    pattern: /\b(NOAA NWPS|NWPS|NOAA NWM)\b/i,
    sourceFamily: "hydrology_forecast",
    fetcherId: "noaa_nwps",
    rawDataFolder: "noaa_nwps",
    status: "raw_sample",
    note: "NWPS proof data is available as regional fallback coverage.",
  },
  {
    pattern: /\b(USGS Water)\b/i,
    sourceFamily: "hydrology_observations",
    fetcherId: "usgs_water",
    rawDataFolder: "usgs_water",
    status: "raw_sample",
    note: "USGS Water proof data is available as regional fallback coverage.",
  },
  {
    pattern: /\b(USGS Volcano|USGS Volcano Hazards Program)\b/i,
    sourceFamily: "volcano_alerts",
    fetcherId: "usgs_volcano",
    rawDataFolder: "usgs_volcano",
    status: "raw_sample",
    note: "USGS volcano proof data is available as regional fallback coverage.",
  },
  {
    pattern: /\b(NOAA CO-OPS|CO-OPS|NOAA NDBC|NOAA marine|NDBC)\b/i,
    sourceFamily: "marine_weather",
    fetcherId: "noaa_marine",
    rawDataFolder: "noaa_marine",
    status: "raw_sample",
    note: "NOAA marine proof data is available as regional/ocean fallback coverage.",
  },
  {
    pattern: /\b(NOAA coastal models|tide gauges|storm surge products)\b/i,
    sourceFamily: "coastal_hydrology",
    fetcherId: "noaa_marine",
    rawDataFolder: "noaa_marine",
    status: "raw_sample",
    note: "Coastal/ocean proof data is available through marine and tide-gauge fetches; prefer global products as they are added.",
  },
  {
    pattern: /\b(OpenStreetMap|Overpass|OpenFEMA|SoilGrids|SRTM|FAA|USGS\/National Map|Quaternary Faults)\b/i,
    sourceFamily: "global_reference_context",
    fetcherId: "reference_context",
    rawDataFolder: "reference_context",
    status: "raw_sample",
    note: "Global/reference context proof data is available through the reference context fetcher.",
  },
  {
    pattern: /\b(NOAA NCEI|NCEI|CHIRPS|SPEI|WMO|OISST|Dartmouth Flood Observatory|ISC-GEM|ESA Fire CCI|NOAA STAR VHI|NASA POWER)\b/i,
    sourceFamily: "global_climate_reference",
    fetcherId: "climate_air_reference",
    rawDataFolder: "climate_air_reference",
    status: "raw_sample",
    note: "Climate/air reference proof data is available through global catalog or safe sample fetches.",
  },
];

function includesCatalogOnlySource(sourceText) {
  return CATALOG_ONLY_PATTERNS.some((pattern) => pattern.test(sourceText));
}

function findSourceRule(sourceText) {
  return SOURCE_RULES.find((rule) => rule.pattern.test(sourceText));
}

function buildCoverageEntry(row) {
  const parameterKey = row.parameter.toLowerCase();
  if (DERIVED_LATER_PARAMETERS.has(parameterKey)) {
    return {
      ...row,
      sourceFamily: "derived_analytics",
      fetcherId: null,
      rawDataFolder: null,
      status: "derived_later",
      normalizationNotes: "Derived from normalized raw inputs during normalization/analytics; not a raw-fetch blocker.",
    };
  }

  if (GLOBAL_SOURCE_IDENTIFIED_CATALOG_PARAMETERS.has(parameterKey)) {
    return {
      ...row,
      sourceFamily: "global_source_identified",
      fetcherId: null,
      rawDataFolder: null,
      status: "catalog_only",
      normalizationNotes: GLOBAL_SOURCE_IDENTIFIED_CATALOG_PARAMETERS.get(parameterKey),
    };
  }

  if (MISSING_GLOBAL_SOURCE_PARAMETERS.has(parameterKey)) {
    return {
      ...row,
      sourceFamily: "needs_global_open_source",
      fetcherId: null,
      rawDataFolder: null,
      status: "missing_source",
      normalizationNotes: "Needs a global/free source decision or global fetcher before normalization coverage can be claimed.",
    };
  }

  const sourceRule = findSourceRule(row.sourceText);
  if (sourceRule) {
    return {
      ...row,
      sourceFamily: sourceRule.sourceFamily,
      fetcherId: sourceRule.fetcherId,
      rawDataFolder: `explorer/data_raw/weather/${sourceRule.rawDataFolder}`,
      status: sourceRule.status,
      normalizationNotes: sourceRule.note,
    };
  }

  if (includesCatalogOnlySource(row.sourceText)) {
    return {
      ...row,
      sourceFamily: "global_catalog_or_job_source",
      fetcherId: null,
      rawDataFolder: null,
      status: "catalog_only",
      normalizationNotes: "Global catalog/process proof is accepted for raw-fetch v1; async jobs/downloads are deferred.",
    };
  }

  return {
    ...row,
    sourceFamily: "needs_global_open_source",
    fetcherId: null,
    rawDataFolder: null,
    status: "missing_source",
    normalizationNotes: "No implemented global/open raw-fetch proof is mapped yet.",
  };
}

export async function buildWeatherParameterCoverage() {
  const rows = await loadWeatherParameterRows();
  return rows.map(buildCoverageEntry);
}

export function summarizeWeatherParameterCoverage(entries) {
  const counts = Object.fromEntries(COVERAGE_STATUSES.map((status) => [status, 0]));
  for (const entry of entries) {
    counts[entry.status] = (counts[entry.status] ?? 0) + 1;
  }
  return {
    total: entries.length,
    counts,
  };
}

export function validateWeatherParameterCoverage(entries) {
  const parameters = entries.map((entry) => entry.parameter);
  const parameterSet = new Set(parameters);
  const duplicateParameters = parameters.filter((parameter, index) => parameters.indexOf(parameter) !== index);
  const invalidStatuses = entries
    .filter((entry) => !COVERAGE_STATUSES.includes(entry.status))
    .map((entry) => ({ parameter: entry.parameter, status: entry.status }));

  return {
    expectedTotal: EXPECTED_WEATHER_PARAMETER_COUNT,
    actualTotal: entries.length,
    hasExpectedTotal: entries.length === EXPECTED_WEATHER_PARAMETER_COUNT,
    uniqueTotal: parameterSet.size,
    hasNoDuplicates: duplicateParameters.length === 0,
    duplicateParameters: [...new Set(duplicateParameters)],
    hasValidStatuses: invalidStatuses.length === 0,
    invalidStatuses,
    summary: summarizeWeatherParameterCoverage(entries),
  };
}

export const WEATHER_PARAMETER_COVERAGE = await buildWeatherParameterCoverage();
export const WEATHER_PARAMETER_COVERAGE_VALIDATION = validateWeatherParameterCoverage(WEATHER_PARAMETER_COVERAGE);
export const WEATHER_PARAMETER_COVERAGE_SUMMARY = WEATHER_PARAMETER_COVERAGE_VALIDATION.summary;

import { access, readFile } from "node:fs/promises";
import { join } from "node:path";
import { EXPLORER_ROOT } from "../common_functions/index.mjs";

export const WEATHER_TXT_PATH = join(EXPLORER_ROOT, "..", "weather.txt");
export const WEATHER_TXT_FALLBACK_PATHS = [
  WEATHER_TXT_PATH,
  join(EXPLORER_ROOT, "..", "doc", "weather.txt"),
];

export const COMMON_FEED_OPTIONS = {
  rateLimitPerMin: 60,
  timeoutMs: 10000,
  retryPolicy: "exponential",
  maxRetries: 1,
};

export const NO_AUTH_LIMITS = {
  tinyText: 512 * 1024,
  smallJson: 5 * 1024 * 1024,
  mediumJson: 15 * 1024 * 1024,
  smallXml: 5 * 1024 * 1024,
  mediumXml: 15 * 1024 * 1024,
  tileSample: 2 * 1024 * 1024,
  indexSample: 3 * 1024 * 1024,
  referenceHtml: 10 * 1024 * 1024,
};

export const SOURCE_ALIASES = {
  open_meteo: ["Open-Meteo"],
  noaa_nws: ["NWS API", "NWS observations", "NWS alerts", "NWS", "NOAA/NWS"],
  noaa_nodd_gfs: ["NOAA GFS", "GFS", "NOAA NODD"],
  nasa_gibs: ["NASA GIBS", "GIBS"],
  noaa_goes: ["GOES", "NOAA GOES"],
  usgs_earthquake: ["USGS Earthquake API", "USGS Earthquake", "USGS event details", "USGS ShakeMap"],
  usgs_water: ["USGS Water"],
  noaa_nwps: ["NOAA NWPS", "NWPS", "NOAA NWM"],
  noaa_dart: ["NOAA DART", "DART", "NDBC"],
  smithsonian_gvp: ["Smithsonian GVP"],
  usgs_volcano: ["USGS Volcano", "USGS Volcano Hazards Program"],
  gdacs: ["GDACS"],
  worldpop: ["WorldPop"],
};

export const NO_AUTH_SOURCES = {
  open_meteo: {
    name: "Open-Meteo",
    docsUrl: "https://open-meteo.com/en/docs",
    category: "weather",
    formats: ["json", "csv", "xlsx"],
    rateRule: "Current 10-15 minutes; forecast hourly; free no-key public API.",
  },
  noaa_nws: {
    name: "NOAA/NWS API",
    docsUrl: "https://www.weather.gov/documentation/services-web-api",
    category: "weather_alerts",
    formats: ["json", "geojson", "xml-ld"],
    rateRule: "Alerts 2-5 minutes; forecasts 15-60 minutes; User-Agent required.",
  },
  noaa_nodd_gfs: {
    name: "NOAA NODD / GFS",
    docsUrl: "https://registry.opendata.aws/noaa-gfs-bdp-pds/",
    category: "weather_models",
    formats: ["grib2", "netcdf", "idx", "s3-listing-xml"],
    rateRule: "4x/day after model cycle; v1 fetches only listings and .idx-style indexes.",
  },
  nasa_gibs: {
    name: "NASA GIBS",
    docsUrl: "https://www.earthdata.nasa.gov/engage/open-data-services-software/earthdata-developer-portal/gibs-api",
    category: "satellite_imagery",
    formats: ["wmts", "wms", "twms", "tiles"],
    rateRule: "Tile service; cache on demand; no blind bulk tile download.",
  },
  noaa_goes: {
    name: "NOAA GOES on AWS",
    docsUrl: "https://registry.opendata.aws/noaa-goes/",
    category: "satellite_imagery",
    formats: ["netcdf", "s3-listing-xml"],
    rateRule: "5-15 minute product availability; v1 fetches bucket metadata/listings only.",
  },
  usgs_earthquake: {
    name: "USGS Earthquake API",
    docsUrl: "https://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php",
    category: "hazards",
    formats: ["geojson", "json", "csv", "xml"],
    rateRule: "1-5 minutes for realtime feeds.",
  },
  usgs_water: {
    name: "USGS Water Data APIs",
    docsUrl: "https://api.waterdata.usgs.gov/",
    category: "hydrology",
    formats: ["json", "ogc-json", "waterml"],
    rateRule: "15-60 minutes for monitored gauges/regions.",
  },
  noaa_nwps: {
    name: "NOAA NWPS",
    docsUrl: "https://water.noaa.gov/about/api",
    category: "hydrology",
    formats: ["json", "openapi", "services"],
    rateRule: "15-60 minutes; cache metadata separately from changing observations.",
  },
  noaa_dart: {
    name: "NOAA DART/NDBC",
    docsUrl: "https://www.ndbc.noaa.gov/dart/dart.shtml",
    category: "ocean_tsunami",
    formats: ["text", "csv-like", "xml"],
    rateRule: "15-60 minutes normally; adaptive faster only after major ocean earthquake.",
  },
  smithsonian_gvp: {
    name: "Smithsonian GVP",
    docsUrl: "https://volcano.si.edu/",
    category: "volcano_reference",
    formats: ["html", "xml", "rss", "excel-xml"],
    rateRule: "Weekly/monthly reference and report updates.",
  },
  usgs_volcano: {
    name: "USGS Volcano Hazards Program",
    docsUrl: "https://volcanoes.usgs.gov/vsc/api/",
    category: "volcano_alerts",
    formats: ["json", "geojson", "xml"],
    rateRule: "5-30 minutes for notices; daily for background reference.",
  },
  gdacs: {
    name: "GDACS",
    docsUrl: "https://gdacs.org/feed_reference.aspx",
    category: "disaster_alerts",
    formats: ["rss", "xml", "geojson", "kml"],
    rateRule: "6-10 minutes for popular alert feeds.",
  },
  worldpop: {
    name: "WorldPop",
    docsUrl: "https://www.worldpop.org/sdi/introapi/",
    category: "population",
    formats: ["json", "geotiff", "ascii-xyz"],
    rateRule: "Yearly/static; v1 fetches metadata only.",
  },
};

function splitMarkdownRow(line) {
  return line
    .split("|")
    .slice(1, -1)
    .map((cell) => cell.trim());
}

function isParameterRow(line) {
  if (!line.startsWith("|")) return false;
  if (line.includes("---")) return false;
  if (line.includes("Parameter / data item")) return false;
  return splitMarkdownRow(line).length >= 2;
}

function matchesAlias(sourceText, alias) {
  return sourceText.toLowerCase().includes(alias.toLowerCase());
}

async function fileExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export async function resolveWeatherTxtPath(weatherTxtPath = WEATHER_TXT_PATH) {
  const paths = [weatherTxtPath, ...WEATHER_TXT_FALLBACK_PATHS].filter(
    (path, index, values) => values.indexOf(path) === index,
  );
  for (const path of paths) {
    if (await fileExists(path)) return path;
  }
  return weatherTxtPath;
}

export function parseFirstWeatherParameterTable(text) {
  const rows = [];
  let inFirstTable = false;

  for (const line of text.split(/\r?\n/)) {
    if (!line.startsWith("|")) {
      if (inFirstTable) break;
      continue;
    }

    inFirstTable = true;
    if (!isParameterRow(line)) continue;

    const [parameter, sourceText] = splitMarkdownRow(line);
    if (parameter && sourceText) rows.push({ parameter, sourceText });
  }

  return rows;
}

export async function loadWeatherParameterRows(weatherTxtPath = WEATHER_TXT_PATH) {
  const resolvedWeatherTxtPath = await resolveWeatherTxtPath(weatherTxtPath);
  const text = await readFile(resolvedWeatherTxtPath, "utf8");
  return parseFirstWeatherParameterTable(text);
}

export async function getSourceParameterNames(sourceId, weatherTxtPath = WEATHER_TXT_PATH) {
  const aliases = SOURCE_ALIASES[sourceId] || [];
  const rows = await loadWeatherParameterRows(weatherTxtPath);
  return rows
    .filter((row) => aliases.some((alias) => matchesAlias(row.sourceText, alias)))
    .map((row) => row.parameter);
}

export async function buildNoAuthSourceManifest(weatherTxtPath = WEATHER_TXT_PATH) {
  const entries = {};
  for (const [sourceId, source] of Object.entries(NO_AUTH_SOURCES)) {
    entries[sourceId] = {
      id: sourceId,
      ...source,
      parameterNames: await getSourceParameterNames(sourceId, weatherTxtPath),
    };
  }
  return entries;
}

export async function loadWatchConfig() {
  return JSON.parse(await readFile(new URL("./watch_locations.json", import.meta.url), "utf8"));
}

export function sourceExpected(sourceId, detail) {
  const source = NO_AUTH_SOURCES[sourceId];
  const docs = source ? ` Docs: ${source.docsUrl}` : "";
  return `${detail}${docs}`;
}

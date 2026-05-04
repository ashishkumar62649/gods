import { ensureDotEnvLoaded, runCli, runFeedIfCredential, runFeedList } from "./common_functions/index.mjs";
import { AUTH_COMMON_FEED_OPTIONS, AUTH_LIMITS, authSourceExpected, loadWatchConfig } from "./config/auth_source_manifest.mjs";

const SOURCE = "nasa_firms";
const KEY_ENV = "NASA_FIRMS_MAP_KEY";

function redactedUrl(url) {
  return url.replace(encodeURIComponent(process.env[KEY_ENV] || ""), "[redacted-map-key]");
}

function statusFeed(mapKey) {
  const requestUrl = `https://firms.modaps.eosdis.nasa.gov/mapserver/mapkey_status/?MAP_KEY=${encodeURIComponent(mapKey || "missing")}`;
  return {
    ...AUTH_COMMON_FEED_OPTIONS,
    source: SOURCE,
    folder: "auth_status",
    dataType: "mapkey_status",
    url: mapKey ? redactedUrl(requestUrl) : "https://firms.modaps.eosdis.nasa.gov/mapserver/mapkey_status/?MAP_KEY=[missing]",
    requestUrl,
    expected: authSourceExpected(SOURCE, "NASA FIRMS MAP_KEY status and quota response."),
    expectedFormat: "json",
    extension: "json",
    expectedLimitBytes: AUTH_LIMITS.smallJson,
    rateLimitPerMin: 20,
  };
}

function areaCsvFeed(mapKey, sourceName, area) {
  const areaPath = area.bbox;
  const dayRange = process.env.NASA_FIRMS_DAY_RANGE || String(area.dayRange || 1);
  const requestUrl = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${encodeURIComponent(mapKey || "missing")}/${encodeURIComponent(sourceName)}/${areaPath}/${dayRange}`;
  return {
    ...AUTH_COMMON_FEED_OPTIONS,
    source: SOURCE,
    folder: "active_fires",
    dataType: `${sourceName}_${area.id}_${dayRange}d`,
    url: `https://firms.modaps.eosdis.nasa.gov/api/area/csv/[redacted-map-key]/${encodeURIComponent(sourceName)}/${areaPath}/${dayRange}`,
    requestUrl,
    expected: authSourceExpected(SOURCE, `NASA FIRMS active fire CSV for ${area.name} using ${sourceName}; includes fire location, brightness, confidence, and FRP fields when provided.`),
    expectedFormat: "csv",
    extension: "csv",
    expectedLimitBytes: AUTH_LIMITS.firmsCsv,
    rateLimitPerMin: 20,
    timeoutMs: 30000,
  };
}

async function buildFeeds() {
  await ensureDotEnvLoaded();
  const mapKey = process.env[KEY_ENV];
  const watchConfig = await loadWatchConfig();
  const sources = process.env.NASA_FIRMS_SOURCES
    ? process.env.NASA_FIRMS_SOURCES.split(",").map((item) => item.trim()).filter(Boolean)
    : watchConfig.firms.sources;
  const areas = watchConfig.firms.areas.map((area) => ({ ...area, dayRange: watchConfig.firms.dayRange }));
  return [
    statusFeed(mapKey),
    ...sources.flatMap((sourceName) => areas.map((area) => areaCsvFeed(mapKey, sourceName, area))),
  ];
}

export async function runNasaFirmsRawFetch() {
  const feeds = await buildFeeds();
  const results = [];
  for (const feed of feeds) {
    results.push(await runFeedIfCredential(feed, KEY_ENV));
  }
  return results;
}

runCli(import.meta.url, SOURCE, runNasaFirmsRawFetch);

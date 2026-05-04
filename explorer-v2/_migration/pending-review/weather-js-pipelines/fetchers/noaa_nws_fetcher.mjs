import { readFile } from "node:fs/promises";
import { runCli, runFeed, runFeedList } from "./common_functions/index.mjs";
import { COMMON_FEED_OPTIONS, NO_AUTH_LIMITS, loadWatchConfig, sourceExpected } from "./config/no_auth_source_manifest.mjs";

const NWS_USER_AGENT = process.env.NWS_USER_AGENT || "GODS-Explorer/0.1 (raw weather fetcher; contact: local-dev)";

const NWS_OPTIONS = {
  ...COMMON_FEED_OPTIONS,
  headers: { "User-Agent": NWS_USER_AGENT },
  accept: "application/geo+json, application/json, application/ld+json",
  rateLimitPerMin: 30,
  timeoutMs: 15000,
};

function nwsPointUrl(location) {
  return `https://api.weather.gov/points/${location.latitude.toFixed(4)},${location.longitude.toFixed(4)}`;
}

function buildFeeds(watchConfig) {
  const usLocations = watchConfig.locations.filter((location) => location.useNws);
  return [
    {
      ...NWS_OPTIONS,
      source: "noaa_nws",
      folder: "alerts",
      dataType: "alerts_active_actual",
      url: process.env.NWS_ALERTS_URL || "https://api.weather.gov/alerts/active?status=actual&message_type=alert",
      expected: sourceExpected("noaa_nws", "NWS active actual alerts for weather warnings, watches, and emergency alert context."),
      expectedFormat: "geojson",
      extension: "geojson",
      expectedLimitBytes: NO_AUTH_LIMITS.mediumJson,
    },
    ...usLocations.map((location) => ({
      ...NWS_OPTIONS,
      source: "noaa_nws",
      folder: "points",
      dataType: `point_metadata_${location.id}`,
      url: nwsPointUrl(location),
      expected: sourceExpected("noaa_nws", `NWS point metadata for ${location.name}; exposes forecast, hourly forecast, and observation-station links.`),
      expectedFormat: "json",
      extension: "json",
      expectedLimitBytes: NO_AUTH_LIMITS.smallJson,
    })),
  ];
}

async function fetchPointLinkedFeeds({ feedConfig, result }) {
  if (!feedConfig.dataType.startsWith("point_metadata_")) return [];
  if (!["success", "duplicate"].includes(result.status)) return [];

  const rawPath = result.rawFilePath || result.existingFilePath;
  if (!rawPath) return [];

  const pointId = feedConfig.dataType.replace("point_metadata_", "");
  const body = JSON.parse(await readFile(rawPath, "utf8"));
  const links = [
    ["forecast", body?.properties?.forecast],
    ["forecast_hourly", body?.properties?.forecastHourly],
    ["observation_stations", body?.properties?.observationStations],
  ].filter(([, url]) => typeof url === "string" && url.startsWith("https://"));

  const results = [];
  for (const [kind, url] of links) {
    results.push(await runFeed({
      ...NWS_OPTIONS,
      source: "noaa_nws",
      folder: kind,
      dataType: `${kind}_${pointId}`,
      url,
      expected: sourceExpected("noaa_nws", `NWS linked ${kind.replaceAll("_", " ")} payload discovered from point metadata for ${pointId}.`),
      expectedFormat: "json",
      extension: "json",
      expectedLimitBytes: NO_AUTH_LIMITS.mediumJson,
    }));
  }
  return results;
}

export async function runNoaaNwsRawFetch() {
  return runFeedList(buildFeeds(await loadWatchConfig()), { afterFeed: fetchPointLinkedFeeds });
}

runCli(import.meta.url, "noaa_nws", runNoaaNwsRawFetch);

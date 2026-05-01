import { readFile } from "node:fs/promises";
import { runCli, runFeed, runFeedList } from "./common_functions/index.mjs";
import { COMMON_FEED_OPTIONS, NO_AUTH_LIMITS, sourceExpected } from "./config/no_auth_source_manifest.mjs";

const DETAIL_LIMIT = Math.max(0, Number(process.env.USGS_EARTHQUAKE_DETAIL_LIMIT || 3));

const USGS_EARTHQUAKE_OPTIONS = {
  ...COMMON_FEED_OPTIONS,
  source: "usgs_earthquake",
  folder: "earthquakes",
  rateLimitPerMin: 60,
  timeoutMs: 10000,
};

const FEEDS = [
  {
    ...USGS_EARTHQUAKE_OPTIONS,
    dataType: "earthquakes_live_all_hour",
    url: process.env.USGS_EARTHQUAKE_ALL_HOUR_URL || "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson",
    expected: sourceExpected("usgs_earthquake", "USGS all earthquakes in the past hour GeoJSON summary feed."),
    expectedFormat: "geojson",
    extension: "geojson",
    expectedLimitBytes: NO_AUTH_LIMITS.smallJson,
  },
  {
    ...USGS_EARTHQUAKE_OPTIONS,
    dataType: "earthquakes_significant_day",
    url: process.env.USGS_EARTHQUAKE_SIGNIFICANT_DAY_URL || "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_day.geojson",
    expected: sourceExpected("usgs_earthquake", "USGS significant earthquakes in the past day GeoJSON summary feed."),
    expectedFormat: "geojson",
    extension: "geojson",
    expectedLimitBytes: NO_AUTH_LIMITS.smallJson,
  },
  {
    ...USGS_EARTHQUAKE_OPTIONS,
    dataType: "earthquakes_m45_day",
    url: process.env.USGS_EARTHQUAKE_M45_DAY_URL || "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_day.geojson",
    expected: sourceExpected("usgs_earthquake", "USGS M4.5+ earthquakes in the past day GeoJSON summary feed."),
    expectedFormat: "geojson",
    extension: "geojson",
    expectedLimitBytes: NO_AUTH_LIMITS.smallJson,
  },
];

async function fetchEarthquakeDetails({ feedConfig, result }) {
  if (!feedConfig.dataType.includes("earthquakes_live_all_hour")) return [];
  if (DETAIL_LIMIT === 0 || !["success", "duplicate"].includes(result.status)) return [];

  const rawPath = result.rawFilePath || result.existingFilePath;
  if (!rawPath) return [];

  const body = JSON.parse(await readFile(rawPath, "utf8"));
  const detailUrls = (body.features || [])
    .map((feature) => feature?.properties?.detail)
    .filter(Boolean)
    .slice(0, DETAIL_LIMIT);

  const details = [];
  for (const [index, url] of detailUrls.entries()) {
    details.push(await runFeed({
      ...USGS_EARTHQUAKE_OPTIONS,
      dataType: `earthquake_detail_${index + 1}`,
      url,
      expected: sourceExpected("usgs_earthquake", "USGS earthquake detail JSON with products such as ShakeMap when available."),
      expectedFormat: "json",
      extension: "json",
      expectedLimitBytes: NO_AUTH_LIMITS.smallJson,
    }));
  }
  return details;
}

export async function runUsgsEarthquakeRawFetch() {
  return runFeedList(FEEDS, { afterFeed: fetchEarthquakeDetails });
}

runCli(import.meta.url, "usgs_earthquake", runUsgsEarthquakeRawFetch);

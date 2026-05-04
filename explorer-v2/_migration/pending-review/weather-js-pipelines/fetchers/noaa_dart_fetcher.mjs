import { runCli, runFeedList } from "./common_functions/index.mjs";
import { COMMON_FEED_OPTIONS, NO_AUTH_LIMITS, loadWatchConfig, sourceExpected } from "./config/no_auth_source_manifest.mjs";

const DART_OPTIONS = {
  ...COMMON_FEED_OPTIONS,
  source: "noaa_dart",
  rateLimitPerMin: 20,
  timeoutMs: 15000,
};

function buildFeeds(watchConfig) {
  const stations = process.env.NOAA_DART_STATIONS
    ? process.env.NOAA_DART_STATIONS.split(",").map((item) => item.trim()).filter(Boolean)
    : watchConfig.dart.stationIds;

  return [
    {
      ...DART_OPTIONS,
      folder: "stations",
      dataType: "ndbc_active_stations",
      url: process.env.NDBC_ACTIVE_STATIONS_URL || "https://www.ndbc.noaa.gov/activestations.xml",
      expected: sourceExpected("noaa_dart", "NDBC active stations XML; used to discover buoy and tsunami station availability."),
      expectedFormat: "xml",
      extension: "xml",
      expectedLimitBytes: NO_AUTH_LIMITS.smallXml,
    },
    ...stations.map((stationId) => ({
      ...DART_OPTIONS,
      folder: "dart_realtime",
      dataType: `dart_${stationId}`,
      url: process.env[`NOAA_DART_${stationId}_URL`] || `https://www.ndbc.noaa.gov/data/realtime2/${encodeURIComponent(stationId)}.dart`,
      expected: sourceExpected("noaa_dart", `NOAA/NDBC DART realtime text feed for station ${stationId}; tsunami buoy pressure/water-level signal context.`),
      expectedFormat: "text",
      extension: "txt",
      expectedLimitBytes: NO_AUTH_LIMITS.tinyText,
    })),
  ];
}

export async function runNoaaDartRawFetch() {
  return runFeedList(buildFeeds(await loadWatchConfig()));
}

runCli(import.meta.url, "noaa_dart", runNoaaDartRawFetch);

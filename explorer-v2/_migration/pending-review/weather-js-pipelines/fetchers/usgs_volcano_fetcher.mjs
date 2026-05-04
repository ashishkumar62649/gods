import { runCli, runFeedList } from "./common_functions/index.mjs";
import { COMMON_FEED_OPTIONS, NO_AUTH_LIMITS, sourceExpected } from "./config/no_auth_source_manifest.mjs";

const USGS_VOLCANO_OPTIONS = {
  ...COMMON_FEED_OPTIONS,
  source: "usgs_volcano",
  rateLimitPerMin: 20,
  timeoutMs: 20000,
};

const FEEDS = [
  {
    ...USGS_VOLCANO_OPTIONS,
    folder: "volcano_reference",
    dataType: "volcano_status_geojson",
    url: process.env.USGS_VOLCANO_STATUS_URL || "https://volcanoes.usgs.gov/vsc/api/volcanoApi/geojson",
    expected: sourceExpected("usgs_volcano", "USGS Volcano Hazards Program volcano status GeoJSON."),
    expectedFormat: "geojson",
    extension: "geojson",
    expectedLimitBytes: NO_AUTH_LIMITS.mediumJson,
  },
  {
    ...USGS_VOLCANO_OPTIONS,
    folder: "alerts",
    dataType: "hans_elevated_volcanoes",
    url: process.env.USGS_VOLCANO_ELEVATED_URL || "https://volcanoes.usgs.gov/hans-public/api/volcano/getElevatedVolcanoes",
    expected: sourceExpected("usgs_volcano", "USGS HANS elevated volcano records."),
    expectedFormat: "json",
    extension: "json",
    expectedLimitBytes: NO_AUTH_LIMITS.smallJson,
  },
  {
    ...USGS_VOLCANO_OPTIONS,
    folder: "notices",
    dataType: "hans_recent_notices",
    url: process.env.USGS_VOLCANO_NOTICES_URL || "https://volcanoes.usgs.gov/hans-public/api/notice/getNewestOrRecent",
    expected: sourceExpected("usgs_volcano", "USGS HANS newest or recent volcano notices and updates."),
    expectedFormat: "json",
    extension: "json",
    expectedLimitBytes: NO_AUTH_LIMITS.mediumJson,
  },
  {
    ...USGS_VOLCANO_OPTIONS,
    folder: "api_docs",
    dataType: "vsc_api_index",
    url: process.env.USGS_VOLCANO_API_INDEX_URL || "https://volcanoes.usgs.gov/vsc/api/",
    expected: sourceExpected("usgs_volcano", "USGS VHP API index page for source debugging."),
    expectedFormat: "html",
    extension: "html",
    expectedLimitBytes: NO_AUTH_LIMITS.referenceHtml,
  },
];

export async function runUsgsVolcanoRawFetch() {
  return runFeedList(FEEDS);
}

runCli(import.meta.url, "usgs_volcano", runUsgsVolcanoRawFetch);

import { runCli, runFeedList } from "./common_functions/index.mjs";

const COMMON_FEED_OPTIONS = {
  rateLimitPerMin: 60,
  timeoutMs: 10000,
  retryPolicy: "exponential",
  maxRetries: 1,
};

const FEEDS = [
  {
    ...COMMON_FEED_OPTIONS,
    source: "gdacs",
    folder: "all_events",
    dataType: "all_events_current",
    url: process.env.GDACS_ALL_EVENTS_URL || "https://gdacs.org/xml/rss.xml",
    expected: "GDACS current multi-hazard RSS/XML feed.",
    expectedFormat: "xml",
    extension: "xml",
    expectedLimitBytes: 15 * 1024 * 1024,
    rateLimitPerMin: 30,
  },
  {
    ...COMMON_FEED_OPTIONS,
    source: "gdacs",
    folder: "all_events",
    dataType: "all_events_24h",
    url: process.env.GDACS_ALL_EVENTS_24H_URL || "https://gdacs.org/xml/rss_24h.xml",
    expected: "GDACS events in the last 24 hours RSS/XML feed.",
    expectedFormat: "xml",
    extension: "xml",
    expectedLimitBytes: 10 * 1024 * 1024,
    rateLimitPerMin: 30,
  },
  {
    ...COMMON_FEED_OPTIONS,
    source: "gdacs",
    folder: "earthquakes",
    dataType: "earthquakes_24h",
    url: process.env.GDACS_EARTHQUAKES_24H_URL || "https://gdacs.org/xml/rss_eq_24h.xml",
    expected: "GDACS earthquakes in the last 24 hours RSS/XML feed.",
    expectedFormat: "xml",
    extension: "xml",
    expectedLimitBytes: 5 * 1024 * 1024,
  },
  {
    ...COMMON_FEED_OPTIONS,
    source: "gdacs",
    folder: "cyclones",
    dataType: "cyclones_7d",
    url: process.env.GDACS_CYCLONES_7D_URL || "https://gdacs.org/xml/rss_tc_7d.xml",
    expected: "GDACS tropical cyclones in the last week RSS/XML feed.",
    expectedFormat: "xml",
    extension: "xml",
    expectedLimitBytes: 5 * 1024 * 1024,
  },
  {
    ...COMMON_FEED_OPTIONS,
    source: "gdacs",
    folder: "floods",
    dataType: "floods_7d",
    url: process.env.GDACS_FLOODS_7D_URL || "https://gdacs.org/xml/rss_fl_7d.xml",
    expected: "GDACS floods in the last week RSS/XML feed.",
    expectedFormat: "xml",
    extension: "xml",
    expectedLimitBytes: 5 * 1024 * 1024,
  },
  {
    ...COMMON_FEED_OPTIONS,
    source: "gdacs",
    folder: "volcanoes",
    dataType: "volcano_news",
    url: process.env.GDACS_VOLCANO_NEWS_URL || "https://www.gdacs.org/contentdata/xml/VO_news.xml",
    expected: "GDACS volcano news XML feed.",
    expectedFormat: "xml",
    extension: "xml",
    expectedLimitBytes: 5 * 1024 * 1024,
  },
  {
    ...COMMON_FEED_OPTIONS,
    source: "gdacs",
    folder: "volcanoes",
    dataType: "volcano_map",
    url: process.env.GDACS_VOLCANO_MAP_URL || "https://www.gdacs.org/contentdata/xml/VO_map.geojson",
    expected: "GDACS volcano map GeoJSON feed.",
    expectedFormat: "geojson",
    extension: "geojson",
    expectedLimitBytes: 5 * 1024 * 1024,
  },
  {
    ...COMMON_FEED_OPTIONS,
    source: "gdacs",
    folder: "wildfires",
    dataType: "wildfire_map",
    url: process.env.GDACS_WILDFIRE_MAP_URL || "https://www.gdacs.org/contentdata/xml/WF_map.geojson",
    expected: "GDACS wildfire map GeoJSON feed.",
    expectedFormat: "geojson",
    extension: "geojson",
    expectedLimitBytes: 10 * 1024 * 1024,
  },
];

export async function runGdacsRawFetch() {
  return runFeedList(FEEDS);
}

runCli(import.meta.url, "gdacs", runGdacsRawFetch);
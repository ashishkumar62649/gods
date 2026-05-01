import { runCli, runFeedList } from "./common_functions/index.mjs";
import { COMMON_FEED_OPTIONS, NO_AUTH_LIMITS } from "./config/no_auth_source_manifest.mjs";

const SOURCE = "noaa_cyclone";
const NHC_DOCS = "https://www.nhc.noaa.gov/gis/";
const JTWC_DOCS = "https://www.metoc.navy.mil/jtwc/jtwc.html";

const OPTIONS = {
  ...COMMON_FEED_OPTIONS,
  source: SOURCE,
  rateLimitPerMin: 20,
  timeoutMs: 20000,
};

function expected(detail, docs = NHC_DOCS) {
  return `${detail} Docs: ${docs}`;
}

function buildFeeds() {
  return [
    {
      ...OPTIONS,
      folder: "nhc_active",
      dataType: "current_storms",
      url: process.env.NHC_CURRENT_STORMS_URL || "https://www.nhc.noaa.gov/CurrentStorms.json",
      expected: expected("NOAA NHC active-storm JSON; covers hurricane/cyclone/tropical storm activity when active."),
      expectedFormat: "json",
      extension: "json",
      expectedLimitBytes: NO_AUTH_LIMITS.smallJson,
    },
    {
      ...OPTIONS,
      folder: "nhc_rss",
      dataType: "atlantic_gis_rss",
      url: process.env.NHC_ATLANTIC_GIS_RSS_URL || "https://www.nhc.noaa.gov/gis-at.xml",
      expected: expected("NOAA NHC Atlantic GIS/RSS feed for current cyclone GIS products."),
      expectedFormat: "xml",
      extension: "xml",
      expectedLimitBytes: NO_AUTH_LIMITS.smallXml,
    },
    {
      ...OPTIONS,
      folder: "nhc_rss",
      dataType: "eastern_pacific_gis_rss",
      url: process.env.NHC_EAST_PACIFIC_GIS_RSS_URL || "https://www.nhc.noaa.gov/gis-ep.xml",
      expected: expected("NOAA NHC Eastern Pacific GIS/RSS feed for current cyclone GIS products."),
      expectedFormat: "xml",
      extension: "xml",
      expectedLimitBytes: NO_AUTH_LIMITS.smallXml,
    },
    {
      ...OPTIONS,
      folder: "jtwc_text",
      dataType: "western_pacific_significant_tropical_weather",
      url: process.env.JTWC_WEST_PACIFIC_TEXT_URL || "https://www.metoc.navy.mil/jtwc/products/abpwweb.txt",
      expected: expected("JTWC Western Pacific significant tropical weather text; covers typhoon/cyclone context outside NHC basins.", JTWC_DOCS),
      expectedFormat: "text",
      extension: "txt",
      expectedLimitBytes: NO_AUTH_LIMITS.tinyText,
    },
  ];
}

export async function runNoaaCycloneRawFetch() {
  return runFeedList(buildFeeds());
}

runCli(import.meta.url, SOURCE, runNoaaCycloneRawFetch);

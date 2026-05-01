import { runCli, runFeedList } from "./common_functions/index.mjs";
import { COMMON_FEED_OPTIONS, NO_AUTH_LIMITS } from "./config/no_auth_source_manifest.mjs";

const SOURCE = "noaa_spc";
const DOCS = "https://www.spc.noaa.gov/products/outlook/";

const OPTIONS = {
  ...COMMON_FEED_OPTIONS,
  source: SOURCE,
  rateLimitPerMin: 20,
  timeoutMs: 20000,
};

function feed(id, url, detail) {
  return {
    ...OPTIONS,
    folder: "convective_outlooks",
    dataType: id,
    url,
    expected: `${detail} Docs: ${DOCS}`,
    expectedFormat: "geojson",
    extension: "geojson",
    expectedLimitBytes: NO_AUTH_LIMITS.mediumJson,
  };
}

function buildFeeds() {
  return [
    feed("day1_categorical", "https://www.spc.noaa.gov/products/outlook/day1otlk_cat.nolyr.geojson", "NOAA SPC day-1 categorical severe-convective outlook."),
    feed("day1_tornado", "https://www.spc.noaa.gov/products/outlook/day1otlk_torn.nolyr.geojson", "NOAA SPC day-1 tornado probability outlook."),
    feed("day1_hail", "https://www.spc.noaa.gov/products/outlook/day1otlk_hail.nolyr.geojson", "NOAA SPC day-1 hail probability outlook."),
    feed("day1_wind", "https://www.spc.noaa.gov/products/outlook/day1otlk_wind.nolyr.geojson", "NOAA SPC day-1 damaging-wind probability outlook."),
  ];
}

export async function runNoaaSpcRawFetch() {
  return runFeedList(buildFeeds());
}

runCli(import.meta.url, SOURCE, runNoaaSpcRawFetch);

import { runCli, runFeedList } from "./common_functions/index.mjs";
import { COMMON_FEED_OPTIONS, NO_AUTH_LIMITS } from "./config/no_auth_source_manifest.mjs";

const SOURCE = "noaa_marine";
const COOPS_DOCS = "https://api.tidesandcurrents.noaa.gov/api/prod/";
const NDBC_DOCS = "https://www.ndbc.noaa.gov/";

const OPTIONS = {
  ...COMMON_FEED_OPTIONS,
  source: SOURCE,
  rateLimitPerMin: 30,
  timeoutMs: 20000,
};

function yyyymmdd(date) {
  return date.toISOString().slice(0, 10).replace(/-/g, "");
}

function coopsUrl(product, station = "9414290") {
  const end = new Date();
  const start = new Date(Date.now() - 2 * 86_400_000);
  const params = new URLSearchParams({
    product,
    application: "GODSExplorer",
    begin_date: yyyymmdd(start),
    end_date: yyyymmdd(end),
    station,
    time_zone: "gmt",
    units: "metric",
    format: "json",
  });
  if (product === "water_level" || product === "predictions") params.set("datum", "MLLW");
  return `https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?${params}`;
}

function buildFeeds() {
  const station = process.env.NOAA_COOPS_STATION || "9414290";
  const buoy = process.env.NOAA_NDBC_BUOY || "46026";
  return [
    {
      ...OPTIONS,
      folder: "coops_station_metadata",
      dataType: `${station}_metadata`,
      url: process.env.NOAA_COOPS_STATION_METADATA_URL || `https://api.tidesandcurrents.noaa.gov/mdapi/prod/webapi/stations/${station}.json?units=metric`,
      expected: `NOAA CO-OPS station metadata for tide/water-level context. Docs: ${COOPS_DOCS}`,
      expectedFormat: "json",
      extension: "json",
      expectedLimitBytes: NO_AUTH_LIMITS.smallJson,
    },
    {
      ...OPTIONS,
      folder: "coops_water_level",
      dataType: `${station}_water_level_recent`,
      url: process.env.NOAA_COOPS_WATER_LEVEL_URL || coopsUrl("water_level", station),
      expected: `NOAA CO-OPS recent water-level observations for tide/storm-tide/coastal-flood inputs. Docs: ${COOPS_DOCS}`,
      expectedFormat: "json",
      extension: "json",
      expectedLimitBytes: NO_AUTH_LIMITS.smallJson,
    },
    {
      ...OPTIONS,
      folder: "coops_predictions",
      dataType: `${station}_tide_predictions_recent`,
      url: process.env.NOAA_COOPS_PREDICTIONS_URL || coopsUrl("predictions", station),
      expected: `NOAA CO-OPS tide predictions for high/low tide inputs. Docs: ${COOPS_DOCS}`,
      expectedFormat: "json",
      extension: "json",
      expectedLimitBytes: NO_AUTH_LIMITS.smallJson,
    },
    {
      ...OPTIONS,
      folder: "ndbc_latest",
      dataType: "latest_observations",
      url: process.env.NOAA_NDBC_LATEST_OBS_URL || "https://www.ndbc.noaa.gov/data/latest_obs/latest_obs.txt",
      expected: `NOAA NDBC latest buoy observations including wave height, period, direction, pressure, air/water temperature, and wind. Docs: ${NDBC_DOCS}`,
      expectedFormat: "text",
      extension: "txt",
      expectedLimitBytes: NO_AUTH_LIMITS.tinyText,
    },
    {
      ...OPTIONS,
      folder: "ndbc_buoy",
      dataType: `${buoy}_realtime`,
      url: process.env.NOAA_NDBC_BUOY_URL || `https://www.ndbc.noaa.gov/data/realtime2/${buoy}.txt`,
      expected: `NOAA NDBC realtime buoy feed for wave, swell, wind, pressure, and sea temperature samples. Docs: ${NDBC_DOCS}`,
      expectedFormat: "text",
      extension: "txt",
      expectedLimitBytes: Number(process.env.NOAA_NDBC_BUOY_LIMIT_BYTES || 2 * 1024 * 1024),
    },
  ];
}

export async function runNoaaMarineRawFetch() {
  return runFeedList(buildFeeds());
}

runCli(import.meta.url, SOURCE, runNoaaMarineRawFetch);

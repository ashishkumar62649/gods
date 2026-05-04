import { runCli, runFeedList } from "./common_functions/index.mjs";
import { COMMON_FEED_OPTIONS, NO_AUTH_LIMITS, loadWatchConfig, sourceExpected } from "./config/no_auth_source_manifest.mjs";

const NWPS_OPTIONS = {
  ...COMMON_FEED_OPTIONS,
  source: "noaa_nwps",
  rateLimitPerMin: 30,
  timeoutMs: 20000,
};

function buildGaugeFeeds(gaugeId) {
  const encoded = encodeURIComponent(gaugeId);
  const base = process.env.NOAA_NWPS_API_BASE || "https://api.water.noaa.gov/nwps/v1";
  return [
    {
      ...NWPS_OPTIONS,
      folder: "gauges",
      dataType: `gauge_${gaugeId}`,
      url: process.env[`NOAA_NWPS_GAUGE_${gaugeId}_URL`] || `${base}/gauges/${encoded}`,
      expected: sourceExpected("noaa_nwps", `NWPS gauge metadata for configured gauge ${gaugeId}.`),
      expectedFormat: "json",
      extension: "json",
      expectedLimitBytes: NO_AUTH_LIMITS.smallJson,
    },
    {
      ...NWPS_OPTIONS,
      folder: "observations",
      dataType: `observed_${gaugeId}`,
      url: process.env[`NOAA_NWPS_OBSERVED_${gaugeId}_URL`] || `${base}/gauges/${encoded}/stageflow/observed`,
      expected: sourceExpected("noaa_nwps", `NWPS observed water values for configured gauge ${gaugeId}.`),
      expectedFormat: "json",
      extension: "json",
      expectedLimitBytes: NO_AUTH_LIMITS.smallJson,
    },
    {
      ...NWPS_OPTIONS,
      folder: "forecasts",
      dataType: `forecast_${gaugeId}`,
      url: process.env[`NOAA_NWPS_FORECAST_${gaugeId}_URL`] || `${base}/gauges/${encoded}/stageflow/forecast`,
      expected: sourceExpected("noaa_nwps", `NWPS forecast water values and flood-stage context for configured gauge ${gaugeId}.`),
      expectedFormat: "json",
      extension: "json",
      expectedLimitBytes: NO_AUTH_LIMITS.smallJson,
    },
  ];
}

function buildFeeds(watchConfig) {
  return [
    {
      ...NWPS_OPTIONS,
      folder: "docs",
      dataType: "nwps_api_docs_html",
      url: process.env.NOAA_NWPS_DOCS_URL || "https://api.water.noaa.gov/nwps/v1/docs/",
      expected: sourceExpected("noaa_nwps", "NWPS OpenAPI documentation page; stored as source debug proof."),
      expectedFormat: "html",
      extension: "html",
      expectedLimitBytes: NO_AUTH_LIMITS.referenceHtml,
    },
    ...watchConfig.nwps.gaugeIds.flatMap(buildGaugeFeeds),
  ];
}

export async function runNoaaNwpsRawFetch() {
  return runFeedList(buildFeeds(await loadWatchConfig()));
}

runCli(import.meta.url, "noaa_nwps", runNoaaNwpsRawFetch);

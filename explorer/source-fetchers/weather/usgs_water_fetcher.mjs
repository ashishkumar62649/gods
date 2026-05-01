import { runCli, runFeedList } from "./common_functions/index.mjs";
import { COMMON_FEED_OPTIONS, NO_AUTH_LIMITS, loadWatchConfig, sourceExpected } from "./config/no_auth_source_manifest.mjs";

function legacyInstantValuesUrl(waterConfig) {
  const params = new URLSearchParams({
    format: "json",
    parameterCd: (process.env.USGS_WATER_PARAMETER_CODES || waterConfig.parameterCodes.join(",")).trim(),
    siteStatus: "all",
  });

  const bbox = process.env.USGS_WATER_BBOX || waterConfig.bbox;
  if (bbox) params.set("bBox", bbox);
  else params.set("sites", process.env.USGS_WATER_SITES || waterConfig.sites.join(","));

  return `https://waterservices.usgs.gov/nwis/iv/?${params}`;
}

function buildFeeds(watchConfig) {
  return [
    {
      ...COMMON_FEED_OPTIONS,
      source: "usgs_water",
      folder: "metadata",
      dataType: "ogc_collections",
      url: process.env.USGS_WATER_OGC_COLLECTIONS_URL || "https://api.waterdata.usgs.gov/ogcapi/v0/collections?f=json",
      expected: sourceExpected("usgs_water", "USGS modern Water Data OGC collections metadata; discovers available water datasets."),
      expectedFormat: "json",
      extension: "json",
      expectedLimitBytes: NO_AUTH_LIMITS.smallJson,
      rateLimitPerMin: 30,
      timeoutMs: 15000,
    },
    {
      ...COMMON_FEED_OPTIONS,
      source: "usgs_water",
      folder: "instant_values",
      dataType: "legacy_instant_values_configured_sites",
      url: process.env.USGS_WATER_INSTANT_VALUES_URL || legacyInstantValuesUrl(watchConfig.usgsWater),
      expected: sourceExpected("usgs_water", "USGS instant water values for configured sites or bbox; captures river discharge and gauge height raw JSON."),
      expectedFormat: "json",
      extension: "json",
      expectedLimitBytes: NO_AUTH_LIMITS.mediumJson,
      rateLimitPerMin: 30,
      timeoutMs: 20000,
    },
  ];
}

export async function runUsgsWaterRawFetch() {
  return runFeedList(buildFeeds(await loadWatchConfig()));
}

runCli(import.meta.url, "usgs_water", runUsgsWaterRawFetch);

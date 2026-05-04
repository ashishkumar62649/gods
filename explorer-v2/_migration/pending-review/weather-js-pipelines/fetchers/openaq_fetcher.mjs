import { ensureDotEnvLoaded, runCli, runFeedIfCredential } from "./common_functions/index.mjs";
import { AUTH_COMMON_FEED_OPTIONS, AUTH_LIMITS, authSourceExpected, loadWatchConfig } from "./config/auth_source_manifest.mjs";

const SOURCE = "openaq";
const KEY_ENV = "OPENAQ_API_KEY";

const PARAMETER_IDS = {
  pm10: 1,
  pm25: 2,
  o3: 3,
  co: 4,
  no2: 5,
  so2: 6,
};

function authHeaders() {
  return {
    "X-API-Key": process.env[KEY_ENV],
    accept: "application/json",
  };
}

function buildBaseFeeds(limit) {
  return [
    {
      ...AUTH_COMMON_FEED_OPTIONS,
      source: SOURCE,
      folder: "metadata",
      dataType: "parameters",
      url: "https://api.openaq.org/v3/parameters?limit=100",
      expected: authSourceExpected(SOURCE, "OpenAQ parameter metadata for air-quality measurements."),
      expectedFormat: "json",
      extension: "json",
      expectedLimitBytes: AUTH_LIMITS.airQualityJson,
      headers: authHeaders(),
      rateLimitPerMin: 60,
    },
    {
      ...AUTH_COMMON_FEED_OPTIONS,
      source: SOURCE,
      folder: "locations",
      dataType: "locations_sample",
      url: `https://api.openaq.org/v3/locations?limit=${limit}`,
      expected: authSourceExpected(SOURCE, "OpenAQ location/station sample metadata."),
      expectedFormat: "json",
      extension: "json",
      expectedLimitBytes: AUTH_LIMITS.airQualityJson,
      headers: authHeaders(),
      rateLimitPerMin: 60,
    },
  ];
}

function latestParameterFeed(parameterName, limit) {
  const parameterId = PARAMETER_IDS[parameterName];
  return {
    ...AUTH_COMMON_FEED_OPTIONS,
    source: SOURCE,
    folder: "latest",
    dataType: `latest_${parameterName}`,
    url: `https://api.openaq.org/v3/parameters/${parameterId}/latest?limit=${limit}`,
    expected: authSourceExpected(SOURCE, `OpenAQ latest measurements for ${parameterName}.`),
    expectedFormat: "json",
    extension: "json",
    expectedLimitBytes: AUTH_LIMITS.airQualityJson,
    headers: authHeaders(),
    rateLimitPerMin: 60,
  };
}

async function buildFeeds() {
  await ensureDotEnvLoaded();
  const watchConfig = await loadWatchConfig();
  const limit = Number(process.env.OPENAQ_LIMIT || watchConfig.openaq.limit || 100);
  const parameters = process.env.OPENAQ_PARAMETERS
    ? process.env.OPENAQ_PARAMETERS.split(",").map((item) => item.trim().toLowerCase()).filter(Boolean)
    : watchConfig.openaq.parameters;
  return [
    ...buildBaseFeeds(limit),
    ...parameters.filter((name) => PARAMETER_IDS[name]).map((name) => latestParameterFeed(name, limit)),
  ];
}

export async function runOpenAqRawFetch() {
  const feeds = await buildFeeds();
  const results = [];
  for (const feed of feeds) {
    results.push(await runFeedIfCredential(feed, KEY_ENV));
  }
  return results;
}

runCli(import.meta.url, SOURCE, runOpenAqRawFetch);

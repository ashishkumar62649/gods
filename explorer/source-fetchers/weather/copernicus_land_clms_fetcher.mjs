import { existsSync } from "node:fs";
import { isAbsolute, join } from "node:path";
import {
  ensureDotEnvLoaded,
  EXPLORER_ROOT,
  getCopernicusLandAccessToken,
  missingCredentialResult,
  runCli,
  runFeed,
  saveFailure,
} from "./common_functions/index.mjs";
import { AUTH_COMMON_FEED_OPTIONS, AUTH_LIMITS, authSourceExpected, loadWatchConfig } from "./config/auth_source_manifest.mjs";

const SOURCE = "copernicus_land_clms";

function credentialsPath() {
  const configured = process.env.COPERNICUS_LAND_CREDENTIALS_PATH;
  if (configured) return isAbsolute(configured) ? configured : join(EXPLORER_ROOT, configured);
  return join(EXPLORER_ROOT, "..", "copernicus_land_clms.json");
}

function authFailureFeed(path) {
  return {
    ...AUTH_COMMON_FEED_OPTIONS,
    source: SOURCE,
    folder: "auth_status",
    dataType: "clms_token_exchange",
    url: "https://land.copernicus.eu/@@oauth2-token",
    endpoint: "https://land.copernicus.eu/@@oauth2-token",
    expected: authSourceExpected(SOURCE, `CLMS service credential token exchange using configured credentials path ${path}.`),
    expectedFormat: "json",
    extension: "json",
    expectedLimitBytes: AUTH_LIMITS.smallJson,
  };
}

function metadataFeed(endpoint, accessToken, apiRoot) {
  const apiBase = `${apiRoot.replace(/\/+$/, "")}/`;
  const relativePath = String(endpoint.path || "").replace(/^\/+/, "");
  const url = new URL(relativePath, apiBase).toString();
  return {
    ...AUTH_COMMON_FEED_OPTIONS,
    source: SOURCE,
    folder: "metadata",
    dataType: endpoint.id,
    url,
    expected: authSourceExpected(SOURCE, `Copernicus Land Monitoring Service metadata endpoint ${endpoint.id}.`),
    expectedFormat: endpoint.expectedFormat || "json",
    extension: endpoint.extension || "json",
    expectedLimitBytes: AUTH_LIMITS.clmsMetadataJson,
    headers: {
      authorization: `Bearer ${accessToken}`,
      accept: "application/json",
    },
    rateLimitPerMin: 20,
    timeoutMs: 30000,
  };
}

async function buildFeeds(accessToken) {
  const watchConfig = await loadWatchConfig();
  const apiRoot = process.env.COPERNICUS_LAND_API_ROOT || watchConfig.copernicusLand.apiRoot;
  return watchConfig.copernicusLand.metadataEndpoints.map((endpoint) => metadataFeed(endpoint, accessToken, apiRoot));
}

export async function runCopernicusLandClmsRawFetch() {
  await ensureDotEnvLoaded();
  const path = credentialsPath();
  const failureFeed = authFailureFeed(path);

  if (!existsSync(path)) {
    return [await missingCredentialResult(failureFeed, ["COPERNICUS_LAND_CREDENTIALS_PATH"])];
  }

  let token;
  try {
    token = await getCopernicusLandAccessToken(path);
  } catch (error) {
    return [await saveFailure(failureFeed, error, new Date(), { retryCount: 0 })];
  }

  const feeds = await buildFeeds(token.accessToken);
  const results = [];
  for (const feed of feeds) {
    results.push(await runFeed(feed));
  }
  return results;
}

runCli(import.meta.url, SOURCE, runCopernicusLandClmsRawFetch);

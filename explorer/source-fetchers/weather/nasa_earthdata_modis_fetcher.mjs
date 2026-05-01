import { ensureDotEnvLoaded, runCli, runFeedIfCredential, safeName } from "./common_functions/index.mjs";
import { AUTH_COMMON_FEED_OPTIONS, AUTH_LIMITS, authSourceExpected, loadWatchConfig } from "./config/auth_source_manifest.mjs";

const SOURCE = "nasa_earthdata_modis";

function earthdataToken() {
  return process.env.EARTHDATA_API_KEY || process.env.EARTHDATA_TOKEN;
}

function authHeaders() {
  return {
    authorization: `Bearer ${earthdataToken()}`,
    accept: "application/json",
    "Client-Id": "GODS-Explorer-RawFetcher",
  };
}

function collectionFeed(keyword, pageSize) {
  const params = new URLSearchParams({
    page_size: String(pageSize),
    keyword,
    include_granule_counts: "true",
  });
  return {
    ...AUTH_COMMON_FEED_OPTIONS,
    source: SOURCE,
    folder: "collections",
    dataType: `collections_${keyword.toLowerCase()}`,
    url: `https://cmr.earthdata.nasa.gov/search/collections.json?${params}`,
    expected: authSourceExpected(SOURCE, `NASA CMR collection metadata search for ${keyword}; no MODIS file download.`),
    expectedFormat: "json",
    extension: "json",
    expectedLimitBytes: AUTH_LIMITS.modisCatalogJson,
    headers: authHeaders(),
    rateLimitPerMin: 30,
  };
}

function granuleFeed(shortName, pageSize) {
  const params = new URLSearchParams({
    short_name: shortName,
    page_size: String(pageSize),
  });
  params.append("sort_key[]", "-start_date");
  return {
    ...AUTH_COMMON_FEED_OPTIONS,
    source: SOURCE,
    folder: "granules",
    dataType: `granules_${shortName}`,
    url: `https://cmr.earthdata.nasa.gov/search/granules.json?${params}`,
    expected: authSourceExpected(SOURCE, `NASA CMR latest granule metadata for MODIS product ${shortName}; no protected file download.`),
    expectedFormat: "json",
    extension: "json",
    expectedLimitBytes: AUTH_LIMITS.modisCatalogJson,
    headers: authHeaders(),
    rateLimitPerMin: 30,
  };
}

async function discoverProtectedDataLink(shortName) {
  const params = new URLSearchParams({
    short_name: shortName,
    page_size: "1",
  });
  params.append("sort_key[]", "-start_date");

  try {
    const response = await fetch(`https://cmr.earthdata.nasa.gov/search/granules.json?${params}`, {
      headers: authHeaders(),
    });
    if (!response.ok) return null;
    const payload = await response.json();
    const links = payload?.feed?.entry?.[0]?.links || [];
    return links.find((link) => (
      /^https?:\/\//i.test(link.href || "")
      && /\/data#/i.test(link.rel || "")
      && /\.(hdf|h5|nc|tif|tiff)(\?|$)/i.test(link.href)
    ))?.href || null;
  } catch {
    return null;
  }
}

async function granuleByteSampleFeed(shortName) {
  const url = process.env[`EARTHDATA_MODIS_${shortName}_SAMPLE_URL`] || await discoverProtectedDataLink(shortName);
  if (!url) return null;
  const sampleLimitBytes = Number(process.env.EARTHDATA_MODIS_SAMPLE_LIMIT_BYTES || 512 * 1024);
  return {
    ...AUTH_COMMON_FEED_OPTIONS,
    source: SOURCE,
    folder: "granule_samples",
    dataType: `sample_${safeName(shortName)}_${safeName(url.split("/").pop() || "granule")}`,
    url,
    expected: authSourceExpected(SOURCE, `NASA Earthdata/MODIS protected granule byte-range sample for ${shortName}; proves file access without storing the full HDF/NetCDF payload.`),
    expectedFormat: "hdf",
    extension: "hdf",
    expectedLimitBytes: sampleLimitBytes,
    headers: {
      ...authHeaders(),
      range: `bytes=0-${sampleLimitBytes - 1}`,
    },
    rateLimitPerMin: 30,
    timeoutMs: 30000,
  };
}

async function buildFeeds() {
  await ensureDotEnvLoaded();
  const watchConfig = await loadWatchConfig();
  const modis = watchConfig.earthdataModis;
  const pageSize = Number(process.env.EARTHDATA_MODIS_PAGE_SIZE || modis.pageSize || 3);
  const shortNames = process.env.EARTHDATA_MODIS_SHORT_NAMES
    ? process.env.EARTHDATA_MODIS_SHORT_NAMES.split(",").map((item) => item.trim()).filter(Boolean)
    : modis.collectionShortNames;
  const feeds = [
    collectionFeed(process.env.EARTHDATA_MODIS_COLLECTION_KEYWORD || modis.collectionKeyword, pageSize),
    ...shortNames.map((shortName) => granuleFeed(shortName, pageSize)),
  ];
  for (const shortName of shortNames) {
    const sampleFeed = await granuleByteSampleFeed(shortName);
    if (sampleFeed) feeds.push(sampleFeed);
  }
  return feeds;
}

export async function runNasaEarthdataModisRawFetch() {
  const feeds = await buildFeeds();
  const results = [];
  for (const feed of feeds) {
    results.push(await runFeedIfCredential(feed, ["EARTHDATA_API_KEY", "EARTHDATA_TOKEN"]));
  }
  return results;
}

runCli(import.meta.url, SOURCE, runNasaEarthdataModisRawFetch);

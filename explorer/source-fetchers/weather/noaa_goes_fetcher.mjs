import { runCli, runFeedList } from "./common_functions/index.mjs";
import { COMMON_FEED_OPTIONS, NO_AUTH_LIMITS, loadWatchConfig, sourceExpected } from "./config/no_auth_source_manifest.mjs";

function dayOfYear(date) {
  const start = Date.UTC(date.getUTCFullYear(), 0, 1);
  const current = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  return String(Math.floor((current - start) / 86_400_000) + 1).padStart(3, "0");
}

async function discoverRecentNetcdfKey(base, productPrefix) {
  const configured = process.env.NOAA_GOES_NETCDF_SAMPLE_KEY;
  if (configured) return configured.replace(/^\/+/, "");

  for (const hoursAgo of [1, 2, 3, 4, 6, 12]) {
    const date = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);
    const y = date.getUTCFullYear();
    const ddd = dayOfYear(date);
    const hh = String(date.getUTCHours()).padStart(2, "0");
    const prefix = `${productPrefix}${y}/${ddd}/${hh}/`;
    const url = `${base}?list-type=2&prefix=${encodeURIComponent(prefix).replaceAll("%2F", "/")}&max-keys=5`;
    try {
      const response = await fetch(url, { headers: { "user-agent": "GODS-Explorer-RawFetcher/0.1" } });
      if (!response.ok) continue;
      const xml = await response.text();
      const key = xml.match(/<Key>([^<]+\.nc)<\/Key>/)?.[1];
      if (key) return key;
    } catch {
      // Discovery is best effort; the saved listing feeds still capture source health.
    }
  }
  return null;
}

async function buildFeeds(watchConfig) {
  const bucket = process.env.NOAA_GOES_BUCKET || watchConfig.goes.bucket;
  const productPrefix = process.env.NOAA_GOES_PRODUCT_PREFIX || watchConfig.goes.productPrefix;
  const base = `https://${bucket}.s3.amazonaws.com/`;
  const sampleLimitBytes = Number(process.env.NOAA_GOES_NETCDF_SAMPLE_LIMIT_BYTES || 512 * 1024);
  const sampleKey = await discoverRecentNetcdfKey(base, productPrefix);

  const feeds = [
    {
      ...COMMON_FEED_OPTIONS,
      source: "noaa_goes",
      folder: "bucket_listing",
      dataType: `${bucket}_root_listing`,
      url: process.env.NOAA_GOES_ROOT_LISTING_URL || `${base}?list-type=2&max-keys=25`,
      expected: sourceExpected("noaa_goes", "NOAA GOES public S3 root listing; proves no-auth object-store access."),
      expectedFormat: "xml",
      extension: "xml",
      expectedLimitBytes: NO_AUTH_LIMITS.indexSample,
      rateLimitPerMin: 20,
      timeoutMs: 20000,
    },
    {
      ...COMMON_FEED_OPTIONS,
      source: "noaa_goes",
      folder: "product_listing",
      dataType: `${bucket}_${productPrefix.replaceAll("/", "_")}listing`,
      url: process.env.NOAA_GOES_PRODUCT_LISTING_URL || `${base}?list-type=2&prefix=${productPrefix}&max-keys=50`,
      expected: sourceExpected("noaa_goes", "NOAA GOES product-prefix listing only; v1 avoids large NetCDF downloads."),
      expectedFormat: "xml",
      extension: "xml",
      expectedLimitBytes: NO_AUTH_LIMITS.indexSample,
      rateLimitPerMin: 20,
      timeoutMs: 20000,
    },
  ];

  if (sampleKey) {
    feeds.push({
      ...COMMON_FEED_OPTIONS,
      source: "noaa_goes",
      folder: "netcdf_samples",
      dataType: `${bucket}_${sampleKey.split("/").pop().replace(/\.nc$/i, "")}_byte_sample`,
      url: process.env.NOAA_GOES_NETCDF_SAMPLE_URL || `${base}${sampleKey}`,
      expected: sourceExpected("noaa_goes", "NOAA GOES NetCDF byte-range sample from a real ABI product; proves data access without storing the full NetCDF file."),
      expectedFormat: "netcdf",
      extension: "nc",
      expectedLimitBytes: sampleLimitBytes,
      headers: {
        range: `bytes=0-${sampleLimitBytes - 1}`,
      },
      rateLimitPerMin: 20,
      timeoutMs: 20000,
    });
  }

  return feeds;
}

export async function runNoaaGoesRawFetch() {
  return runFeedList(await buildFeeds(await loadWatchConfig()));
}

runCli(import.meta.url, "noaa_goes", runNoaaGoesRawFetch);

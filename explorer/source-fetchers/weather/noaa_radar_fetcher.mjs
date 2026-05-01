import { runCli, runFeedList } from "./common_functions/index.mjs";
import { COMMON_FEED_OPTIONS, NO_AUTH_LIMITS, sourceExpected } from "./config/no_auth_source_manifest.mjs";

const SOURCE = "noaa_radar";

const OPTIONS = {
  ...COMMON_FEED_OPTIONS,
  source: SOURCE,
  rateLimitPerMin: 20,
  timeoutMs: 30000,
};

function ymd(date) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}/${m}/${d}`;
}

async function discoverNexradKey() {
  const configured = process.env.NEXRAD_LEVEL2_SAMPLE_KEY;
  if (configured) return configured.replace(/^\/+/, "");
  const station = process.env.NEXRAD_LEVEL2_STATION || "KOKX";
  for (const daysAgo of [0, 1, 2]) {
    const date = new Date(Date.now() - daysAgo * 86_400_000);
    const prefix = `${ymd(date)}/${station}/`;
    const url = `https://unidata-nexrad-level2.s3.amazonaws.com/?list-type=2&prefix=${prefix}&max-keys=5`;
    try {
      const response = await fetch(url, { headers: { "user-agent": "GODS-Explorer-RawFetcher/0.1" } });
      if (!response.ok) continue;
      const xml = await response.text();
      const key = xml.match(/<Key>([^<]+)<\/Key>/)?.[1];
      if (key) return key;
    } catch {
      // Best-effort discovery; listing feeds still capture source status.
    }
  }
  return null;
}

async function discoverMrmsKey() {
  const configured = process.env.MRMS_SAMPLE_KEY;
  if (configured) return configured.replace(/^\/+/, "");
  const url = "https://noaa-mrms-pds.s3.amazonaws.com/?list-type=2&max-keys=20";
  try {
    const response = await fetch(url, { headers: { "user-agent": "GODS-Explorer-RawFetcher/0.1" } });
    if (!response.ok) return null;
    const xml = await response.text();
    return xml.match(/<Key>([^<]+\.grib2\.gz)<\/Key>/)?.[1] || null;
  } catch {
    return null;
  }
}

async function buildFeeds() {
  const nexradStation = process.env.NEXRAD_LEVEL2_STATION || "KOKX";
  const nexradPrefix = `${ymd(new Date())}/${nexradStation}/`;
  const sampleLimitBytes = Number(process.env.RADAR_SAMPLE_LIMIT_BYTES || 512 * 1024);
  const nexradKey = await discoverNexradKey();
  const mrmsKey = await discoverMrmsKey();

  const feeds = [
    {
      ...OPTIONS,
      folder: "nexrad_level2_listing",
      dataType: `${nexradStation}_listing`,
      url: process.env.NEXRAD_LEVEL2_LISTING_URL || `https://unidata-nexrad-level2.s3.amazonaws.com/?list-type=2&prefix=${nexradPrefix}&max-keys=10`,
      expected: sourceExpected("noaa_nws", "NEXRAD Level II public object listing through Unidata mirror; covers radar reflectivity/velocity product availability."),
      expectedFormat: "xml",
      extension: "xml",
      expectedLimitBytes: NO_AUTH_LIMITS.indexSample,
    },
    {
      ...OPTIONS,
      folder: "mrms_listing",
      dataType: "mrms_root_listing",
      url: process.env.MRMS_ROOT_LISTING_URL || "https://noaa-mrms-pds.s3.amazonaws.com/?list-type=2&max-keys=20",
      expected: sourceExpected("noaa_nws", "NOAA MRMS public object listing; covers radar-derived precipitation/severe-weather product availability."),
      expectedFormat: "xml",
      extension: "xml",
      expectedLimitBytes: NO_AUTH_LIMITS.indexSample,
    },
  ];

  if (nexradKey) {
    feeds.push({
      ...OPTIONS,
      folder: "nexrad_level2_samples",
      dataType: `${nexradStation}_level2_byte_sample`,
      url: process.env.NEXRAD_LEVEL2_SAMPLE_URL || `https://unidata-nexrad-level2.s3.amazonaws.com/${nexradKey}`,
      expected: sourceExpected("noaa_nws", "NEXRAD Level II byte-range sample from a real radar volume file; proves radar payload access without full archive download."),
      expectedFormat: "nexrad_level2",
      extension: "bin",
      expectedLimitBytes: sampleLimitBytes,
      headers: { range: `bytes=0-${sampleLimitBytes - 1}` },
    });
  }

  if (mrmsKey) {
    feeds.push({
      ...OPTIONS,
      folder: "mrms_samples",
      dataType: "mrms_grib2_gz_byte_sample",
      url: process.env.MRMS_SAMPLE_URL || `https://noaa-mrms-pds.s3.amazonaws.com/${mrmsKey}`,
      expected: sourceExpected("noaa_nws", "NOAA MRMS GRIB2.GZ byte-range sample from a real radar-derived product."),
      expectedFormat: "grib2",
      extension: "grib2.gz",
      expectedLimitBytes: sampleLimitBytes,
      headers: { range: `bytes=0-${sampleLimitBytes - 1}` },
    });
  }

  return feeds;
}

export async function runNoaaRadarRawFetch() {
  return runFeedList(await buildFeeds());
}

runCli(import.meta.url, SOURCE, runNoaaRadarRawFetch);

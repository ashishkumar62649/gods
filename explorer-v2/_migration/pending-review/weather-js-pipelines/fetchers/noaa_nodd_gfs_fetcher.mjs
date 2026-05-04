import { runCli, runFeedList } from "./common_functions/index.mjs";
import { COMMON_FEED_OPTIONS, NO_AUTH_LIMITS, sourceExpected } from "./config/no_auth_source_manifest.mjs";

function gfsCycleParts(now = new Date()) {
  const safeDate = new Date(now.getTime() - 8 * 60 * 60 * 1000);
  const y = safeDate.getUTCFullYear();
  const m = String(safeDate.getUTCMonth() + 1).padStart(2, "0");
  const d = String(safeDate.getUTCDate()).padStart(2, "0");
  const cycle = Math.floor(safeDate.getUTCHours() / 6) * 6;
  return { yyyymmdd: `${y}${m}${d}`, hh: String(cycle).padStart(2, "0") };
}

function buildFeeds() {
  const { yyyymmdd, hh } = gfsCycleParts();
  const prefix = `gfs.${yyyymmdd}/${hh}/atmos/`;
  const base = "https://noaa-gfs-bdp-pds.s3.amazonaws.com/";

  return [
    {
      ...COMMON_FEED_OPTIONS,
      source: "noaa_nodd_gfs",
      folder: "bucket_listing",
      dataType: "gfs_root_listing",
      url: process.env.NOAA_GFS_ROOT_LISTING_URL || `${base}?list-type=2&max-keys=25`,
      expected: sourceExpected("noaa_nodd_gfs", "NOAA GFS public S3 root listing; proves no-auth NODD access without downloading GRIB2."),
      expectedFormat: "xml",
      extension: "xml",
      expectedLimitBytes: NO_AUTH_LIMITS.indexSample,
      rateLimitPerMin: 20,
    },
    {
      ...COMMON_FEED_OPTIONS,
      source: "noaa_nodd_gfs",
      folder: "cycle_listing",
      dataType: `gfs_cycle_${yyyymmdd}_${hh}`,
      url: process.env.NOAA_GFS_CYCLE_LISTING_URL || `${base}?list-type=2&prefix=${prefix}&max-keys=50`,
      expected: sourceExpected("noaa_nodd_gfs", "NOAA GFS current-safe cycle listing; captures available model files without downloading them."),
      expectedFormat: "xml",
      extension: "xml",
      expectedLimitBytes: NO_AUTH_LIMITS.indexSample,
      rateLimitPerMin: 20,
    },
    {
      ...COMMON_FEED_OPTIONS,
      source: "noaa_nodd_gfs",
      folder: "idx",
      dataType: `gfs_pgrb2_idx_${yyyymmdd}_${hh}_f000`,
      url: process.env.NOAA_GFS_IDX_URL || `${base}${prefix}gfs.t${hh}z.pgrb2.0p25.f000.idx`,
      expected: sourceExpected("noaa_nodd_gfs", "NOAA GFS GRIB2 index file for variable inventory and byte ranges; not the full GRIB2 payload."),
      expectedFormat: "text",
      extension: "idx",
      expectedLimitBytes: NO_AUTH_LIMITS.tinyText,
      rateLimitPerMin: 20,
    },
    {
      ...COMMON_FEED_OPTIONS,
      source: "noaa_nodd_gfs",
      folder: "grib2_samples",
      dataType: `gfs_pgrb2_byte_sample_${yyyymmdd}_${hh}_f000`,
      url: process.env.NOAA_GFS_GRIB2_SAMPLE_URL || `${base}${prefix}gfs.t${hh}z.pgrb2.0p25.f000`,
      expected: sourceExpected("noaa_nodd_gfs", "NOAA GFS GRIB2 byte-range sample from the real model file; proves data access without storing the full multi-hundred-MB GRIB2 payload."),
      expectedFormat: "grib2",
      extension: "grib2",
      expectedLimitBytes: Number(process.env.NOAA_GFS_GRIB2_SAMPLE_LIMIT_BYTES || 512 * 1024),
      headers: {
        range: `bytes=0-${Number(process.env.NOAA_GFS_GRIB2_SAMPLE_LIMIT_BYTES || 512 * 1024) - 1}`,
      },
      rateLimitPerMin: 20,
      timeoutMs: 20000,
    },
  ];
}

export async function runNoaaNoddGfsRawFetch() {
  return runFeedList(buildFeeds());
}

runCli(import.meta.url, "noaa_nodd_gfs", runNoaaNoddGfsRawFetch);

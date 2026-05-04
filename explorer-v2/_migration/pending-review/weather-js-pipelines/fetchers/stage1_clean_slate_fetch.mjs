import { mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  ensureDotEnvLoaded,
  EXPLORER_ROOT,
  FETCH_LOG_PATH,
  RAW_ROOT,
} from "./common_functions/index.mjs";
import {
  WEATHER_PARAMETER_COVERAGE,
  validateWeatherParameterCoverage,
} from "./config/weather_parameter_coverage.mjs";
import { runClimateAirReferenceRawFetch } from "./climate_air_reference_fetcher.mjs";
import { runCopernicusLandClmsRawFetch } from "./copernicus_land_clms_fetcher.mjs";
import { runGdacsRawFetch } from "./gdacs_fetcher.mjs";
import { runNasaEarthdataModisRawFetch } from "./nasa_earthdata_modis_fetcher.mjs";
import { runNasaFirmsRawFetch } from "./nasa_firms_fetcher.mjs";
import { runNasaGibsRawFetch } from "./nasa_gibs_fetcher.mjs";
import { runNoaaDartRawFetch } from "./noaa_dart_fetcher.mjs";
import { runNoaaGoesRawFetch } from "./noaa_goes_fetcher.mjs";
import { runNoaaNoddGfsRawFetch } from "./noaa_nodd_gfs_fetcher.mjs";
import { runNoaaNwpsRawFetch } from "./noaa_nwps_fetcher.mjs";
import { runNoaaNwsRawFetch } from "./noaa_nws_fetcher.mjs";
import { runOpenAqRawFetch } from "./openaq_fetcher.mjs";
import { runOpenMeteoRawFetch } from "./open_meteo_fetcher.mjs";
import { runSmithsonianGvpRawFetch } from "./smithsonian_gvp_fetcher.mjs";
import { runUsgsEarthquakeRawFetch } from "./usgs_earthquake_fetcher.mjs";
import { runUsgsVolcanoRawFetch } from "./usgs_volcano_fetcher.mjs";
import { runUsgsWaterRawFetch } from "./usgs_water_fetcher.mjs";
import { runWorldPopRawFetch } from "./worldpop_fetcher.mjs";

const NORMALIZED_WEATHER_ROOT = join(EXPLORER_ROOT, "data_normalized", "weather");
const PROCESSED_WEATHER_ROOT = join(EXPLORER_ROOT, "data_processed", "weather");
const REPORT_ROOT = join(RAW_ROOT, "_reports");
const STAGE1_RUN_LOG = join(REPORT_ROOT, "stage1_run_log.jsonl");
const SOURCE_HEALTH_REPORT = join(REPORT_ROOT, "stage1_source_health.json");
const SOURCE_HEALTH_MARKDOWN = join(REPORT_ROOT, "stage1_source_health.md");
const COVERAGE_REPORT = join(REPORT_ROOT, "stage1_weather_parameter_coverage.json");
const VALIDATION_REPORT = join(REPORT_ROOT, "stage1_validation.json");

export const CANONICAL_SOURCES = [
  {
    canonicalId: "open_meteo",
    sourceName: "Open-Meteo",
    tier: 2,
    cadence: "hourly",
    fetcherFile: "open_meteo_fetcher.mjs",
    rawSourceIds: ["open_meteo"],
    expectedMode: "raw_sample",
    run: runOpenMeteoRawFetch,
  },
  {
    canonicalId: "noaa_nws",
    sourceName: "NOAA/NWS API",
    tier: 1,
    cadence: "5-15 minutes",
    fetcherFile: "noaa_nws_fetcher.mjs",
    rawSourceIds: ["noaa_nws"],
    expectedMode: "raw_sample",
    run: runNoaaNwsRawFetch,
  },
  {
    canonicalId: "noaa_ncei",
    sourceName: "NOAA NCEI CDO / Access Services",
    tier: 3,
    cadence: "6-7 hours",
    fetcherFile: "climate_air_reference_fetcher.mjs",
    rawSourceIds: ["climate_air_reference"],
    expectedMode: "raw_sample",
    run: () => runClimateAirReferenceRawFetch({ dataTypes: ["daily_summaries_san_francisco"] }),
    notes: "Uses a small public NCEI access-services sample; tokenized CDO expansion can come later.",
  },
  {
    canonicalId: "noaa_nodd_gfs",
    sourceName: "NOAA NODD/GFS",
    tier: 2,
    cadence: "hourly",
    fetcherFile: "noaa_nodd_gfs_fetcher.mjs",
    rawSourceIds: ["noaa_nodd_gfs"],
    expectedMode: "raw_sample",
    run: runNoaaNoddGfsRawFetch,
  },
  {
    canonicalId: "nasa_gibs",
    sourceName: "NASA GIBS/Worldview",
    tier: 2,
    cadence: "hourly",
    fetcherFile: "nasa_gibs_fetcher.mjs",
    rawSourceIds: ["nasa_gibs"],
    expectedMode: "raw_sample",
    run: runNasaGibsRawFetch,
  },
  {
    canonicalId: "noaa_goes",
    sourceName: "NOAA GOES",
    tier: 2,
    cadence: "hourly",
    fetcherFile: "noaa_goes_fetcher.mjs",
    rawSourceIds: ["noaa_goes"],
    expectedMode: "raw_sample",
    run: runNoaaGoesRawFetch,
  },
  {
    canonicalId: "nasa_firms",
    sourceName: "NASA FIRMS",
    tier: 1,
    cadence: "5-15 minutes",
    fetcherFile: "nasa_firms_fetcher.mjs",
    rawSourceIds: ["nasa_firms"],
    expectedMode: "raw_sample",
    credentialEnv: ["NASA_FIRMS_MAP_KEY"],
    run: runNasaFirmsRawFetch,
  },
  {
    canonicalId: "usgs_earthquake",
    sourceName: "USGS Earthquake",
    tier: 1,
    cadence: "5-15 minutes",
    fetcherFile: "usgs_earthquake_fetcher.mjs",
    rawSourceIds: ["usgs_earthquake"],
    expectedMode: "raw_sample",
    run: runUsgsEarthquakeRawFetch,
  },
  {
    canonicalId: "usgs_water",
    sourceName: "USGS Water",
    tier: 2,
    cadence: "hourly",
    fetcherFile: "usgs_water_fetcher.mjs",
    rawSourceIds: ["usgs_water"],
    expectedMode: "raw_sample",
    run: runUsgsWaterRawFetch,
  },
  {
    canonicalId: "noaa_nwps",
    sourceName: "NOAA NWPS/NWM",
    tier: 2,
    cadence: "hourly",
    fetcherFile: "noaa_nwps_fetcher.mjs",
    rawSourceIds: ["noaa_nwps"],
    expectedMode: "raw_sample",
    run: runNoaaNwpsRawFetch,
  },
  {
    canonicalId: "noaa_dart",
    sourceName: "NOAA DART/NDBC",
    tier: 1,
    cadence: "5-15 minutes",
    fetcherFile: "noaa_dart_fetcher.mjs",
    rawSourceIds: ["noaa_dart"],
    expectedMode: "raw_sample",
    run: runNoaaDartRawFetch,
  },
  {
    canonicalId: "copernicus_era5_cds",
    sourceName: "Copernicus ERA5/CDS",
    tier: 3,
    cadence: "6-7 hours",
    fetcherFile: "climate_air_reference_fetcher.mjs",
    rawSourceIds: ["climate_air_reference"],
    expectedMode: "catalog_only",
    run: () => runClimateAirReferenceRawFetch({ dataTypes: ["cds_processes"] }),
  },
  {
    canonicalId: "copernicus_cams",
    sourceName: "Copernicus CAMS",
    tier: 3,
    cadence: "6-7 hours",
    fetcherFile: "climate_air_reference_fetcher.mjs",
    rawSourceIds: ["climate_air_reference"],
    expectedMode: "catalog_only",
    run: () => runClimateAirReferenceRawFetch({ dataTypes: ["ads_processes"] }),
  },
  {
    canonicalId: "openaq",
    sourceName: "OpenAQ",
    tier: 2,
    cadence: "hourly",
    fetcherFile: "openaq_fetcher.mjs",
    rawSourceIds: ["openaq"],
    expectedMode: "raw_sample",
    credentialEnv: ["OPENAQ_API_KEY"],
    run: runOpenAqRawFetch,
  },
  {
    canonicalId: "copernicus_land_clms",
    sourceName: "Copernicus Land/CLMS",
    tier: 3,
    cadence: "6-7 hours",
    fetcherFile: "copernicus_land_clms_fetcher.mjs",
    rawSourceIds: ["copernicus_land_clms"],
    expectedMode: "catalog_only",
    credentialEnv: ["COPERNICUS_LAND_CREDENTIALS_PATH"],
    run: runCopernicusLandClmsRawFetch,
  },
  {
    canonicalId: "nasa_earthdata_modis",
    sourceName: "NASA MODIS/Earthdata",
    tier: 3,
    cadence: "6-7 hours",
    fetcherFile: "nasa_earthdata_modis_fetcher.mjs",
    rawSourceIds: ["nasa_earthdata_modis"],
    expectedMode: "catalog_only",
    credentialEnv: ["EARTHDATA_API_KEY", "EARTHDATA_TOKEN"],
    run: runNasaEarthdataModisRawFetch,
  },
  {
    canonicalId: "smithsonian_gvp",
    sourceName: "Smithsonian GVP",
    tier: 4,
    cadence: "weekly",
    fetcherFile: "smithsonian_gvp_fetcher.mjs",
    rawSourceIds: ["smithsonian_gvp"],
    expectedMode: "raw_sample",
    run: runSmithsonianGvpRawFetch,
  },
  {
    canonicalId: "usgs_volcano",
    sourceName: "USGS Volcano Hazards",
    tier: 1,
    cadence: "5-15 minutes",
    fetcherFile: "usgs_volcano_fetcher.mjs",
    rawSourceIds: ["usgs_volcano"],
    expectedMode: "raw_sample",
    run: runUsgsVolcanoRawFetch,
  },
  {
    canonicalId: "gdacs",
    sourceName: "GDACS",
    tier: 1,
    cadence: "5-15 minutes",
    fetcherFile: "gdacs_fetcher.mjs",
    rawSourceIds: ["gdacs"],
    expectedMode: "raw_sample",
    run: runGdacsRawFetch,
  },
  {
    canonicalId: "copernicus_ems_glofas",
    sourceName: "Copernicus EMS/GloFAS",
    tier: 4,
    cadence: "weekly",
    fetcherFile: "climate_air_reference_fetcher.mjs",
    rawSourceIds: ["climate_air_reference"],
    expectedMode: "catalog_only",
    run: () => runClimateAirReferenceRawFetch({ dataTypes: ["ewds_processes"] }),
  },
  {
    canonicalId: "worldpop",
    sourceName: "WorldPop",
    tier: 4,
    cadence: "weekly metadata; 6 months-yearly rasters",
    fetcherFile: "worldpop_fetcher.mjs",
    rawSourceIds: ["worldpop"],
    expectedMode: "catalog_only",
    run: runWorldPopRawFetch,
  },
];

function assertGeneratedWeatherPath(path) {
  const root = resolve(path);
  const explorer = resolve(EXPLORER_ROOT);
  if (!root.startsWith(`${explorer}\\`) && !root.startsWith(`${explorer}/`)) {
    throw new Error(`Refusing to clean outside explorer root: ${root}`);
  }
  if (basename(root) !== "weather") {
    throw new Error(`Refusing to clean non-weather directory: ${root}`);
  }
  return root;
}

async function cleanDirectory(path) {
  const root = assertGeneratedWeatherPath(path);
  await rm(root, { recursive: true, force: true });
  await mkdir(root, { recursive: true });
  return root;
}

async function appendJsonl(path, value) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value)}\n`, { flag: "a" });
}

function countStatuses(results) {
  const counts = {};
  for (const result of results || []) {
    const status = result?.status || "unknown";
    counts[status] = (counts[status] || 0) + 1;
  }
  return counts;
}

function hasAnyCredential(entry) {
  if (!entry.credentialEnv?.length) return true;
  return entry.credentialEnv.some((name) => Boolean(process.env[name]));
}

function isMissingCredential(result) {
  return result?.errorName === "MissingCredentialError"
    || /Missing required credential/i.test(result?.errorMessage || "");
}

function classifySource(entry, results) {
  const statuses = countStatuses(results);
  const successLike = (statuses.success || 0) + (statuses.duplicate || 0);
  const failures = (statuses.failed || 0) + (statuses.http_error || 0) + (statuses.config_error || 0);
  if (entry.credentialEnv?.length && !hasAnyCredential(entry) && results.every(isMissingCredential)) {
    return "credential_required";
  }
  if (successLike > 0 && entry.expectedMode === "catalog_only") return "catalog_only";
  if (successLike > 0 && failures > 0) return "partial";
  if (successLike > 0) return "working";
  return "broken_feed";
}

function compactResult(result) {
  return {
    source: result?.source || null,
    folder: result?.folder || null,
    dataType: result?.dataType || null,
    status: result?.status || "unknown",
    httpStatus: result?.httpStatus || null,
    fetchedAt: result?.fetchedAt || null,
    rawFilePath: result?.rawFilePath || result?.existingFilePath || null,
    metadataPath: result?.metadataPath || null,
    checksumSha256: result?.checksumSha256 || null,
    errorName: result?.errorName || null,
    errorMessage: result?.errorMessage || null,
  };
}

function summarizeSource(entry, results, startedAt, finishedAt) {
  const counts = countStatuses(results);
  const latest = [...results]
    .filter((result) => result?.fetchedAt)
    .sort((a, b) => Date.parse(b.fetchedAt) - Date.parse(a.fetchedAt))[0] || null;
  const successLike = (counts.success || 0) + (counts.duplicate || 0);
  return {
    canonicalId: entry.canonicalId,
    sourceName: entry.sourceName,
    tier: entry.tier,
    cadence: entry.cadence,
    fetcherFile: entry.fetcherFile,
    rawSourceIds: entry.rawSourceIds,
    rawFolders: entry.rawSourceIds.map((sourceId) => join("explorer", "data_raw", "weather", sourceId)),
    expectedMode: entry.expectedMode,
    credentialEnv: entry.credentialEnv || [],
    credentialPresent: hasAnyCredential(entry),
    operationalStatus: classifySource(entry, results),
    attemptedFeeds: results.length,
    successLikeCount: successLike,
    statusCounts: counts,
    latestStatus: latest?.status || null,
    latestFetchedAt: latest?.fetchedAt || null,
    startedAt,
    finishedAt,
    notes: entry.notes || null,
    results: results.map(compactResult),
  };
}

async function listFiles(root) {
  if (!existsSync(root)) return [];
  const output = [];
  async function walk(path) {
    for (const item of await readdir(path, { withFileTypes: true })) {
      const fullPath = join(path, item.name);
      if (item.isDirectory()) await walk(fullPath);
      else output.push(fullPath);
    }
  }
  await walk(root);
  return output;
}

async function validateSuccessfulRawFiles() {
  const files = await listFiles(RAW_ROOT);
  const rawFiles = files.filter((path) => (
    !path.includes(`${REPORT_ROOT}`)
    && !path.endsWith(".metadata.json")
    && !path.endsWith("fetch_log.jsonl")
  ));
  const missingMetadata = [];
  const missingChecksum = [];
  for (const rawFilePath of rawFiles) {
    const metadataPath = `${rawFilePath}.metadata.json`;
    if (!existsSync(metadataPath)) {
      missingMetadata.push(rawFilePath);
      continue;
    }
    try {
      const metadata = JSON.parse(await readFile(metadataPath, "utf8"));
      if (metadata.status === "success" && !metadata.checksumSha256) missingChecksum.push(rawFilePath);
    } catch {
      missingChecksum.push(rawFilePath);
    }
  }
  return {
    rawFileCount: rawFiles.length,
    missingMetadata,
    missingChecksum,
    ok: missingMetadata.length === 0 && missingChecksum.length === 0,
  };
}

function buildHealthMap(sourceReports) {
  const byFetcher = new Map();
  const byRawSource = new Map();
  for (const report of sourceReports) {
    byFetcher.set(report.canonicalId, report);
    for (const rawSourceId of report.rawSourceIds) {
      if (!byRawSource.has(rawSourceId)) byRawSource.set(rawSourceId, []);
      byRawSource.get(rawSourceId).push(report);
    }
  }
  return { byFetcher, byRawSource };
}

function findSourceHealth(entry, healthMaps) {
  if (entry.fetcherId && healthMaps.byFetcher.has(entry.fetcherId)) {
    return healthMaps.byFetcher.get(entry.fetcherId);
  }
  if (entry.fetcherId && healthMaps.byRawSource.has(entry.fetcherId)) {
    return healthMaps.byRawSource.get(entry.fetcherId)[0];
  }
  return null;
}

function freshParameterStatus(entry, health) {
  if (entry.status === "missing_source") return "missing_source";
  if (entry.status === "derived_later") return "derived_later";
  if (entry.status === "catalog_only") return "catalog_only";
  if (!entry.fetcherId) return entry.status;
  if (!health) return "partial";
  if (health.operationalStatus === "working" || health.operationalStatus === "partial") {
    return entry.status === "raw_sample" ? "raw_sample" : entry.status;
  }
  if (health.operationalStatus === "catalog_only") return "catalog_only";
  return "partial";
}

function buildCoverageReport(sourceReports) {
  const healthMaps = buildHealthMap(sourceReports);
  const entries = WEATHER_PARAMETER_COVERAGE.map((entry) => {
    const health = findSourceHealth(entry, healthMaps);
    const status = freshParameterStatus(entry, health);
    return {
      ...entry,
      status,
      sourceOperationalStatus: health?.operationalStatus || null,
      sourceHealthCanonicalId: health?.canonicalId || null,
      sourceHealthLatestFetchedAt: health?.latestFetchedAt || null,
    };
  });
  return {
    generatedAt: new Date().toISOString(),
    validation: validateWeatherParameterCoverage(entries),
    entries,
  };
}

function markdownHealth(sourceReports) {
  const rows = sourceReports.map((report) => (
    `| ${report.tier} | ${report.sourceName} | ${report.operationalStatus} | ${report.attemptedFeeds} | ${report.statusCounts.success || 0} | ${report.statusCounts.duplicate || 0} | ${report.statusCounts.failed || 0} | ${report.statusCounts.http_error || 0} | ${report.fetcherFile} |`
  ));
  return [
    "# Stage 1 Source Health",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "| Tier | Source | Status | Feeds | Success | Duplicate | Failed | HTTP Error | Fetcher |",
    "| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | --- |",
    ...rows,
    "",
  ].join("\n");
}

async function writeReports(sourceReports, validation = null) {
  await mkdir(REPORT_ROOT, { recursive: true });
  const coverage = buildCoverageReport(sourceReports);
  const payload = {
    generatedAt: new Date().toISOString(),
    canonicalSourceCount: CANONICAL_SOURCES.length,
    sourceReports,
  };
  await writeFile(SOURCE_HEALTH_REPORT, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  await writeFile(SOURCE_HEALTH_MARKDOWN, markdownHealth(sourceReports), "utf8");
  await writeFile(COVERAGE_REPORT, `${JSON.stringify(coverage, null, 2)}\n`, "utf8");
  if (validation) await writeFile(VALIDATION_REPORT, `${JSON.stringify(validation, null, 2)}\n`, "utf8");
}

export async function cleanGeneratedWeatherData() {
  return {
    rawRoot: await cleanDirectory(RAW_ROOT),
    normalizedRoot: await cleanDirectory(NORMALIZED_WEATHER_ROOT),
    processedRoot: await cleanDirectory(PROCESSED_WEATHER_ROOT),
  };
}

export async function runStage1CanonicalFetches() {
  await ensureDotEnvLoaded();
  await mkdir(REPORT_ROOT, { recursive: true });
  const sourceReports = [];
  for (const entry of CANONICAL_SOURCES) {
    const startedAt = new Date().toISOString();
    console.log(`[stage1] fetching ${entry.sourceName} (${entry.canonicalId})`);
    let results = [];
    try {
      results = await entry.run();
    } catch (error) {
      results = [{
        source: entry.rawSourceIds[0],
        dataType: entry.canonicalId,
        status: "failed",
        fetchedAt: new Date().toISOString(),
        errorName: error?.name || "Error",
        errorMessage: error?.message || String(error),
      }];
    }
    const finishedAt = new Date().toISOString();
    const report = summarizeSource(entry, results, startedAt, finishedAt);
    sourceReports.push(report);
    await appendJsonl(STAGE1_RUN_LOG, report);
    await writeReports(sourceReports);
    console.log(`[stage1] ${entry.sourceName}: ${report.operationalStatus}`);
  }
  const validation = {
    generatedAt: new Date().toISOString(),
    successfulRawFiles: await validateSuccessfulRawFiles(),
    sourceCountOk: sourceReports.length === 21,
    fetchLogExists: existsSync(FETCH_LOG_PATH),
    fetchLogPath: FETCH_LOG_PATH,
  };
  await writeReports(sourceReports, validation);
  return { sourceReports, validation };
}

export async function runCleanSlateStage1() {
  const cleaned = await cleanGeneratedWeatherData();
  const run = await runStage1CanonicalFetches();
  return { cleaned, ...run };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const args = new Set(process.argv.slice(2));
  if (args.has("--clean-only")) {
    console.log(JSON.stringify(await cleanGeneratedWeatherData(), null, 2));
  } else if (args.has("--fetch-only")) {
    console.log(JSON.stringify(await runStage1CanonicalFetches(), null, 2));
  } else {
    console.log(JSON.stringify(await runCleanSlateStage1(), null, 2));
  }
}

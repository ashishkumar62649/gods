import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  ensureDotEnvLoaded,
  EXPLORER_ROOT,
  RAW_ROOT,
} from "./common_functions/index.mjs";
import { CANONICAL_SOURCES } from "./stage1_clean_slate_fetch.mjs";

const REPORT_ROOT = join(RAW_ROOT, "_reports");
const TIER_LOG_PATH = join(REPORT_ROOT, "tiered_fetch_log.jsonl");
const TIER_LAST_RUN_PATH = join(REPORT_ROOT, "tiered_last_run.json");

const TIER_DESCRIPTIONS = {
  1: "5-15 minutes: fast-changing hazards",
  2: "hourly: operational weather, hydrology, air quality, model indexes",
  3: "6-7 hours: heavier model/satellite/catalog checks",
  4: "weekly: reference and slow-changing hazard context",
  5: "6 months-yearly: static datasets and large product discovery",
};

function parseArgs(argv) {
  const options = {
    tier: null,
    source: null,
    dryRun: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--dry-run") options.dryRun = true;
    else if (arg === "--tier") options.tier = Number(argv[++index]);
    else if (arg.startsWith("--tier=")) options.tier = Number(arg.split("=")[1]);
    else if (arg === "--source") options.source = argv[++index];
    else if (arg.startsWith("--source=")) options.source = arg.split("=")[1];
  }
  return options;
}

function plannedSources(options) {
  return CANONICAL_SOURCES.filter((source) => {
    if (options.tier && source.tier !== options.tier) return false;
    if (options.source && source.canonicalId !== options.source) return false;
    return true;
  });
}

function statusCounts(results) {
  const counts = {};
  for (const result of results || []) {
    const status = result?.status || "unknown";
    counts[status] = (counts[status] || 0) + 1;
  }
  return counts;
}

function hasCredential(source) {
  if (!source.credentialEnv?.length) return true;
  return source.credentialEnv.some((name) => Boolean(process.env[name]));
}

function classify(source, results) {
  if (source.credentialEnv?.length && !hasCredential(source)) return "credential_required";
  const counts = statusCounts(results);
  const successLike = (counts.success || 0) + (counts.duplicate || 0);
  const failureLike = (counts.failed || 0) + (counts.http_error || 0) + (counts.config_error || 0);
  if (successLike > 0 && source.expectedMode === "catalog_only") return "catalog_only";
  if (successLike > 0 && failureLike > 0) return "partial";
  if (successLike > 0) return "working";
  return "broken_feed";
}

async function appendJsonl(path, value) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value)}\n`, { flag: "a" });
}

async function runSource(source) {
  const startedAt = new Date().toISOString();
  let results = [];
  try {
    results = await source.run();
  } catch (error) {
    results = [{
      source: source.rawSourceIds[0],
      dataType: source.canonicalId,
      status: "failed",
      fetchedAt: new Date().toISOString(),
      errorName: error?.name || "Error",
      errorMessage: error?.message || String(error),
    }];
  }
  const finishedAt = new Date().toISOString();
  return {
    canonicalId: source.canonicalId,
    sourceName: source.sourceName,
    tier: source.tier,
    cadence: source.cadence,
    fetcherFile: source.fetcherFile,
    expectedMode: source.expectedMode,
    operationalStatus: classify(source, results),
    credentialEnv: source.credentialEnv || [],
    credentialPresent: hasCredential(source),
    startedAt,
    finishedAt,
    statusCounts: statusCounts(results),
    resultCount: results.length,
    rawFiles: results
      .filter((result) => result.rawFilePath || result.existingFilePath)
      .map((result) => result.rawFilePath || result.existingFilePath),
  };
}

export async function runTieredWeatherFetch(options = {}) {
  await ensureDotEnvLoaded();
  const selected = plannedSources(options);
  const summary = {
    generatedAt: new Date().toISOString(),
    explorerRoot: EXPLORER_ROOT,
    tier: options.tier || null,
    tierDescription: options.tier ? TIER_DESCRIPTIONS[options.tier] : "selected sources",
    dryRun: Boolean(options.dryRun),
    selectedCount: selected.length,
    sources: selected.map((source) => ({
      canonicalId: source.canonicalId,
      sourceName: source.sourceName,
      tier: source.tier,
      cadence: source.cadence,
      fetcherFile: source.fetcherFile,
      expectedMode: source.expectedMode,
      credentialEnv: source.credentialEnv || [],
    })),
    results: [],
  };

  if (!options.dryRun) {
    for (const source of selected) {
      console.log(`[tiered-fetch] tier ${source.tier}: ${source.sourceName}`);
      const result = await runSource(source);
      summary.results.push(result);
      await appendJsonl(TIER_LOG_PATH, result);
    }
  }

  await mkdir(REPORT_ROOT, { recursive: true });
  await writeFile(TIER_LAST_RUN_PATH, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  return summary;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  console.log(JSON.stringify(await runTieredWeatherFetch(parseArgs(process.argv.slice(2))), null, 2));
}

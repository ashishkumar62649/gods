import { runCli, runFeedList } from "./common_functions/index.mjs";
import { COMMON_FEED_OPTIONS, NO_AUTH_LIMITS, loadWatchConfig, sourceExpected } from "./config/no_auth_source_manifest.mjs";

const WORLDPOP_OPTIONS = {
  ...COMMON_FEED_OPTIONS,
  source: "worldpop",
  rateLimitPerMin: 20,
  timeoutMs: 20000,
};

async function discoverWorldPopDataFile(dataset, category, iso3, popyear) {
  const configured = process.env[`WORLDPOP_${iso3}_SAMPLE_URL`];
  if (configured) return configured;

  try {
    const url = `https://www.worldpop.org/rest/data/${dataset}/${category}?iso3=${encodeURIComponent(iso3)}`;
    const response = await fetch(url, { headers: { "user-agent": "GODS-Explorer-RawFetcher/0.1" } });
    if (!response.ok) return null;
    const payload = await response.json();
    const item = payload?.data?.find((entry) => String(entry.popyear) === String(popyear)) || payload?.data?.[0];
    if (!item?.data_file) return null;
    if (/^https?:\/\//i.test(item.data_file)) return item.data_file;
    return `https://data.worldpop.org/${String(item.data_file).replace(/^\/+/, "")}`;
  } catch {
    return null;
  }
}

async function buildFeeds(watchConfig) {
  const { countries, year, datasetAlias, categoryAlias } = watchConfig.worldPop;
  const dataset = process.env.WORLDPOP_DATASET_ALIAS || datasetAlias;
  const category = process.env.WORLDPOP_CATEGORY_ALIAS || categoryAlias;
  const popyear = process.env.WORLDPOP_YEAR || String(year);
  const sampleLimitBytes = Number(process.env.WORLDPOP_GEOTIFF_SAMPLE_LIMIT_BYTES || 512 * 1024);
  const selectedCountries = process.env.WORLDPOP_COUNTRIES
    ? process.env.WORLDPOP_COUNTRIES.split(",").map((item) => item.trim()).filter(Boolean)
    : countries;

  const feeds = [
    {
      ...WORLDPOP_OPTIONS,
      folder: "metadata",
      dataType: "root_datasets",
      url: process.env.WORLDPOP_ROOT_DATA_URL || "https://www.worldpop.org/rest/data",
      expected: sourceExpected("worldpop", "WorldPop REST API root dataset metadata."),
      expectedFormat: "json",
      extension: "json",
      expectedLimitBytes: NO_AUTH_LIMITS.smallJson,
    },
    {
      ...WORLDPOP_OPTIONS,
      folder: "metadata",
      dataType: `${dataset}_categories`,
      url: process.env.WORLDPOP_DATASET_URL || `https://www.worldpop.org/rest/data/${dataset}`,
      expected: sourceExpected("worldpop", `WorldPop dataset category metadata for ${dataset}.`),
      expectedFormat: "json",
      extension: "json",
      expectedLimitBytes: NO_AUTH_LIMITS.smallJson,
    },
    ...selectedCountries.map((iso3) => ({
      ...WORLDPOP_OPTIONS,
      folder: "population_metadata",
      dataType: `${dataset}_${category}_${iso3}_${popyear}`,
      url: process.env[`WORLDPOP_${iso3}_URL`] || `https://www.worldpop.org/rest/data/${dataset}/${category}?iso3=${encodeURIComponent(iso3)}`,
      expected: sourceExpected("worldpop", `WorldPop population metadata and download links for ${iso3}; v1 does not download GeoTIFF rasters.`),
      expectedFormat: "json",
      extension: "json",
      expectedLimitBytes: NO_AUTH_LIMITS.smallJson,
    })),
  ];

  for (const iso3 of selectedCountries) {
    const sampleUrl = await discoverWorldPopDataFile(dataset, category, iso3, popyear);
    if (!sampleUrl) continue;
    feeds.push({
      ...WORLDPOP_OPTIONS,
      folder: "geotiff_samples",
      dataType: `${dataset}_${category}_${iso3}_${popyear}_byte_sample`,
      url: sampleUrl,
      expected: sourceExpected("worldpop", `WorldPop GeoTIFF byte-range sample for ${iso3} ${popyear}; proves whether the host supports safe partial raster access.`),
      expectedFormat: "geotiff",
      extension: "tif",
      expectedLimitBytes: sampleLimitBytes,
      headers: {
        range: `bytes=0-${sampleLimitBytes - 1}`,
      },
      rateLimitPerMin: 20,
      timeoutMs: 30000,
    });
  }

  return feeds;
}

export async function runWorldPopRawFetch() {
  return runFeedList(await buildFeeds(await loadWatchConfig()));
}

runCli(import.meta.url, "worldpop", runWorldPopRawFetch);

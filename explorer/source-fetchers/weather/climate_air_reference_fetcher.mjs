import { runCli, runFeedList } from "./common_functions/index.mjs";
import { COMMON_FEED_OPTIONS, NO_AUTH_LIMITS } from "./config/no_auth_source_manifest.mjs";

const SOURCE = "climate_air_reference";

const OPTIONS = {
  ...COMMON_FEED_OPTIONS,
  source: SOURCE,
  rateLimitPerMin: 20,
  timeoutMs: 30000,
};

function yyyymmdd(date) {
  return date.toISOString().slice(0, 10).replace(/-/g, "");
}

export function buildClimateAirReferenceFeeds({ dataTypes = null } = {}) {
  const end = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
  const nceiEnd = process.env.NOAA_NCEI_SAMPLE_END_DATE || "2025-04-30";
  const nceiStart = process.env.NOAA_NCEI_SAMPLE_START_DATE || "2025-04-29";
  const feeds = [
    {
      ...OPTIONS,
      folder: "nasa_power",
      dataType: "daily_point_radiation_kolkata",
      url: process.env.NASA_POWER_DAILY_URL || `https://power.larc.nasa.gov/api/temporal/daily/point?parameters=ALLSKY_SFC_SW_DWN,T2M,RH2M,WS2M&community=RE&longitude=88.3639&latitude=22.5726&start=${yyyymmdd(start)}&end=${yyyymmdd(end)}&format=JSON`,
      expected: "NASA POWER daily point sample for surface radiation and climate/weather support variables. Docs: https://power.larc.nasa.gov/docs/services/api/",
      expectedFormat: "json",
      extension: "json",
      expectedLimitBytes: NO_AUTH_LIMITS.smallJson,
    },
    {
      ...OPTIONS,
      folder: "noaa_ncei",
      dataType: "daily_summaries_san_francisco",
      url: process.env.NOAA_NCEI_DAILY_SUMMARIES_URL || `https://www.ncei.noaa.gov/access/services/data/v1?dataset=daily-summaries&stations=USW00023234&startDate=${nceiStart}&endDate=${nceiEnd}&format=json&units=metric`,
      expected: "NOAA NCEI daily summaries sample for historical/climate-normal style context. Docs: https://www.ncei.noaa.gov/support/access-data-service-api-user-documentation",
      expectedFormat: "json",
      extension: "json",
      expectedLimitBytes: NO_AUTH_LIMITS.smallJson,
    },
    {
      ...OPTIONS,
      folder: "copernicus_catalogs",
      dataType: "cds_processes",
      url: process.env.COPERNICUS_CDS_PROCESSES_URL || "https://cds.climate.copernicus.eu/api/retrieve/v1/processes",
      expected: "Copernicus CDS process catalog sample for ERA5/reanalysis products; data job submission comes after storage/job orchestration design.",
      expectedFormat: "json",
      extension: "json",
      expectedLimitBytes: NO_AUTH_LIMITS.smallJson,
    },
    {
      ...OPTIONS,
      folder: "copernicus_catalogs",
      dataType: "ads_processes",
      url: process.env.COPERNICUS_ADS_PROCESSES_URL || "https://ads.atmosphere.copernicus.eu/api/retrieve/v1/processes",
      expected: "Copernicus ADS process catalog sample for CAMS air-quality/aerosol/greenhouse-gas products; data job submission comes later.",
      expectedFormat: "json",
      extension: "json",
      expectedLimitBytes: NO_AUTH_LIMITS.smallJson,
    },
    {
      ...OPTIONS,
      folder: "copernicus_catalogs",
      dataType: "ewds_processes",
      url: process.env.COPERNICUS_EWDS_PROCESSES_URL || "https://ewds.climate.copernicus.eu/api/retrieve/v1/processes",
      expected: "Copernicus EWDS process catalog sample for GloFAS/fire/drought/emergency products; data job submission comes later.",
      expectedFormat: "json",
      extension: "json",
      expectedLimitBytes: NO_AUTH_LIMITS.smallJson,
    },
  ];

  if (!dataTypes) return feeds;
  const allowed = new Set(dataTypes);
  return feeds.filter((feed) => allowed.has(feed.dataType));
}

export async function runClimateAirReferenceRawFetch(options = {}) {
  return runFeedList(buildClimateAirReferenceFeeds(options));
}

runCli(import.meta.url, SOURCE, runClimateAirReferenceRawFetch);

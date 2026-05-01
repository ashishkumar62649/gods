import { runCli, runFeedList } from "./common_functions/index.mjs";
import { COMMON_FEED_OPTIONS, NO_AUTH_LIMITS, loadWatchConfig, sourceExpected } from "./config/no_auth_source_manifest.mjs";

function buildFeeds(watchConfig) {
  const date = process.env.NASA_GIBS_SAMPLE_DATE || watchConfig.gibs.sampleDate;
  const layer = process.env.NASA_GIBS_SAMPLE_LAYER || watchConfig.gibs.sampleLayer;

  return [
    {
      ...COMMON_FEED_OPTIONS,
      source: "nasa_gibs",
      folder: "wmts",
      dataType: "epsg3857_best_capabilities",
      url: process.env.NASA_GIBS_WMTS_CAPABILITIES_URL || "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/wmts.cgi?SERVICE=WMTS&REQUEST=GetCapabilities",
      expected: sourceExpected("nasa_gibs", "NASA GIBS WMTS capabilities document listing tile layers, time dimensions, and formats."),
      expectedFormat: "xml",
      extension: "xml",
      expectedLimitBytes: NO_AUTH_LIMITS.mediumXml,
      rateLimitPerMin: 20,
      timeoutMs: 20000,
    },
    {
      ...COMMON_FEED_OPTIONS,
      source: "nasa_gibs",
      folder: "tile_samples",
      dataType: `${layer}_${date}_sample_tile`,
      url: process.env.NASA_GIBS_SAMPLE_TILE_URL || `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/${layer}/default/${date}/GoogleMapsCompatible_Level9/6/13/24.jpg`,
      expected: sourceExpected("nasa_gibs", "Single low-risk NASA GIBS JPEG sample tile; proves tile access without bulk tile storage."),
      expectedFormat: "jpeg",
      extension: "jpg",
      expectedLimitBytes: NO_AUTH_LIMITS.tileSample,
      rateLimitPerMin: 20,
      timeoutMs: 20000,
    },
  ];
}

export async function runNasaGibsRawFetch() {
  return runFeedList(buildFeeds(await loadWatchConfig()));
}

runCli(import.meta.url, "nasa_gibs", runNasaGibsRawFetch);

import { runCli, runFeed, runFeedList } from "./common_functions/index.mjs";
import { COMMON_FEED_OPTIONS, NO_AUTH_LIMITS } from "./config/no_auth_source_manifest.mjs";

const SOURCE = "rainviewer";
const DOCS = "https://www.rainviewer.com/api/weather-maps-api.html";

const BASE_OPTIONS = {
  ...COMMON_FEED_OPTIONS,
  source: SOURCE,
  rateLimitPerMin: 30,
  timeoutMs: 20000,
};

function expected(detail) {
  return `${detail} Docs: ${DOCS}`;
}

async function discoverLatestRadarTile() {
  const response = await fetch("https://api.rainviewer.com/public/weather-maps.json", {
    headers: { "user-agent": "GODS-Explorer-RawFetcher/0.1" },
  });
  if (!response.ok) return null;
  const payload = await response.json();
  const frame = payload?.radar?.past?.at?.(-1);
  if (!payload?.host || !frame?.path) return null;
  return `${payload.host}${frame.path}/256/4/8/5/2/1_1.png`;
}

async function buildFeeds() {
  const feeds = [
    {
      ...BASE_OPTIONS,
      folder: "radar_index",
      dataType: "weather_maps_index",
      url: process.env.RAINVIEWER_INDEX_URL || "https://api.rainviewer.com/public/weather-maps.json",
      expected: expected("RainViewer public radar/satellite frame index; proves radar availability and frame timestamps."),
      expectedFormat: "json",
      extension: "json",
      expectedLimitBytes: NO_AUTH_LIMITS.smallJson,
    },
  ];

  const tileUrl = process.env.RAINVIEWER_SAMPLE_TILE_URL || await discoverLatestRadarTile();
  if (tileUrl) {
    feeds.push({
      ...BASE_OPTIONS,
      folder: "radar_tile_samples",
      dataType: "latest_radar_tile_sample",
      url: tileUrl,
      expected: expected("Single RainViewer radar PNG tile sample; proves actual radar imagery access without bulk tile download."),
      expectedFormat: "png",
      extension: "png",
      expectedLimitBytes: NO_AUTH_LIMITS.tileSample,
    });
  }

  return feeds;
}

export async function runRainViewerRawFetch() {
  return runFeedList(await buildFeeds());
}

runCli(import.meta.url, SOURCE, runRainViewerRawFetch);

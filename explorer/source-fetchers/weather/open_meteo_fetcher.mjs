import { runCli, runFeedList } from "./common_functions/index.mjs";
import { COMMON_FEED_OPTIONS, NO_AUTH_LIMITS, loadWatchConfig, sourceExpected } from "./config/no_auth_source_manifest.mjs";

const CURRENT_VARIABLES = [
  "temperature_2m",
  "relative_humidity_2m",
  "apparent_temperature",
  "precipitation",
  "rain",
  "showers",
  "snowfall",
  "weather_code",
  "cloud_cover",
  "pressure_msl",
  "surface_pressure",
  "wind_speed_10m",
  "wind_direction_10m",
  "wind_gusts_10m",
];

const HOURLY_VARIABLES = [
  "temperature_2m",
  "relative_humidity_2m",
  "dew_point_2m",
  "apparent_temperature",
  "precipitation_probability",
  "precipitation",
  "rain",
  "showers",
  "snowfall",
  "snow_depth",
  "weather_code",
  "pressure_msl",
  "surface_pressure",
  "cloud_cover",
  "visibility",
  "wind_speed_10m",
  "wind_direction_10m",
  "wind_gusts_10m",
  "uv_index",
  "cape",
  "wet_bulb_temperature_2m",
  "shortwave_radiation",
  "direct_radiation",
  "diffuse_radiation",
];

const DAILY_VARIABLES = [
  "weather_code",
  "temperature_2m_max",
  "temperature_2m_min",
  "apparent_temperature_max",
  "apparent_temperature_min",
  "precipitation_sum",
  "rain_sum",
  "showers_sum",
  "snowfall_sum",
  "precipitation_probability_max",
  "wind_speed_10m_max",
  "wind_gusts_10m_max",
  "wind_direction_10m_dominant",
  "uv_index_max",
  "shortwave_radiation_sum",
];

function openMeteoUrl(location) {
  const params = new URLSearchParams({
    latitude: String(location.latitude),
    longitude: String(location.longitude),
    current: CURRENT_VARIABLES.join(","),
    hourly: HOURLY_VARIABLES.join(","),
    daily: DAILY_VARIABLES.join(","),
    timezone: "UTC",
    forecast_days: process.env.OPEN_METEO_FORECAST_DAYS || "2",
    past_hours: process.env.OPEN_METEO_PAST_HOURS || "1",
  });
  return `https://api.open-meteo.com/v1/forecast?${params}`;
}

function buildFeeds(watchConfig) {
  return watchConfig.locations.map((location) => ({
    ...COMMON_FEED_OPTIONS,
    source: "open_meteo",
    folder: "forecast",
    dataType: `forecast_${location.id}`,
    url: openMeteoUrl(location),
    expected: sourceExpected(
      "open_meteo",
      `Open-Meteo current/hourly/daily JSON for ${location.name}; covers weather variables mapped in weather.txt.`,
    ),
    expectedFormat: "json",
    extension: "json",
    expectedLimitBytes: NO_AUTH_LIMITS.smallJson,
    rateLimitPerMin: 120,
  }));
}

export async function runOpenMeteoRawFetch() {
  return runFeedList(buildFeeds(await loadWatchConfig()));
}

runCli(import.meta.url, "open_meteo", runOpenMeteoRawFetch);

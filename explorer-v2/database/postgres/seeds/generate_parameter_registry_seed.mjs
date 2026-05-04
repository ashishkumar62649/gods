import { writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { WEATHER_PARAMETER_COVERAGE } from "../../../source-fetchers/weather/config/weather_parameter_coverage.mjs";

const SEED_DIR = dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = join(SEED_DIR, "0002_parameter_registry.sql");

const UNIT_RULES = [
  [/temperature|dew point|heat index|wind chill|wet-bulb|cloud top temperature|sea surface temperature/i, "degC"],
  [/pressure|barometric/i, "hPa"],
  [/wind speed|wind gust|jet stream wind|ocean current speed|fire spread speed/i, "m/s"],
  [/wind direction|wave direction|swell direction|aspect|fire spread direction/i, "deg"],
  [/humidity|cloud cover|probability|confidence|vegetation anomaly|temperature anomaly|rainfall anomaly|drought anomaly/i, "%"],
  [/rainfall|rain accumulation|snowfall|snow accumulation|ice accumulation|snow depth|wave height|swell height|water level|flood depth|tsunami wave height/i, "m"],
  [/earthquake magnitude|magnitude/i, "magnitude"],
  [/earthquake depth|cloud base height|cloud top height|volcanic ash height|elevation/i, "m"],
  [/fire radiative power/i, "MW"],
  [/population density|livestock density/i, "count_per_km2"],
  [/pm2\.5|pm10|ozone|no2|so2|co\b|black carbon|smoke concentration|dust concentration/i, "ug_m3"],
];

const EVENT_RULE = /earthquake|cyclone|hurricane|typhoon|tropical|tsunami|volcano|eruption|fire|wildfire|flood|storm|tornado|hail|warning|watch|advisory|alert|disaster|lahar|landslide|avalanche/i;
const GEO_RULE = /polygon|boundary|line|watershed|fault|road|bridge|rail|port|airport|hospital|school|building|power line|substation|coastline|floodplain|drainage|evacuation|infrastructure|land cover|land use/i;
const RASTER_RULE = /imagery|satellite|grid|raster|ndvi|evi|snow cover|burned area|vegetation|soil moisture|deforestation|nighttime lights|sea ice|surface temperature|albedo|evapotranspiration/i;
const OCEAN_RULE = /tide|wave|swell|ocean|marine|buoy|sea level|sea surface|tsunami wave|current/i;

function sqlString(value) {
  if (value == null) return "NULL";
  return `'${String(value).replace(/'/g, "''")}'`;
}

function sqlArray(values) {
  if (!values?.length) return "ARRAY[]::text[]";
  return `ARRAY[${values.map(sqlString).join(", ")}]::text[]`;
}

function parameterId(name) {
  return name
    .toLowerCase()
    .replace(/pm2\.5/g, "pm25")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function displayName(name) {
  return name.replace(/\b\w/g, (match) => match.toUpperCase());
}

function canonicalUnit(name) {
  return UNIT_RULES.find(([pattern]) => pattern.test(name))?.[1] || null;
}

function storageTarget(entry) {
  const text = `${entry.parameter} ${entry.sourceText} ${entry.sourceFamily}`.toLowerCase();
  if (entry.status === "derived_later") return "postgres";
  if (/grib|netcdf|hdf|geotiff|zarr|cog|raster|grid/.test(text)) return "zarr_or_cog_or_parquet";
  if (entry.status === "catalog_only") return "postgres";
  return "postgres";
}

function category(entry) {
  const text = `${entry.parameter} ${entry.sourceText} ${entry.sourceFamily}`;
  if (OCEAN_RULE.test(text)) return "ocean";
  if (EVENT_RULE.test(text)) return "hazard";
  if (GEO_RULE.test(text)) return "geospatial";
  if (/population|exposure|vulnerability|asset|infrastructure/i.test(text)) return "exposure";
  if (/air quality|pm2\.5|pm10|ozone|no2|so2|co\b|aerosol|smoke|dust/i.test(text)) return "air_quality";
  if (/catalog|metadata|process/i.test(text)) return "catalog";
  return "weather";
}

function valueShape(entry) {
  const text = `${entry.parameter} ${entry.sourceText} ${entry.sourceFamily}`;
  if (entry.status === "derived_later") return "score";
  if (RASTER_RULE.test(text)) return "grid";
  if (GEO_RULE.test(text)) return "polygon_or_line";
  if (EVENT_RULE.test(text)) return "event";
  return "point";
}

function normalizedTable(entry) {
  const text = `${entry.parameter} ${entry.sourceText} ${entry.sourceFamily}`;
  if (entry.status === "derived_later") return "derived_metrics";
  if (/air quality|aqi|pm2\.5|pm10|ozone|no2|so2|co\b|black carbon|aerosol|smoke concentration|dust concentration|methane|carbon dioxide/i.test(text)) return "air_quality_time_series";
  if (/river|streamflow|water level|flood|watershed|reservoir|dam|hydrology|groundwater/i.test(text) && !/flood warning|flood event|flood extent|flood depth|flood polygon/i.test(text)) return "hydrology_time_series";
  if (entry.status === "catalog_only" || /catalog|metadata|process|listing|granule|collection/i.test(text)) return "catalog_products";
  if (RASTER_RULE.test(text) || /grib|netcdf|hdf|geotiff|tile|imagery/i.test(text)) return "raster_products";
  if (OCEAN_RULE.test(text)) return "ocean_time_series";
  if (EVENT_RULE.test(text)) return "hazard_events";
  if (GEO_RULE.test(text)) return "geospatial_features";
  return "weather_time_series";
}

function dataFamily(entry) {
  const table = normalizedTable(entry);
  if (table === "derived_metrics") return "derived_metric";
  if (table === "air_quality_time_series") return "air_quality_time_series";
  if (table === "hydrology_time_series") return "hydrology_time_series";
  if (table === "catalog_products") return "catalog_product";
  if (table === "raster_products") return "raster_product";
  if (table === "ocean_time_series") return "ocean_time_series";
  if (table === "hazard_events") return "hazard_event";
  if (table === "geospatial_features") return "geospatial_feature";
  return "weather_time_series";
}

function fallbackSourceIds(entry) {
  const fallback = [];
  if (entry.fetcherId) fallback.push(entry.fetcherId);
  for (const candidate of ["open_meteo", "noaa_nodd_gfs", "gdacs", "reference_context"]) {
    if (entry.sourceText.toLowerCase().includes(candidate.replace(/_/g, " ")) && !fallback.includes(candidate)) {
      fallback.push(candidate);
    }
  }
  return fallback.slice(0, 6);
}

const rows = WEATHER_PARAMETER_COVERAGE.map((entry) => {
  const fallbackIds = fallbackSourceIds(entry);
  const primarySourceId = entry.fetcherId || fallbackIds[0] || null;
  const payload = {
    source_text: entry.sourceText,
    source_family: entry.sourceFamily,
    coverage_status: entry.status,
    normalization_notes: entry.normalizationNotes,
  };
  return [
    parameterId(entry.parameter),
    displayName(entry.parameter),
    category(entry),
    dataFamily(entry),
    canonicalUnit(entry.parameter),
    entry.status !== "derived_later",
    entry.status === "derived_later",
    primarySourceId,
    fallbackIds,
    valueShape(entry),
    storageTarget(entry),
    normalizedTable(entry),
    payload,
  ];
});

const values = rows.map((row) => `  (${[
  sqlString(row[0]),
  sqlString(row[1]),
  sqlString(row[2]),
  sqlString(row[3]),
  sqlString(row[4]),
  row[5] ? "true" : "false",
  row[6] ? "true" : "false",
  sqlString(row[7]),
  sqlArray(row[8]),
  sqlString(row[9]),
  sqlString(row[10]),
  sqlString(row[11]),
  sqlString(JSON.stringify(row[12])),
].join(", ")})`);

const sql = `-- Generated from weather_parameter_coverage.mjs. Do not hand-edit individual rows.
INSERT INTO parameter_registry (
  parameter_id,
  display_name,
  category,
  data_family,
  canonical_unit,
  is_fetched,
  is_derived,
  primary_source_id,
  fallback_source_ids,
  value_shape,
  storage_target,
  normalized_table,
  payload
) VALUES
${values.join(",\n")}
ON CONFLICT (parameter_id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  category = EXCLUDED.category,
  data_family = EXCLUDED.data_family,
  canonical_unit = EXCLUDED.canonical_unit,
  is_fetched = EXCLUDED.is_fetched,
  is_derived = EXCLUDED.is_derived,
  primary_source_id = EXCLUDED.primary_source_id,
  fallback_source_ids = EXCLUDED.fallback_source_ids,
  value_shape = EXCLUDED.value_shape,
  storage_target = EXCLUDED.storage_target,
  normalized_table = EXCLUDED.normalized_table,
  payload = EXCLUDED.payload;
`;

await writeFile(OUTPUT_PATH, sql, "utf8");
console.log(JSON.stringify({ outputPath: OUTPUT_PATH, rows: rows.length }, null, 2));

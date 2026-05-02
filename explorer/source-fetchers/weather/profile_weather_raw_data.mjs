import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { EXPLORER_ROOT, RAW_ROOT } from "./common_functions/index.mjs";

const REPORT_DIR = dirname(fileURLToPath(import.meta.url));
const FETCH_LOG_PATH = join(RAW_ROOT, "fetch_log.jsonl");
const DOC_DIR = join(EXPLORER_ROOT, "..", "doc");
const MARKDOWN_REPORT_PATH = join(DOC_DIR, "weather_raw_profile.md");
const JSON_REPORT_PATH = join(DOC_DIR, "weather_raw_profile.json");

export const NORMALIZED_RECORD_FAMILIES = [
  {
    id: "source_raw_files",
    purpose: "Lineage row for every raw file, including source, endpoint, fetch time, checksum, byte size, content type, and raw path.",
  },
  {
    id: "weather_time_series",
    purpose: "Point/time weather values such as temperature, humidity, wind, pressure, precipitation, radiation, air quality, and model samples.",
  },
  {
    id: "ocean_time_series",
    purpose: "Buoy, tide, water-level, wave, and tsunami station observations.",
  },
  {
    id: "air_quality_time_series",
    purpose: "Air quality pollutant and index values such as PM2.5, PM10, ozone, NO2, SO2, CO, AQI, aerosols, smoke, and dust.",
  },
  {
    id: "hydrology_time_series",
    purpose: "River, stream, reservoir, water-level, and hydrology observations or forecasts.",
  },
  {
    id: "hazard_events",
    purpose: "Earthquakes, cyclones, floods, wildfires, volcanoes, warnings, watches, and severe-storm outlooks.",
  },
  {
    id: "geospatial_features",
    purpose: "GeoJSON/ArcGIS/OSM-style features such as alerts, polygons, faults, watersheds, infrastructure, and exposure context.",
  },
  {
    id: "catalog_products",
    purpose: "Catalog/process/product metadata for sources that need async jobs or large downloads.",
  },
  {
    id: "raster_products",
    purpose: "Binary/grid/tile assets such as GRIB2, NetCDF, HDF, GeoTIFF, imagery tiles, and byte samples.",
  },
  {
    id: "derived_metrics",
    purpose: "Calculated values such as heat index, wind chill, risk score, exposure score, vulnerability score, confidence, and source reliability.",
  },
  {
    id: "best_current_values",
    purpose: "Selected frontend-ready current value per parameter/location from all supporting evidence records.",
  },
];

export const COMMON_NORMALIZED_FIELDS = [
  "source",
  "source_family",
  "parameter",
  "observed_time",
  "valid_time",
  "forecast_time",
  "ingested_at",
  "latitude",
  "longitude",
  "geometry",
  "value",
  "unit",
  "raw_file_path",
  "checksum_sha256",
  "payload",
];

function safeJsonParse(line) {
  try {
    return JSON.parse(line);
  } catch {
    return null;
  }
}

function toRelative(path) {
  return path ? relative(join(RAW_ROOT, "..", ".."), path) : null;
}

function shapeKind(entry) {
  return entry.sampleShape?.kind || "unknown";
}

function extensionFor(entry) {
  const path = entry.rawFilePath || entry.existingFilePath || "";
  return extname(path).toLowerCase() || "(none)";
}

function classifyNormalizationLane(entry) {
  const text = `${entry.source} ${entry.folder} ${entry.dataType} ${entry.expected || ""}`.toLowerCase();
  const kind = shapeKind(entry);
  const format = String(entry.expectedFormat || "").toLowerCase();

  if (text.includes("catalog") || text.includes("collections") || text.includes("granules") || text.includes("metadata")) {
    return "catalog_or_product_metadata";
  }
  if (text.includes("air quality") || text.includes("openaq") || text.includes("pm2.5") || text.includes("pm10") || text.includes("ozone") || text.includes("aerosol")) {
    return "air_quality_time_series";
  }
  if (text.includes("hydrology") || text.includes("water_level") || text.includes("streamflow") || text.includes("usgs_water") || text.includes("nwps")) {
    return "hydrology_time_series";
  }
  if (["geojson", "geojson_sample"].includes(kind) || format === "geojson") {
    return "geospatial_features";
  }
  if (text.includes("earthquake") || text.includes("cyclone") || text.includes("flood") || text.includes("wildfire") || text.includes("volcano") || text.includes("alerts") || text.includes("outlook")) {
    return "hazard_events";
  }
  if (text.includes("forecast") || text.includes("gfs") || text.includes("open_meteo") || text.includes("nws")) {
    return "weather_time_series";
  }
  if (text.includes("marine") || text.includes("buoy") || text.includes("water_level") || text.includes("tide") || text.includes("dart")) {
    return "ocean_time_series";
  }
  if (["grib", "grib2", "netcdf", "hdf", "hdf5", "geotiff", "tiff"].includes(format) || kind === "binary_or_grid") {
    return "grid_or_binary_product";
  }
  if (format === "png" || format === "jpg" || format === "jpeg" || text.includes("tile")) {
    return "imagery_or_tile";
  }
  if (text.includes("osm") || text.includes("soil") || text.includes("terrain") || text.includes("fault") || text.includes("watershed")) {
    return "reference_features";
  }
  if (kind === "rss_or_xml" || format === "xml" || format === "rss") {
    return "xml_feed";
  }
  if (format === "csv" || kind === "csv") {
    return "tabular_records";
  }
  return "source_specific_json";
}

function summarizeRows(rows, keyFn) {
  const map = new Map();
  for (const row of rows) {
    const key = keyFn(row);
    map.set(key, (map.get(key) || 0) + 1);
  }
  return [...map.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count || String(a.key).localeCompare(String(b.key)));
}

function summarizeGroups(entries) {
  const groups = new Map();
  for (const entry of entries) {
    const key = [entry.source, entry.folder, entry.dataType].join("|");
    const group = groups.get(key) || {
      source: entry.source,
      folder: entry.folder,
      dataType: entry.dataType,
      expectedFormat: entry.expectedFormat || null,
      contentTypes: new Set(),
      shapeKinds: new Set(),
      extensions: new Set(),
      normalizationLane: classifyNormalizationLane(entry),
      files: 0,
      bytes: 0,
      latestFetchedAt: null,
      sampleRawFilePath: null,
    };

    group.files += 1;
    group.bytes += Number(entry.bytes || 0);
    group.contentTypes.add(entry.contentType || "unknown");
    group.shapeKinds.add(shapeKind(entry));
    group.extensions.add(extensionFor(entry));
    if (!group.latestFetchedAt || String(entry.fetchedAt) > group.latestFetchedAt) {
      group.latestFetchedAt = entry.fetchedAt || null;
      group.sampleRawFilePath = toRelative(entry.rawFilePath || entry.existingFilePath);
    }
    groups.set(key, group);
  }

  return [...groups.values()]
    .map((group) => ({
      ...group,
      contentTypes: [...group.contentTypes].sort(),
      shapeKinds: [...group.shapeKinds].sort(),
      extensions: [...group.extensions].sort(),
    }))
    .sort((a, b) => a.source.localeCompare(b.source) || a.folder.localeCompare(b.folder) || a.dataType.localeCompare(b.dataType));
}

function markdownTable(rows, headers, values) {
  const lines = [
    `| ${headers.join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
  ];
  for (const row of rows) {
    lines.push(`| ${values(row).map((value) => String(value ?? "").replace(/\|/g, "\\|")).join(" | ")} |`);
  }
  return lines.join("\n");
}

function buildMarkdown(profile) {
  const statusRows = Object.entries(profile.statusCounts).map(([key, count]) => ({ key, count }));
  const formatRows = profile.formatCounts.slice(0, 20);
  const laneRows = profile.laneCounts;
  const sourceRows = profile.sourceCounts;
  const groupRows = profile.groups;

  return `# Weather Raw Data Profile

Generated from \`explorer/data_raw/weather/fetch_log.jsonl\`.

## Summary

- Fetch log rows: ${profile.totalLogRows}
- Successful or duplicate raw file references: ${profile.rawFileEntries}
- Distinct source/folder/dataType groups: ${profile.groups.length}
- Total referenced bytes: ${profile.totalBytes}

## Fetch Status Counts

${markdownTable(statusRows, ["status", "count"], (row) => [row.key, row.count])}

## Raw Formats Seen

${markdownTable(formatRows, ["extension", "count"], (row) => [row.key, row.count])}

## Normalization Lanes

${markdownTable(laneRows, ["lane", "groups"], (row) => [row.key, row.count])}

## Source Coverage

${markdownTable(sourceRows, ["source", "raw file refs"], (row) => [row.key, row.count])}

## Target Normalized Format

Use these database-ready record families for v1:

${NORMALIZED_RECORD_FAMILIES.map((family) => `- \`${family.id}\`: ${family.purpose}`).join("\n")}

Every normalized row should keep ${COMMON_NORMALIZED_FIELDS.map((field) => `\`${field}\``).join(", ")} where applicable. Missing fields stay null.

## Source Groups

${markdownTable(
    groupRows,
    ["source", "folder", "dataType", "lane", "formats", "shape", "files", "sample raw path"],
    (row) => [
      row.source,
      row.folder,
      row.dataType,
      row.normalizationLane,
      row.extensions.join(", "),
      row.shapeKinds.join(", "),
      row.files,
      row.sampleRawFilePath,
    ],
  )}
`;
}

async function loadFetchLog() {
  const text = await readFile(FETCH_LOG_PATH, "utf8");
  return text
    .split(/\r?\n/)
    .filter(Boolean)
    .map(safeJsonParse)
    .filter(Boolean);
}

export async function buildWeatherRawProfile() {
  const rows = await loadFetchLog();
  const rawFileEntries = rows.filter((row) => row.rawFilePath || row.existingFilePath);
  const groups = summarizeGroups(rawFileEntries);
  const laneCounts = summarizeRows(groups, (group) => group.normalizationLane);

  return {
    totalLogRows: rows.length,
    rawFileEntries: rawFileEntries.length,
    totalBytes: rawFileEntries.reduce((sum, row) => sum + Number(row.bytes || 0), 0),
    statusCounts: Object.fromEntries(summarizeRows(rows, (row) => row.status).map((row) => [row.key, row.count])),
    formatCounts: summarizeRows(rawFileEntries, extensionFor),
    laneCounts,
    sourceCounts: summarizeRows(rawFileEntries, (row) => row.source),
    normalizedRecordFamilies: NORMALIZED_RECORD_FAMILIES,
    commonNormalizedFields: COMMON_NORMALIZED_FIELDS,
    groups,
  };
}

export async function writeWeatherRawProfile() {
  const profile = await buildWeatherRawProfile();
  await mkdir(REPORT_DIR, { recursive: true });
  await writeFile(JSON_REPORT_PATH, `${JSON.stringify(profile, null, 2)}\n`, "utf8");
  await writeFile(MARKDOWN_REPORT_PATH, buildMarkdown(profile), "utf8");
  return profile;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const profile = await writeWeatherRawProfile();
  console.log(JSON.stringify({
    markdownReportPath: MARKDOWN_REPORT_PATH,
    jsonReportPath: JSON_REPORT_PATH,
    totalLogRows: profile.totalLogRows,
    rawFileEntries: profile.rawFileEntries,
    groups: profile.groups.length,
    laneCounts: profile.laneCounts,
  }, null, 2));
}

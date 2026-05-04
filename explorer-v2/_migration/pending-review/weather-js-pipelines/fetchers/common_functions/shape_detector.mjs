import { open, readFile } from "node:fs/promises";
import { normalizeContentType } from "./content_type_map.mjs";

const FULL_PARSE_LIMIT_BYTES = 5 * 1024 * 1024;
const SAMPLE_BYTES = 64 * 1024;

async function readSample(filePath, bytes = SAMPLE_BYTES) {
  const handle = await open(filePath, "r");
  try {
    const buffer = Buffer.alloc(bytes);
    const result = await handle.read(buffer, 0, bytes, 0);
    return buffer.subarray(0, result.bytesRead).toString("utf8");
  } finally {
    await handle.close();
  }
}

function detectCsv(sample) {
  const firstLine = sample.split(/\r?\n/).find(Boolean) || "";
  return {
    kind: "csv",
    headerColumns: firstLine.split(",").map((value) => value.trim()).filter(Boolean).slice(0, 30),
  };
}

function detectXml(sample) {
  return {
    kind: "rss_or_xml",
    itemCount: (sample.match(/<item[\s>]/g) || []).length,
    preview: sample.trim().slice(0, 120),
  };
}

function detectBinary(expectedFormat, contentType) {
  return {
    kind: "binary_or_grid",
    expectedFormat: expectedFormat || "unknown",
    contentType,
  };
}

export async function detectFileShape(filePath, { contentType = "", bytes = 0, expectedFormat = "" } = {}) {
  const normalizedType = normalizeContentType(contentType);
  const sample = await readSample(filePath);
  const trimmed = sample.trimStart();
  const format = String(expectedFormat || "").toLowerCase();

  if (normalizedType.includes("csv") || format === "csv") return detectCsv(sample);
  if (normalizedType.includes("html") || format === "html") return { kind: "html", preview: sample.trim().slice(0, 160) };
  if (normalizedType.includes("xml") || trimmed.startsWith("<") || format === "xml" || format === "rss") return detectXml(sample);

  if (normalizedType.includes("json") || trimmed.startsWith("{") || trimmed.startsWith("[") || ["json", "geojson"].includes(format)) {
    if (bytes > FULL_PARSE_LIMIT_BYTES) {
      return { kind: format === "geojson" ? "geojson_sample" : "json_sample", preview: trimmed.slice(0, 160) };
    }
    try {
      const parsed = JSON.parse(await readFile(filePath, "utf8"));
      if (parsed?.type === "FeatureCollection" && Array.isArray(parsed.features)) {
        return { kind: "geojson", type: parsed.type, features: parsed.features.length };
      }
      if (parsed?.value?.timeSeries) return { kind: "usgs_water", timeSeries: parsed.value.timeSeries.length };
      if (Array.isArray(parsed)) return { kind: "json_array", items: parsed.length };
      return { kind: "json_object", keys: Object.keys(parsed || {}).slice(0, 20) };
    } catch (error) {
      return { kind: "json_parse_error", message: error.message, preview: trimmed.slice(0, 160) };
    }
  }

  if (["grib", "grib2", "netcdf", "hdf", "hdf5", "geotiff", "tiff", "bin", "png", "jpg", "jpeg"].includes(format)) {
    return detectBinary(expectedFormat, normalizedType);
  }

  return { kind: "raw", preview: sample.slice(0, 160) };
}

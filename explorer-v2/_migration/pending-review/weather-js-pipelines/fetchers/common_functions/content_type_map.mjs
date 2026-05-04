import { normalizeExtension } from "./names.mjs";

export const CONTENT_TYPE_EXTENSION_MAP = {
  "application/json": ".json",
  "application/geo+json": ".geojson",
  "application/vnd.geo+json": ".geojson",
  "application/xml": ".xml",
  "application/rss+xml": ".xml",
  "text/xml": ".xml",
  "text/csv": ".csv",
  "application/csv": ".csv",
  "text/plain": ".txt",
  "application/octet-stream": ".bin",
  "text/html": ".html",
  "application/x-netcdf": ".nc",
  "application/netcdf": ".nc",
  "application/x-grib": ".grib",
  "application/x-grib2": ".grib2",
  "application/x-hdf": ".hdf",
  "application/x-hdf5": ".h5",
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/tiff": ".tif",
  "image/geotiff": ".tif",
};

export function normalizeContentType(contentType = "") {
  return String(contentType).split(";")[0].trim().toLowerCase();
}

export function extensionForContentType(contentType = "", fallback = "raw") {
  const normalized = normalizeContentType(contentType);
  const mapped = CONTENT_TYPE_EXTENSION_MAP[normalized];
  return normalizeExtension(mapped || fallback);
}

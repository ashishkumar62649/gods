export const NORMALIZED_RECORD_FAMILIES = [
  "source_raw_files",
  "weather_time_series",
  "ocean_time_series",
  "air_quality_time_series",
  "hydrology_time_series",
  "hazard_events",
  "geospatial_features",
  "catalog_products",
  "raster_products",
  "derived_metrics",
  "best_current_values",
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

export const NORMALIZATION_LANE_TO_TABLE = {
  catalog_or_product_metadata: "catalog_products",
  geospatial_features: "geospatial_features",
  hazard_events: "hazard_events",
  weather_time_series: "weather_time_series",
  ocean_time_series: "ocean_time_series",
  air_quality_time_series: "air_quality_time_series",
  hydrology_time_series: "hydrology_time_series",
  grid_or_binary_product: "raster_products",
  imagery_or_tile: "raster_products",
  reference_features: "geospatial_features",
  tabular_records: "weather_time_series",
  xml_feed: "hazard_events",
  source_specific_json: "weather_time_series",
};

function shapeKind(entry) {
  return entry.sampleShape?.kind || "unknown";
}

export function classifyNormalizationLane(entry) {
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
  if (["png", "jpg", "jpeg"].includes(format) || text.includes("tile")) {
    return "imagery_or_tile";
  }
  if (text.includes("osm") || text.includes("soil") || text.includes("terrain") || text.includes("fault") || text.includes("watershed")) {
    return "reference_features";
  }
  if (kind === "rss_or_xml" || format === "xml" || format === "rss") {
    return "xml_feed";
  }
  if (kind === "csv" || format === "csv") {
    return "tabular_records";
  }
  return "source_specific_json";
}

export function targetTableForLane(lane) {
  return NORMALIZATION_LANE_TO_TABLE[lane] || "source_raw_files";
}

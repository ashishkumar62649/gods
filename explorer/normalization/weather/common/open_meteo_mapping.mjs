export const OPEN_METEO_MVP_FIELDS = {
  temperature_2m: {
    parameter_id: "temperature",
    canonical_unit: "degC",
  },
  pressure_msl: {
    parameter_id: "pressure",
    canonical_unit: "hPa",
  },
  wind_speed_10m: {
    parameter_id: "wind_speed",
    canonical_unit: "m/s",
  },
  wind_direction_10m: {
    parameter_id: "wind_direction",
    canonical_unit: "degree",
  },
  rain: {
    parameter_id: "rainfall",
    canonical_unit: "mm",
  },
  precipitation: {
    parameter_id: "rainfall",
    canonical_unit: "mm",
  },
  relative_humidity_2m: {
    parameter_id: "humidity",
    canonical_unit: "%",
  },
};

export function normalizeOpenMeteoValue(value, originalUnit, canonicalUnit) {
  if (value === null || value === undefined || value === "") return null;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;

  if (originalUnit === "km/h" && canonicalUnit === "m/s") {
    return numeric / 3.6;
  }

  return numeric;
}


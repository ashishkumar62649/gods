import { latLngToCell } from "h3-js";

export function h3Indexes(latitude, longitude) {
  const lat = Number(latitude);
  const lon = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return {
      h3_res5: null,
      h3_res6: null,
      h3_res7: null,
      h3_res8: null,
    };
  }

  return {
    h3_res5: latLngToCell(lat, lon, 5),
    h3_res6: latLngToCell(lat, lon, 6),
    h3_res7: latLngToCell(lat, lon, 7),
    h3_res8: latLngToCell(lat, lon, 8),
  };
}


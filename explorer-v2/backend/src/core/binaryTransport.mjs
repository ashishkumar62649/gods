const MAGIC = 0x47453242; // GE2B
const VERSION = 1;
const HEADER_BYTES = 16;

export const LIVE_BINARY_CONTENT_TYPE = 'application/vnd.god-eyes.live+octet-stream; version=1';

const KINDS = {
  flights: 1,
  satellites: 2,
  maritime: 3,
  weather: 4,
  hazards: 5,
};

const FLIGHT_RECORD_BYTES = 40;
const SATELLITE_RECORD_BYTES = 40;
const MARITIME_RECORD_BYTES = 36;
const WEATHER_RECORD_BYTES = 44;
const HAZARD_RECORD_BYTES = 44;

export function encodeFlightsLiveBinary(flights) {
  const rows = Array.isArray(flights) ? flights.filter(hasPoint) : [];
  return encodeRecords(rows, KINDS.flights, FLIGHT_RECORD_BYTES, (view, offset, flight) => {
    view.setUint32(offset, parseHexId(flight.id_icao), true);
    view.setInt32(offset + 4, safeEpochSeconds(flight.timestamp), true);
    view.setFloat32(offset + 8, safeFloat(flight.latitude), true);
    view.setFloat32(offset + 12, safeFloat(flight.longitude), true);
    view.setFloat32(offset + 16, safeFloat(flight.altitude_baro_m), true);
    view.setFloat32(offset + 20, safeFloat(flight.velocity_mps), true);
    view.setFloat32(offset + 24, safeFloat(flight.heading_true_deg), true);
    view.setFloat32(offset + 28, safeFloat(flight.vertical_rate_mps), true);
    view.setUint32(offset + 32, flightFlags(flight), true);
    view.setUint32(offset + 36, hashString(flight.callsign || ''), true);
  });
}

export function encodeSatellitesLiveBinary(satellites) {
  const rows = Array.isArray(satellites) ? satellites.filter(hasPoint) : [];
  return encodeRecords(rows, KINDS.satellites, SATELLITE_RECORD_BYTES, (view, offset, satellite) => {
    view.setUint32(offset, safeInteger(satellite.id_norad), true);
    view.setInt32(offset + 4, safeEpochSeconds(satellite.timestamp), true);
    view.setFloat32(offset + 8, safeFloat(satellite.latitude), true);
    view.setFloat32(offset + 12, safeFloat(satellite.longitude), true);
    view.setFloat32(offset + 16, safeFloat(satellite.altitude_km), true);
    view.setFloat32(offset + 20, safeFloat(satellite.velocity_kps), true);
    view.setFloat32(offset + 24, safeFloat(satellite.inclination_deg), true);
    view.setFloat32(offset + 28, safeFloat(satellite.period_minutes), true);
    view.setUint32(offset + 32, satelliteFlags(satellite), true);
    view.setUint32(offset + 36, hashString(satellite.object_name || ''), true);
  });
}

export function encodeMaritimeLiveBinary(ships) {
  const rows = Array.isArray(ships) ? ships.filter(hasPoint) : [];
  return encodeRecords(rows, KINDS.maritime, MARITIME_RECORD_BYTES, (view, offset, ship) => {
    view.setUint32(offset, hashString(ship.vessel_id || ship.mmsi || ''), true);
    view.setInt32(offset + 4, safeEpochSeconds(ship.timestamp), true);
    view.setFloat32(offset + 8, safeFloat(ship.latitude), true);
    view.setFloat32(offset + 12, safeFloat(ship.longitude), true);
    view.setFloat32(offset + 16, safeFloat(ship.speed_knots), true);
    view.setFloat32(offset + 20, safeFloat(ship.heading_deg ?? ship.course_deg), true);
    view.setFloat32(offset + 24, safeFloat(ship.nearest_cable_distance_m), true);
    view.setUint32(offset + 28, shipFlags(ship), true);
    view.setUint32(offset + 32, hashString(ship.nearest_cable_id || ''), true);
  });
}

export function encodeWeatherLiveBinary(points) {
  const rows = Array.isArray(points) ? points.filter(hasPoint) : [];
  return encodeRecords(rows, KINDS.weather, WEATHER_RECORD_BYTES, (view, offset, point) => {
    view.setUint32(offset, hashString(point.record_id || `${point.parameter_id}:${point.source_id}:${point.time_index}`), true);
    view.setInt32(offset + 4, safeEpochSeconds(point.time_index || point.valid_time || point.observed_time), true);
    view.setFloat32(offset + 8, safeFloat(point.latitude), true);
    view.setFloat32(offset + 12, safeFloat(point.longitude), true);
    view.setFloat32(offset + 16, safeFloat(point.value), true);
    view.setFloat32(offset + 20, safeFloat(point.confidence_score, 70), true);
    view.setFloat32(offset + 24, safeFloat(point.freshness_age_seconds), true);
    view.setUint32(offset + 28, weatherFlags(point), true);
    view.setUint32(offset + 32, hashString(point.parameter_id || ''), true);
    view.setUint32(offset + 36, hashString(point.source_id || point.source_name || ''), true);
    view.setUint32(offset + 40, hashString(point.unit || ''), true);
  });
}

export function encodeHazardsLiveBinary(hazards) {
  const rows = Array.isArray(hazards) ? hazards.filter(hasHazardPoint) : [];
  return encodeRecords(rows, KINDS.hazards, HAZARD_RECORD_BYTES, (view, offset, hazard) => {
    view.setUint32(offset, hashString(hazard.event_id || hazard.record_id || hazard.title || ''), true);
    view.setInt32(offset + 4, safeEpochSeconds(hazard.time_index || hazard.valid_time || hazard.observed_time || hazard.updated_time), true);
    view.setFloat32(offset + 8, safeFloat(hazard.latitude ?? hazard.centroid_latitude), true);
    view.setFloat32(offset + 12, safeFloat(hazard.longitude ?? hazard.centroid_longitude), true);
    view.setFloat32(offset + 16, safeFloat(hazard.severity_score, severityScoreFallback(hazard.severity)), true);
    view.setFloat32(offset + 20, safeFloat(hazard.magnitude), true);
    view.setFloat32(offset + 24, safeFloat(hazard.confidence_score, 70), true);
    view.setUint32(offset + 28, hazardFlags(hazard), true);
    view.setUint32(offset + 32, hashString(hazard.event_type || hazard.hazard_type || hazard.parameter_id || ''), true);
    view.setUint32(offset + 36, hashString(hazard.source_id || hazard.source_name || ''), true);
    view.setUint32(offset + 40, hashString(hazard.status || ''), true);
  });
}

function encodeRecords(rows, kind, recordBytes, writer) {
  const buffer = Buffer.allocUnsafe(HEADER_BYTES + rows.length * recordBytes);
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  view.setUint32(0, MAGIC, true);
  view.setUint16(4, VERSION, true);
  view.setUint16(6, kind, true);
  view.setUint32(8, rows.length, true);
  view.setUint32(12, recordBytes, true);

  rows.forEach((row, index) => writer(view, HEADER_BYTES + index * recordBytes, row));
  return buffer;
}

function hasPoint(row) {
  return Number.isFinite(Number(row?.latitude)) && Number.isFinite(Number(row?.longitude));
}

function hasHazardPoint(row) {
  const latitude = Number(row?.latitude ?? row?.centroid_latitude);
  const longitude = Number(row?.longitude ?? row?.centroid_longitude);
  return Number.isFinite(latitude) && Number.isFinite(longitude);
}

function safeFloat(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function safeInteger(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : fallback;
}

function safeEpochSeconds(value) {
  const parsed = Number(value);
  if (Number.isFinite(parsed) && parsed > 0) return Math.floor(parsed);
  const date = Date.parse(String(value || ''));
  if (Number.isFinite(date)) return Math.floor(date / 1000);
  return Math.floor(Date.now() / 1000);
}

function parseHexId(value) {
  const parsed = Number.parseInt(String(value || '').replace(/[^a-fA-F0-9]/g, '').slice(0, 8), 16);
  return Number.isFinite(parsed) ? parsed >>> 0 : hashString(String(value || ''));
}

function hashString(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function flightFlags(flight) {
  return (
    (flight.is_military ? 1 : 0) |
    (flight.is_active_emergency ? 2 : 0) |
    (flight.is_interesting ? 4 : 0) |
    (flight.is_pia ? 8 : 0) |
    (flight.is_ladd ? 16 : 0) |
    (flight.on_ground ? 32 : 0)
  ) >>> 0;
}

function satelliteFlags(satellite) {
  const category = String(satellite.mission_category || '').toUpperCase();
  const objectType = String(satellite.object_type || '').toUpperCase();
  const constellation = String(satellite.constellation_id || satellite.object_name || '').toUpperCase();
  const altitudeKm = safeFloat(satellite.altitude_km);
  return (
    (category === 'SIGINT' ? 1 : 0) |
    (category === 'NAV' ? 2 : 0) |
    (category === 'COMMS' ? 4 : 0) |
    (category === 'WEATHER' ? 8 : 0) |
    (satellite.decay_status === 'DECAYING' ? 16 : 0) |
    (objectType.includes('DEBRIS') ? 32 : 0) |
    (objectType.includes('ROCKET') ? 64 : 0) |
    (objectType.includes('PAYLOAD') ? 128 : 0) |
    (constellation.includes('STARLINK') ? 256 : 0) |
    (constellation.includes('ONEWEB') ? 512 : 0) |
    (constellation.includes('IRIDIUM') ? 1024 : 0) |
    (altitudeKm > 0 && altitudeKm < 2000 ? 2048 : 0) |
    (altitudeKm >= 2000 && altitudeKm < 30000 ? 4096 : 0) |
    (altitudeKm >= 30000 ? 8192 : 0)
  ) >>> 0;
}

function shipFlags(ship) {
  return (
    (ship.risk_status === 'RISK' ? 1 : 0) |
    (ship.nearest_cable_id ? 2 : 0)
  ) >>> 0;
}

function weatherFlags(point) {
  const parameter = String(point.parameter_id || point.display_name || '').toLowerCase();
  const family = String(point.data_family || point.category || '').toLowerCase();
  return (
    (parameter.includes('temperature') || parameter.includes('temp') ? 1 : 0) |
    (parameter.includes('wind') ? 2 : 0) |
    (parameter.includes('humidity') ? 4 : 0) |
    (parameter.includes('precip') || parameter.includes('rain') ? 8 : 0) |
    (parameter.includes('pressure') || parameter.includes('mslp') ? 16 : 0) |
    (family.includes('air') || parameter.includes('pm') || parameter.includes('aqi') ? 32 : 0) |
    (family.includes('hydro') || parameter.includes('water') || parameter.includes('river') ? 64 : 0) |
    (point.forecast_time ? 128 : 0) |
    (safeFloat(point.freshness_age_seconds) > 21600 ? 256 : 0)
  ) >>> 0;
}

function hazardFlags(hazard) {
  const type = String(hazard.event_type || hazard.hazard_type || hazard.parameter_id || hazard.title || '').toLowerCase();
  const severity = String(hazard.severity || '').toLowerCase();
  return (
    (type.includes('earthquake') ? 1 : 0) |
    (type.includes('volcano') ? 2 : 0) |
    (type.includes('fire') || type.includes('firms') ? 4 : 0) |
    (type.includes('storm') || type.includes('cyclone') || type.includes('tornado') ? 8 : 0) |
    (type.includes('flood') || type.includes('hydro') || type.includes('water') ? 16 : 0) |
    (type.includes('air') || type.includes('smoke') ? 32 : 0) |
    (['extreme', 'critical', 'high', 'severe'].includes(severity) ? 64 : 0) |
    (['moderate', 'medium'].includes(severity) ? 128 : 0) |
    (['minor', 'low'].includes(severity) ? 256 : 0) |
    (String(hazard.status || '').toLowerCase() === 'active' ? 512 : 0)
  ) >>> 0;
}

function severityScoreFallback(severity) {
  switch (String(severity || '').toLowerCase()) {
    case 'extreme':
    case 'critical':
      return 95;
    case 'high':
    case 'severe':
      return 82;
    case 'moderate':
    case 'medium':
      return 60;
    case 'minor':
    case 'low':
      return 35;
    default:
      return 50;
  }
}

const MAGIC = 0x47453242; // GE2B
const VERSION = 1;
const HEADER_BYTES = 16;

export const LIVE_BINARY_CONTENT_TYPE = 'application/vnd.god-eyes.live+octet-stream; version=1';

const KINDS = {
  flights: 1,
  satellites: 2,
  maritime: 3,
};

const FLIGHT_RECORD_BYTES = 40;
const SATELLITE_RECORD_BYTES = 40;
const MARITIME_RECORD_BYTES = 36;

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
  return (
    (category === 'SIGINT' ? 1 : 0) |
    (category === 'NAV' ? 2 : 0) |
    (category === 'COMMS' ? 4 : 0) |
    (category === 'WEATHER' ? 8 : 0) |
    (satellite.decay_status === 'DECAYING' ? 16 : 0)
  ) >>> 0;
}

function shipFlags(ship) {
  return (
    (ship.risk_status === 'RISK' ? 1 : 0) |
    (ship.nearest_cable_id ? 2 : 0)
  ) >>> 0;
}

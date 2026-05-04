import type { FlightRecord } from '../../earth/flights/flights';

const MAGIC = 0x47453242;
const HEADER_BYTES = 16;
const FLIGHT_RECORD_BYTES = 40;

export function decodeFlightLiveBinary(buffer: ArrayBuffer): FlightRecord[] {
  const view = new DataView(buffer);
  if (buffer.byteLength < HEADER_BYTES || view.getUint32(0, true) !== MAGIC) {
    throw new Error('Invalid God Eyes live binary payload.');
  }

  const kind = view.getUint16(6, true);
  const count = view.getUint32(8, true);
  const recordBytes = view.getUint32(12, true);
  if (kind !== 1 || recordBytes !== FLIGHT_RECORD_BYTES) {
    throw new Error(`Unexpected live binary payload kind=${kind} recordBytes=${recordBytes}.`);
  }

  const flights: FlightRecord[] = [];
  for (let index = 0; index < count; index += 1) {
    const offset = HEADER_BYTES + index * recordBytes;
    const flags = view.getUint32(offset + 32, true);
    const id = view.getUint32(offset, true).toString(16).padStart(6, '0');
    flights.push({
      id_icao: id,
      callsign: id.toUpperCase(),
      registration: null,
      aircraft_type: null,
      description: null,
      owner_operator: null,
      country_origin: null,
      vehicle_type: 'aircraft',
      vehicle_subtype: flags & 1 ? 'military' : 'unknown',
      operation_type: flags & 2 ? 'emergency' : 'normal',
      operation_subtype: 'live-binary',
      latitude: view.getFloat32(offset + 8, true),
      longitude: view.getFloat32(offset + 12, true),
      altitude_baro_m: view.getFloat32(offset + 16, true),
      altitude_geom_m: null,
      velocity_mps: view.getFloat32(offset + 20, true),
      heading_true_deg: view.getFloat32(offset + 24, true),
      heading_mag_deg: null,
      vertical_rate_mps: view.getFloat32(offset + 28, true),
      on_ground: Boolean(flags & 32),
      squawk: null,
      is_active_emergency: Boolean(flags & 2),
      emergency_status: flags & 2 ? 'ACTIVE' : 'NONE',
      is_military: Boolean(flags & 1),
      is_interesting: Boolean(flags & 4),
      is_pia: Boolean(flags & 8),
      is_ladd: Boolean(flags & 16),
      data_source: 'god-eyes-live-binary',
      timestamp: view.getInt32(offset + 4, true),
    });
  }
  return flights;
}

import type { FlightRecord } from '../../earth/flights/flights';
import type { ApiPointRecord } from './intelApi';

const MAGIC = 0x47453242;
const HEADER_BYTES = 16;
const FLIGHT_RECORD_BYTES = 40;
const SATELLITE_RECORD_BYTES = 40;
const MARITIME_RECORD_BYTES = 36;
const WEATHER_RECORD_BYTES = 44;
const HAZARD_RECORD_BYTES = 44;

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

export function decodeSatelliteLiveBinary(buffer: ArrayBuffer): ApiPointRecord[] {
  const view = assertBinaryHeader(buffer, 2, SATELLITE_RECORD_BYTES);
  const count = view.getUint32(8, true);
  const satellites: ApiPointRecord[] = [];

  for (let index = 0; index < count; index += 1) {
    const offset = HEADER_BYTES + index * SATELLITE_RECORD_BYTES;
    const flags = view.getUint32(offset + 32, true);
    const noradId = view.getUint32(offset, true);
    const missionCategory = satelliteMissionCategory(flags);
    const objectType = satelliteObjectType(flags);
    const constellationId = satelliteConstellation(flags);
    const orbitClass = satelliteOrbitClass(flags);
    satellites.push({
      id_norad: noradId,
      object_name: satelliteLabel(noradId, constellationId, missionCategory, objectType),
      latitude: view.getFloat32(offset + 8, true),
      longitude: view.getFloat32(offset + 12, true),
      altitude_km: view.getFloat32(offset + 16, true),
      velocity_kps: view.getFloat32(offset + 20, true),
      timestamp: view.getInt32(offset + 4, true),
      parameter_id: missionCategory === 'WEATHER' ? 'weather-satellite' : 'orbital-object',
      data_source: 'god-eyes-live-binary',
      payload: {
        inclination_deg: view.getFloat32(offset + 24, true),
        period_minutes: view.getFloat32(offset + 28, true),
        mission_flags: flags,
        mission_category: missionCategory,
        object_type: objectType,
        constellation_id: constellationId,
        orbit_class: orbitClass,
        decay_status: flags & 16 ? 'DECAYING' : 'STABLE',
      },
    });
  }

  return satellites;
}

export function decodeMaritimeLiveBinary(buffer: ArrayBuffer): ApiPointRecord[] {
  const view = assertBinaryHeader(buffer, 3, MARITIME_RECORD_BYTES);
  const count = view.getUint32(8, true);
  const ships: ApiPointRecord[] = [];

  for (let index = 0; index < count; index += 1) {
    const offset = HEADER_BYTES + index * MARITIME_RECORD_BYTES;
    const flags = view.getUint32(offset + 28, true);
    const vesselId = view.getUint32(offset, true).toString(36).toUpperCase();
    ships.push({
      vessel_id: vesselId,
      name: `Vessel ${vesselId}`,
      latitude: view.getFloat32(offset + 8, true),
      longitude: view.getFloat32(offset + 12, true),
      speed_knots: view.getFloat32(offset + 16, true),
      heading_deg: view.getFloat32(offset + 20, true),
      nearest_cable_distance_m: view.getFloat32(offset + 24, true),
      risk_status: flags & 1 ? 'RISK' : 'NORMAL',
      timestamp: view.getInt32(offset + 4, true),
      data_source: 'god-eyes-live-binary',
      payload: {
        nearest_cable_hash: view.getUint32(offset + 32, true),
        risk_flags: flags,
      },
    });
  }

  return ships;
}

export function decodeWeatherLiveBinary(buffer: ArrayBuffer): ApiPointRecord[] {
  const view = assertBinaryHeader(buffer, 4, WEATHER_RECORD_BYTES);
  const count = view.getUint32(8, true);
  const points: ApiPointRecord[] = [];

  for (let index = 0; index < count; index += 1) {
    const offset = HEADER_BYTES + index * WEATHER_RECORD_BYTES;
    const flags = view.getUint32(offset + 28, true);
    const timestamp = view.getInt32(offset + 4, true);
    const parameter = weatherParameter(flags);
    points.push({
      record_id: `wx-${view.getUint32(offset, true).toString(36)}`,
      parameter_id: parameter,
      title: weatherLabel(parameter),
      latitude: view.getFloat32(offset + 8, true),
      longitude: view.getFloat32(offset + 12, true),
      value: view.getFloat32(offset + 16, true),
      unit: weatherUnit(parameter),
      timestamp,
      observed_time: new Date(timestamp * 1000).toISOString(),
      data_source: 'god-eyes-live-binary',
      payload: {
        confidence_score: view.getFloat32(offset + 20, true),
        freshness_age_seconds: view.getFloat32(offset + 24, true),
        parameter_hash: view.getUint32(offset + 32, true),
        source_hash: view.getUint32(offset + 36, true),
        unit_hash: view.getUint32(offset + 40, true),
        weather_flags: flags,
        is_forecast: Boolean(flags & 128),
        is_stale: Boolean(flags & 256),
      },
    });
  }

  return points;
}

export function decodeHazardLiveBinary(buffer: ArrayBuffer): ApiPointRecord[] {
  const view = assertBinaryHeader(buffer, 5, HAZARD_RECORD_BYTES);
  const count = view.getUint32(8, true);
  const hazards: ApiPointRecord[] = [];

  for (let index = 0; index < count; index += 1) {
    const offset = HEADER_BYTES + index * HAZARD_RECORD_BYTES;
    const flags = view.getUint32(offset + 28, true);
    const timestamp = view.getInt32(offset + 4, true);
    const eventType = hazardEventType(flags);
    const severity = hazardSeverity(flags, view.getFloat32(offset + 16, true));
    hazards.push({
      record_id: `hz-${view.getUint32(offset, true).toString(36)}`,
      event_id: `hz-${view.getUint32(offset, true).toString(36)}`,
      title: hazardLabel(eventType, severity),
      event_type: eventType,
      severity,
      latitude: view.getFloat32(offset + 8, true),
      longitude: view.getFloat32(offset + 12, true),
      centroid_latitude: view.getFloat32(offset + 8, true),
      centroid_longitude: view.getFloat32(offset + 12, true),
      value: view.getFloat32(offset + 16, true),
      timestamp,
      observed_time: new Date(timestamp * 1000).toISOString(),
      data_source: 'god-eyes-live-binary',
      payload: {
        severity_score: view.getFloat32(offset + 16, true),
        magnitude: view.getFloat32(offset + 20, true),
        confidence_score: view.getFloat32(offset + 24, true),
        event_hash: view.getUint32(offset + 32, true),
        source_hash: view.getUint32(offset + 36, true),
        status_hash: view.getUint32(offset + 40, true),
        hazard_flags: flags,
      },
    });
  }

  return hazards;
}

function assertBinaryHeader(buffer: ArrayBuffer, expectedKind: number, expectedRecordBytes: number) {
  const view = new DataView(buffer);
  if (buffer.byteLength < HEADER_BYTES || view.getUint32(0, true) !== MAGIC) {
    throw new Error('Invalid God Eyes live binary payload.');
  }

  const kind = view.getUint16(6, true);
  const recordBytes = view.getUint32(12, true);
  if (kind !== expectedKind || recordBytes !== expectedRecordBytes) {
    throw new Error(`Unexpected live binary payload kind=${kind} recordBytes=${recordBytes}.`);
  }
  return view;
}

function satelliteMissionCategory(flags: number) {
  if (flags & 1) return 'SIGINT';
  if (flags & 2) return 'NAV';
  if (flags & 4) return 'COMMS';
  if (flags & 8) return 'WEATHER';
  return 'OTHER';
}

function satelliteObjectType(flags: number) {
  if (flags & 32) return 'DEBRIS';
  if (flags & 64) return 'ROCKET BODY';
  if (flags & 128) return 'PAYLOAD';
  return 'UNKNOWN';
}

function satelliteConstellation(flags: number) {
  if (flags & 256) return 'STARLINK';
  if (flags & 512) return 'ONEWEB';
  if (flags & 1024) return 'IRIDIUM';
  return 'INDEPENDENT';
}

function satelliteOrbitClass(flags: number) {
  if (flags & 2048) return 'LEO';
  if (flags & 4096) return 'MEO';
  if (flags & 8192) return 'GEO';
  return 'UNKNOWN';
}

function satelliteLabel(noradId: number, constellationId: string, missionCategory: string, objectType: string) {
  if (constellationId !== 'INDEPENDENT') return `${constellationId} ${noradId}`;
  if (missionCategory !== 'OTHER') return `${missionCategory} SAT-${noradId}`;
  if (objectType !== 'UNKNOWN') return `${objectType} ${noradId}`;
  return `SAT-${noradId}`;
}

function weatherParameter(flags: number) {
  if (flags & 1) return 'temperature_2m';
  if (flags & 2) return 'wind_10m';
  if (flags & 4) return 'relative_humidity_2m';
  if (flags & 8) return 'precipitation';
  if (flags & 16) return 'pressure_mslp';
  if (flags & 32) return 'air_quality';
  if (flags & 64) return 'hydrology';
  return 'weather_observation';
}

function weatherLabel(parameter: string) {
  switch (parameter) {
    case 'temperature_2m':
      return 'Temperature observation';
    case 'wind_10m':
      return 'Wind observation';
    case 'relative_humidity_2m':
      return 'Humidity observation';
    case 'precipitation':
      return 'Precipitation observation';
    case 'pressure_mslp':
      return 'Pressure observation';
    case 'air_quality':
      return 'Air quality observation';
    case 'hydrology':
      return 'Hydrology observation';
    default:
      return 'Weather observation';
  }
}

function weatherUnit(parameter: string) {
  switch (parameter) {
    case 'temperature_2m':
      return 'C';
    case 'wind_10m':
      return 'm/s';
    case 'relative_humidity_2m':
      return '%';
    case 'pressure_mslp':
      return 'hPa';
    default:
      return undefined;
  }
}

function hazardEventType(flags: number) {
  if (flags & 1) return 'earthquake';
  if (flags & 2) return 'volcano';
  if (flags & 4) return 'wildfire';
  if (flags & 8) return 'storm';
  if (flags & 16) return 'flood';
  if (flags & 32) return 'air_quality';
  return 'hazard';
}

function hazardSeverity(flags: number, score: number) {
  if (flags & 64) return 'high';
  if (flags & 128) return 'moderate';
  if (flags & 256) return 'low';
  if (score >= 75) return 'high';
  if (score >= 45) return 'moderate';
  return 'low';
}

function hazardLabel(eventType: string, severity: string) {
  return `${severity.charAt(0).toUpperCase()}${severity.slice(1)} ${eventType.replace('_', ' ')}`;
}

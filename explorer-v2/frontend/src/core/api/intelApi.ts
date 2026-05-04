const API_BASE = import.meta.env.VITE_API_BASE?.trim() || import.meta.env.VITE_FLIGHT_API_BASE?.trim() || '';

export interface ApiPointRecord {
  id?: string;
  record_id?: string;
  event_id?: string;
  id_norad?: string | number;
  vessel_id?: string;
  node_id?: string;
  asset_id?: string;
  object_name?: string;
  title?: string;
  name?: string;
  parameter_id?: string;
  event_type?: string;
  severity?: string;
  latitude?: number;
  longitude?: number;
  centroid_latitude?: number;
  centroid_longitude?: number;
  altitude_km?: number;
  value?: number;
  unit?: string;
  timestamp?: number;
  observed_time?: string;
  time_index?: string;
  payload?: Record<string, unknown>;
}

export interface InfrastructureCable {
  asset_id?: string;
  cable_id?: string;
  name?: string;
  status?: string;
  segments?: Array<Array<{ lat: number; lon: number }>>;
}

export async function fetchApiJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, { signal });
  if (!response.ok) {
    throw new Error(`${path} returned ${response.status}`);
  }
  return (await response.json()) as T;
}

export function pointLat(record: ApiPointRecord) {
  return Number(record.latitude ?? record.centroid_latitude);
}

export function pointLon(record: ApiPointRecord) {
  return Number(record.longitude ?? record.centroid_longitude);
}

export function pointId(prefix: string, record: ApiPointRecord) {
  return String(
    record.id ??
      record.record_id ??
      record.event_id ??
      record.id_norad ??
      record.vessel_id ??
      record.node_id ??
      record.asset_id ??
      `${prefix}-${pointLat(record).toFixed(3)}-${pointLon(record).toFixed(3)}`,
  );
}

export function pointLabel(record: ApiPointRecord) {
  return String(
    record.object_name ??
      record.title ??
      record.name ??
      record.parameter_id ??
      record.event_type ??
      record.id_norad ??
      record.vessel_id ??
      record.asset_id ??
      'Live intelligence',
  );
}

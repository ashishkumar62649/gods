import { API_ROUTES, ENVIRONMENT } from '../config/endpoints';
import type {
  AirQualityIntelPoint,
  HazardIntelEvent,
  HydrologyIntelPoint,
  IntelMeta,
  IntelSnapshot,
  IntelSourceLineage,
  IntelSummary,
  SourceHealthRecentFile,
  SourceHealthRecord,
  WeatherIntelPoint,
} from '../types/intel';

const INTEL_TIMEOUT_MS = 12_000;

export interface FetchIntelSnapshotOptions {
  weatherLimit?: number;
  hazardLimit?: number;
  airQualityLimit?: number;
  hydrologyLimit?: number;
  sourceLimit?: number;
}

export async function fetchWeatherIntelSnapshot(
  options: FetchIntelSnapshotOptions = {},
): Promise<IntelSnapshot> {
  const [
    summary,
    weatherPayload,
    hazardsPayload,
    airQualityPayload,
    hydrologyPayload,
    sourcePayload,
  ] = await Promise.all([
    fetchIntelPayload(API_ROUTES.LOCAL_INTEL_SUMMARY),
    fetchIntelPayload(withLimit(API_ROUTES.LOCAL_INTEL_WEATHER_CURRENT, options.weatherLimit ?? 220)),
    fetchIntelPayload(withLimit(API_ROUTES.LOCAL_INTEL_HAZARDS_ACTIVE, options.hazardLimit ?? 280)),
    fetchIntelPayload(withLimit(API_ROUTES.LOCAL_INTEL_AIR_QUALITY_LATEST, options.airQualityLimit ?? 320)),
    fetchIntelPayload(withLimit(API_ROUTES.LOCAL_INTEL_HYDROLOGY_LATEST, options.hydrologyLimit ?? 80)),
    fetchIntelPayload(withLimit(API_ROUTES.LOCAL_INTEL_SOURCE_HEALTH, options.sourceLimit ?? 32)),
  ]);

  return {
    summary: normalizeSummary(summary),
    weather: readArrayPayload(weatherPayload, 'weather').map(normalizeWeatherPoint),
    hazards: readArrayPayload(hazardsPayload, 'hazards').map(normalizeHazardEvent),
    airQuality: readArrayPayload(airQualityPayload, 'airQuality').map(normalizeAirQualityPoint),
    hydrology: readArrayPayload(hydrologyPayload, 'hydrology').map(normalizeHydrologyPoint),
    sources: readArrayPayload(sourcePayload, 'sources').map(normalizeSourceHealth),
    fetchedAt: Date.now(),
  };
}

export async function fetchCurrentWeatherIntel(limit = 220): Promise<WeatherIntelPoint[]> {
  const payload = await fetchIntelPayload(withLimit(API_ROUTES.LOCAL_INTEL_WEATHER_CURRENT, limit));
  return readArrayPayload(payload, 'weather').map(normalizeWeatherPoint);
}

export async function fetchActiveHazardIntel(limit = 280): Promise<HazardIntelEvent[]> {
  const payload = await fetchIntelPayload(withLimit(API_ROUTES.LOCAL_INTEL_HAZARDS_ACTIVE, limit));
  return readArrayPayload(payload, 'hazards').map(normalizeHazardEvent);
}

export async function fetchSourceHealth(limit = 32): Promise<SourceHealthRecord[]> {
  const payload = await fetchIntelPayload(withLimit(API_ROUTES.LOCAL_INTEL_SOURCE_HEALTH, limit));
  return readArrayPayload(payload, 'sources').map(normalizeSourceHealth);
}

async function fetchIntelPayload(path: string): Promise<unknown> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), INTEL_TIMEOUT_MS);

  try {
    const response = await fetch(toApiUrl(path), { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`Intel endpoint returned ${response.status}`);
    }
    return await response.json();
  } finally {
    window.clearTimeout(timeoutId);
  }
}

function toApiUrl(path: string) {
  const base = ENVIRONMENT.API_BASE;
  return base ? `${base}${path}` : path;
}

function withLimit(path: string, limit: number) {
  const separator = path.includes('?') ? '&' : '?';
  return `${path}${separator}limit=${encodeURIComponent(String(limit))}`;
}

function normalizeSummary(payload: unknown): IntelSummary | null {
  if (!isRecord(payload)) return null;
  const countsRaw = isRecord(payload.counts) ? payload.counts : {};
  const counts = Object.fromEntries(
    Object.entries(countsRaw).map(([key, value]) => [
      key,
      Number.isFinite(Number(value)) ? Number(value) : 0,
    ]),
  );
  return {
    generatedAt: readString(payload, 'generatedAt') || new Date().toISOString(),
    counts,
  };
}

function normalizeWeatherPoint(record: Record<string, unknown>): WeatherIntelPoint {
  return {
    ...normalizePointBase(record),
    valueKind: readNullableString(record, 'value_kind'),
  };
}

function normalizeAirQualityPoint(record: Record<string, unknown>): AirQualityIntelPoint {
  return {
    ...normalizePointBase(record),
    stationId: readNullableString(record, 'station_id'),
    originalValue: readNullableString(record, 'original_value'),
    originalUnit: readNullableString(record, 'original_unit'),
  };
}

function normalizeHydrologyPoint(record: Record<string, unknown>): HydrologyIntelPoint {
  return {
    ...normalizePointBase(record),
    stationId: readNullableString(record, 'station_id'),
    originalValue: readNullableString(record, 'original_value'),
    originalUnit: readNullableString(record, 'original_unit'),
  };
}

function normalizePointBase(record: Record<string, unknown>) {
  const point = readPoint(record);
  return {
    id: readString(record, 'record_id') || `${readString(record, 'source_id')}:${readString(record, 'parameter_id')}:${point.latitude}:${point.longitude}`,
    parameterId: readString(record, 'parameter_id'),
    displayName: readString(record, 'display_name') || readString(record, 'parameter_id'),
    sourceId: readString(record, 'source_id'),
    sourceName: readString(record, 'source_name') || readString(record, 'source_id'),
    value: readNullableNumber(record, 'value'),
    unit: readNullableString(record, 'unit'),
    latitude: point.latitude,
    longitude: point.longitude,
    observedTime: readNullableString(record, 'observed_time'),
    validTime: readNullableString(record, 'valid_time'),
    forecastTime: readNullableString(record, 'forecast_time'),
    timeIndex: readNullableString(record, 'time_index'),
    confidenceScore: readNullableNumber(record, 'confidence_score'),
    qualityFlag: readNullableString(record, 'quality_flag'),
    freshnessAgeSeconds: readNullableNumber(record, 'freshness_age_seconds'),
    sourceLineage: normalizeSourceLineage(record.source_lineage),
    payload: isRecord(record.payload) ? record.payload : null,
  };
}

function normalizeHazardEvent(record: Record<string, unknown>): HazardIntelEvent {
  const point = readPoint(record, 'centroid_latitude', 'centroid_longitude');
  return {
    id: readString(record, 'record_id') || readString(record, 'event_id'),
    parameterId: readString(record, 'parameter_id'),
    displayName: readString(record, 'display_name') || readString(record, 'parameter_id'),
    sourceId: readString(record, 'source_id'),
    sourceName: readString(record, 'source_name') || readString(record, 'source_id'),
    eventType: readString(record, 'event_type') || 'hazard',
    eventId: readNullableString(record, 'event_id'),
    title: readString(record, 'title') || readString(record, 'event_type') || 'Hazard event',
    description: readNullableString(record, 'description'),
    hazardType: readNullableString(record, 'hazard_type'),
    severity: readNullableString(record, 'severity'),
    severityScore: readNullableNumber(record, 'severity_score'),
    magnitude: readNullableNumber(record, 'magnitude'),
    category: readNullableString(record, 'category'),
    status: readNullableString(record, 'status'),
    startedAt: readNullableString(record, 'started_at'),
    observedTime: readNullableString(record, 'observed_time'),
    validTime: readNullableString(record, 'valid_time'),
    updatedTime: readNullableString(record, 'updated_time'),
    endedAt: readNullableString(record, 'ended_at'),
    expiresTime: readNullableString(record, 'expires_time'),
    timeIndex: readNullableString(record, 'time_index'),
    latitude: point.latitude,
    longitude: point.longitude,
    value: readNullableNumber(record, 'value'),
    unit: readNullableString(record, 'unit'),
    confidenceScore: readNullableNumber(record, 'confidence_score'),
    qualityFlag: readNullableString(record, 'quality_flag'),
    freshnessAgeSeconds: readNullableNumber(record, 'freshness_age_seconds'),
    sourceLineage: normalizeSourceLineage(record.source_lineage),
    payload: isRecord(record.payload) ? record.payload : null,
  };
}

function normalizeSourceHealth(record: Record<string, unknown>): SourceHealthRecord {
  const recentFilesRaw = Array.isArray(record.recent_files)
    ? record.recent_files.filter(isRecord)
    : [];
  return {
    sourceId: readString(record, 'source_id'),
    sourceName: readString(record, 'source_name') || readString(record, 'source_id'),
    sourceFamily: readString(record, 'source_family') || 'unknown',
    rawFileCount: readNumber(record, 'raw_file_count'),
    successCount: readNumber(record, 'success_count'),
    duplicateCount: readNumber(record, 'duplicate_count'),
    failureCount: readNumber(record, 'failure_count'),
    latestFetchedAt: readNullableString(record, 'latest_fetched_at'),
    latestAgeSeconds: readNullableNumber(record, 'latest_age_seconds'),
    recentFiles: recentFilesRaw.slice(0, 6).map(normalizeRecentFile),
  };
}

function normalizeRecentFile(record: Record<string, unknown>): SourceHealthRecentFile {
  return {
    dataType: readNullableString(record, 'data_type'),
    status: readNullableString(record, 'status'),
    fetchedAt: readNullableString(record, 'fetched_at'),
    rawFilePath: readNullableString(record, 'raw_file_path'),
    checksumSha256: readNullableString(record, 'checksum_sha256'),
  };
}

function normalizeSourceLineage(value: unknown): IntelSourceLineage | null {
  if (!isRecord(value)) return null;
  return {
    rawFileId: readString(value, 'raw_file_id'),
    rawFilePath: readNullableString(value, 'raw_file_path'),
    metadataPath: readNullableString(value, 'metadata_path'),
    checksumSha256: readNullableString(value, 'checksum_sha256'),
    endpoint: readNullableString(value, 'endpoint'),
    fetchedAt: readNullableString(value, 'fetched_at'),
    contentType: readNullableString(value, 'content_type'),
    bytes: readNullableNumber(value, 'bytes'),
  };
}

function readPoint(
  record: Record<string, unknown>,
  latKey = 'latitude',
  lonKey = 'longitude',
) {
  let latitude = readNumber(record, latKey);
  let longitude = readNumber(record, lonKey);
  const geometry = isRecord(record.geometry) ? record.geometry : null;
  const coordinates = Array.isArray(geometry?.coordinates) ? geometry.coordinates : null;
  if ((!Number.isFinite(latitude) || !Number.isFinite(longitude)) && coordinates) {
    longitude = Number(coordinates[0]);
    latitude = Number(coordinates[1]);
  }
  return { latitude, longitude };
}

function readArrayPayload(payload: unknown, key: string): Record<string, unknown>[] {
  if (Array.isArray(payload)) return payload.filter(isRecord);
  if (isRecord(payload) && Array.isArray(payload[key])) return payload[key].filter(isRecord);
  return [];
}

function readString(record: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    const text = typeof value === 'string' ? value.trim() : String(value ?? '').trim();
    if (text) return text;
  }
  return '';
}

function readNullableString(record: Record<string, unknown>, ...keys: string[]) {
  const value = readString(record, ...keys);
  return value || null;
}

function readNumber(record: Record<string, unknown>, ...keys: string[]) {
  const value = Number(keys.map((key) => record[key]).find((candidate) => candidate != null));
  return Number.isFinite(value) ? value : 0;
}

function readNullableNumber(record: Record<string, unknown>, ...keys: string[]) {
  const value = Number(keys.map((key) => record[key]).find((candidate) => candidate != null));
  return Number.isFinite(value) ? value : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}

void ({} satisfies Partial<IntelMeta>);

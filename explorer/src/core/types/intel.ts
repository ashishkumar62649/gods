export type IntelLayerKey = 'weather' | 'hazards' | 'airQuality' | 'hydrology';
export type IntelFeedStatus = 'idle' | 'loading' | 'live' | 'error';

export interface IntelMeta {
  count: number;
  timestamp: number;
  query: Record<string, string>;
}

export interface IntelSourceLineage {
  rawFileId: string;
  rawFilePath: string | null;
  metadataPath: string | null;
  checksumSha256: string | null;
  endpoint: string | null;
  fetchedAt: string | null;
  contentType: string | null;
  bytes: number | null;
}

export interface IntelPointRecord {
  id: string;
  parameterId: string;
  displayName: string;
  sourceId: string;
  sourceName: string;
  value: number | null;
  unit: string | null;
  latitude: number;
  longitude: number;
  observedTime: string | null;
  validTime: string | null;
  forecastTime: string | null;
  timeIndex: string | null;
  confidenceScore: number | null;
  qualityFlag: string | null;
  freshnessAgeSeconds: number | null;
  sourceLineage: IntelSourceLineage | null;
  payload: Record<string, unknown> | null;
}

export interface WeatherIntelPoint extends IntelPointRecord {
  valueKind: string | null;
}

export interface AirQualityIntelPoint extends IntelPointRecord {
  stationId: string | null;
  originalValue: string | null;
  originalUnit: string | null;
}

export interface HydrologyIntelPoint extends IntelPointRecord {
  stationId: string | null;
  originalValue: string | null;
  originalUnit: string | null;
}

export interface HazardIntelEvent {
  id: string;
  parameterId: string;
  displayName: string;
  sourceId: string;
  sourceName: string;
  eventType: string;
  eventId: string | null;
  title: string;
  description: string | null;
  hazardType: string | null;
  severity: string | null;
  severityScore: number | null;
  magnitude: number | null;
  category: string | null;
  status: string | null;
  startedAt: string | null;
  observedTime: string | null;
  validTime: string | null;
  updatedTime: string | null;
  endedAt: string | null;
  expiresTime: string | null;
  timeIndex: string | null;
  latitude: number;
  longitude: number;
  value: number | null;
  unit: string | null;
  confidenceScore: number | null;
  qualityFlag: string | null;
  freshnessAgeSeconds: number | null;
  sourceLineage: IntelSourceLineage | null;
  payload: Record<string, unknown> | null;
}

export interface SourceHealthRecentFile {
  dataType: string | null;
  status: string | null;
  fetchedAt: string | null;
  rawFilePath: string | null;
  checksumSha256: string | null;
}

export interface SourceHealthRecord {
  sourceId: string;
  sourceName: string;
  sourceFamily: string;
  rawFileCount: number;
  successCount: number;
  duplicateCount: number;
  failureCount: number;
  latestFetchedAt: string | null;
  latestAgeSeconds: number | null;
  recentFiles: SourceHealthRecentFile[];
}

export interface IntelSummary {
  generatedAt: string;
  counts: Record<string, number>;
}

export interface IntelSnapshot {
  summary: IntelSummary | null;
  weather: WeatherIntelPoint[];
  hazards: HazardIntelEvent[];
  airQuality: AirQualityIntelPoint[];
  hydrology: HydrologyIntelPoint[];
  sources: SourceHealthRecord[];
  fetchedAt: number;
}

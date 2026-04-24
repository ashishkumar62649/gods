export type MaritimeVesselType = 'CARGO' | 'BUNKER_OR_TANKER';

export interface MaritimeVesselRecord {
  mmsi: string | null;
  name: string;
  lat: number;
  lon: number;
  timestamp: string;
  type: MaritimeVesselType;
  speedKn?: number;
  headingDeg?: number;
}

export interface MaritimeFeedMeta {
  count: number;
  fetchedAt: string | null;
  source: string;
  error: string | null;
  loading?: boolean;
}

export interface MaritimeSnapshot {
  vessels: MaritimeVesselRecord[];
  meta: MaritimeFeedMeta;
}

export type MaritimeFeedStatus = 'idle' | 'loading' | 'live' | 'error';

export interface MaritimeFeedState {
  status: MaritimeFeedStatus;
  sourceLabel: string;
  message: string;
  fetchedAt: string | null;
  vesselCount: number;
}

const MARITIME_API_BASE = import.meta.env.VITE_FLIGHT_API_BASE?.trim() ?? '';

export const MARITIME_API_URL = `${MARITIME_API_BASE}/api/maritime`;
export const MARITIME_POLL_INTERVAL_MS = 15 * 60 * 1000;

export async function fetchMaritimeSnapshot(
  signal?: AbortSignal,
): Promise<MaritimeSnapshot> {
  const response = await fetch(MARITIME_API_URL, { signal });
  if (!response.ok) {
    throw new Error(`Maritime feed returned ${response.status}`);
  }

  return (await response.json()) as MaritimeSnapshot;
}

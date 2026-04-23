export interface InfrastructurePoint {
  lat: number;
  lon: number;
}

export interface GodsEyeInfrastructure {
  asset_id: string;
  name: string;
  operator: string | null;
  status: 'Active' | 'Breached';
  last_inspected_by: string | null;
  segments: InfrastructurePoint[][];
}

export interface GodsEyeShip {
  vessel_id: string;
  mmsi: string;
  name: string | null;
  vessel_type: string;
  latitude: number;
  longitude: number;
  speed_knots: number | null;
  heading_deg: number | null;
  timestamp: number;
  data_source: string;
  trail: InfrastructurePoint[];
  nearest_cable_id: string | null;
  nearest_cable_distance_m: number | null;
  risk_status: 'NORMAL' | 'RISK';
}

export interface InfrastructureNode {
  node_id: string;
  asset_id: string;
  vessel_id: string;
  latitude: number;
  longitude: number;
  reason: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  timestamp: number;
}

export interface InfrastructureFeedMeta {
  timestamp: number;
  cables?: {
    count: number;
    lastFetchAt: string | null;
    source: string | null;
    error: string | null;
  };
  ships?: {
    count: number;
    lastUpdateAt: string | null;
    source: string;
    connected: boolean;
    error: string | null;
  };
  nodes?: {
    count: number;
  };
}

export interface InfrastructureSnapshot {
  cables: GodsEyeInfrastructure[];
  ships: GodsEyeShip[];
  nodes: InfrastructureNode[];
  meta: InfrastructureFeedMeta;
}

export type InfrastructureFeedStatus = 'idle' | 'loading' | 'live' | 'error';

export interface InfrastructureFeedState {
  status: InfrastructureFeedStatus;
  sourceLabel: string;
  message: string;
  fetchedAt: string | null;
  cableCount: number;
  shipCount: number;
  nodeCount: number;
  riskShipCount: number;
}

const INFRASTRUCTURE_API_BASE = import.meta.env.VITE_FLIGHT_API_BASE?.trim() ?? '';

export const INFRASTRUCTURE_API_URL = `${INFRASTRUCTURE_API_BASE}/api/infrastructure`;
export const INFRASTRUCTURE_POLL_INTERVAL_MS = 5_000;

export async function fetchInfrastructureSnapshot(
  signal?: AbortSignal,
): Promise<InfrastructureSnapshot> {
  const response = await fetch(INFRASTRUCTURE_API_URL, { signal });
  if (!response.ok) {
    throw new Error(`Infrastructure feed returned ${response.status}`);
  }

  return (await response.json()) as InfrastructureSnapshot;
}

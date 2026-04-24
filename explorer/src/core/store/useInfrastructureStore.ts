import { create } from 'zustand';

export interface InfrastructurePoint {
  lat: number;
  lon: number;
}

export interface CableData {
  asset_id: string;
  name: string;
  operator: string | null;
  status: 'Active' | 'Breached';
  last_inspected_by: string | null;
  segments: InfrastructurePoint[][];
}

export interface InfrastructureShipData {
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

export interface InfrastructureNodeData {
  node_id: string;
  asset_id: string;
  vessel_id: string;
  latitude: number;
  longitude: number;
  reason: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  timestamp: number;
}

export interface InfrastructureState {
  cables: CableData[];
  ships: InfrastructureShipData[];
  nodes: InfrastructureNodeData[];
  cablesVisible: boolean;
  feedStatus: 'idle' | 'loading' | 'live' | 'error';
  message: string;
  cableCount: number;
  infrastructureShipCount: number;
  nodeCount: number;
}

export interface InfrastructureActions {
  setInfrastructureSnapshot(
    cables: CableData[],
    ships: InfrastructureShipData[],
    nodes: InfrastructureNodeData[],
  ): void;
  toggleCablesVisible(): void;
  setInfrastructureFeedStatus(
    status: InfrastructureState['feedStatus'],
    message?: string,
  ): void;
}

export type InfrastructureStore = InfrastructureState & InfrastructureActions;

export const useInfrastructureStore = create<InfrastructureStore>()((set) => ({
  cables: [],
  ships: [],
  nodes: [],
  cablesVisible: false,
  feedStatus: 'idle',
  message: 'Waiting for infrastructure feed.',
  cableCount: 0,
  infrastructureShipCount: 0,
  nodeCount: 0,

  setInfrastructureSnapshot: (cables, ships, nodes) =>
    set({
      cables,
      ships,
      nodes,
      cableCount: cables.length,
      infrastructureShipCount: ships.length,
      nodeCount: nodes.length,
    }),

  toggleCablesVisible: () =>
    set((state) => ({
      cablesVisible: !state.cablesVisible,
    })),

  setInfrastructureFeedStatus: (status, message) =>
    set({
      feedStatus: status,
      message: message ?? (status === 'live' ? 'Infrastructure feed is live.' : 'Waiting for infrastructure feed.'),
    }),
}));

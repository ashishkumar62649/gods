import type { RouteStop, AssetSource } from '../../data/contracts/assetContracts';

export interface AssetIntelligenceData {
  selectedAsset: {
    callsign: string;
    status: string;
    aircraft: string;
    badges: string[];
    metrics: Array<{ label: string; value: string }>;
  };
  route: RouteStop[];
  weatherAlongRoute: Array<{ leg: string; altitude: string; temp: string; condition: string }>;
  sourceProvenance: AssetSource[];
  anomaly: { score: number; label: string; trend: string };
  watchNotes: string[];
}

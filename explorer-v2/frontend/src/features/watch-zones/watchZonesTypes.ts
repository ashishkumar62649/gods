import type { EvidenceItem } from '../../data/contracts/intelligenceContracts';
import type { HazardAlert } from '../../data/contracts/hazardContracts';

export interface WatchZone {
  id: string;
  name: string;
  category: string;
  updated: string;
  severity: HazardAlert['severity'];
}

export interface WatchZonesData {
  zones: WatchZone[];
  alerts: HazardAlert[];
  evidence: EvidenceItem[];
  history: Array<{ time: string; title: string; detail: string; severity: WatchZone['severity'] }>;
}

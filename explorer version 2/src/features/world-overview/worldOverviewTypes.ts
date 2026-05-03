import type { IntelligenceMetric } from '../../data/contracts/intelligenceContracts';

export interface WorldOverviewData {
  globalSituation: {
    lastUpdated: string;
    cards: IntelligenceMetric[];
  };
}

import type { WorldOverviewData } from '../../../features/world-overview/worldOverviewTypes';

export const worldOverviewMock: WorldOverviewData = {
  globalSituation: {
    lastUpdated: '12:17 PM UTC',
    cards: [
      { label: 'Active Storms', value: 2, severity: 'high', confidence: 85 },
      { label: 'Flights Online', value: '15,842', severity: 'elevated', confidence: 92 },
      { label: 'Fires Detected (24h)', value: 128, severity: 'moderate', confidence: 78 },
      { label: 'Earthquakes (Today)', value: 7, severity: 'moderate', confidence: 78 },
      { label: 'High-Risk Watch Zones', value: 4, severity: 'critical', confidence: 88 },
      { label: 'Source Health', value: '12 / 14', severity: 'healthy', confidence: 62 },
    ],
  },
};

import type { AssetIntelligenceData } from './assetTypes';

export const assetMock: AssetIntelligenceData = {
  selectedAsset: {
    callsign: 'IGNITE21',
    status: 'Active',
    aircraft: 'Boeing C-17A Globemaster III',
    badges: ['Military', 'Emergency', 'Restricted'],
    metrics: [
      { label: 'Altitude', value: '34,000 ft' },
      { label: 'Speed', value: '435 kt' },
      { label: 'Heading', value: '092 deg' },
      { label: 'Registration', value: '08-8194' },
      { label: 'Owner / Operator', value: 'United States Air Force' },
      { label: 'Nearest Airport', value: 'VIDP / DEL' },
      { label: 'Distance', value: '312 NM' },
    ],
  },
  route: [
    { code: 'KAFW', city: 'Fort Worth' },
    { code: 'OPKC', city: 'Karachi' },
    { code: 'VIDP', city: 'New Delhi' },
    { code: 'VOBL', city: 'Kolkata' },
    { code: 'VTBS', city: 'Bangkok' },
  ],
  weatherAlongRoute: [
    { leg: 'KAFW-OPKC', altitude: 'FL300', temp: '18 C', condition: 'Light' },
    { leg: 'OPKC-VIDP', altitude: 'FL300', temp: '11 C', condition: 'Light' },
    { leg: 'VIDP-VOBL', altitude: 'FL300', temp: '27 C', condition: 'Mod Rain' },
    { leg: 'VOBL-VTBS', altitude: 'FL300', temp: '29 C', condition: 'Light' },
  ],
  sourceProvenance: [
    { label: 'ADS-B', status: 'Live' },
    { label: 'MLAT', status: 'Live' },
    { label: 'SATCOM', status: '15m ago' },
    { label: 'RADAR', status: 'Live' },
    { label: 'OSINT', status: '2h ago' },
  ],
  anomaly: { score: 78, label: 'Elevated', trend: '+23 vs previous 24h' },
  watchNotes: [
    'Aircraft operating under emergency status with elevated anomaly score.',
    'Route deviates north of planned corridor near Varanasi.',
    'Historical pattern shows limited activity in this airspace.',
  ],
};

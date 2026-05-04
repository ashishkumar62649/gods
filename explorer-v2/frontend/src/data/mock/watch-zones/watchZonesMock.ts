import type { WatchZonesData } from '../../../features/watch-zones/watchZonesTypes';

export const watchZonesMock: WatchZonesData = {
  zones: [
    { id: 'bay', name: 'Bay of Bengal', category: 'Tropical Cyclone Watch', updated: '12:10 PM', severity: 'high' },
    { id: 'kolkata', name: 'Kolkata Corridor', category: 'Riverine Flood Risk', updated: '11:58 AM', severity: 'elevated' },
    { id: 'mumbai', name: 'Mumbai Port', category: 'Port Operations Disruption', updated: '11:45 AM', severity: 'moderate' },
    { id: 'red-sea', name: 'Red Sea Route', category: 'Maritime Security Risk', updated: '11:20 AM', severity: 'high' },
    { id: 'pacific', name: 'Pacific Storm Belt', category: 'Severe Weather Watch', updated: '10:55 AM', severity: 'elevated' },
    { id: 'guinea', name: 'Gulf of Guinea', category: 'Maritime Security Risk', updated: '10:40 AM', severity: 'moderate' },
    { id: 'malacca', name: 'Strait of Malacca', category: 'Routine Monitoring', updated: '10:32 AM', severity: 'low' },
    { id: 'suez', name: 'Suez Canal', category: 'Transit Disruption Risk', updated: '09:50 AM', severity: 'elevated' },
  ],
  alerts: [
    { id: 'mocha', title: 'Tropical Cyclone Mocha', region: 'Bay of Bengal', severity: 'high', time: '12:10 PM', confidence: 85 },
    { id: 'houthi', title: 'Houthi Attack Warning', region: 'Red Sea Route', severity: 'high', time: '11:20 AM', confidence: 78 },
    { id: 'hooghly-flood-risk', title: 'Flood Risk - Hooghly Basin', region: 'Kolkata Corridor', severity: 'elevated', time: '11:58 AM', confidence: 72 },
    { id: 'mumbai-port', title: 'Mumbai Port Congestion', region: 'Mumbai Port', severity: 'moderate', time: '11:45 AM', confidence: 65 },
  ],
  evidence: [
    { label: 'GPM IMERG Rainfall', source: '164mm rainfall in last 48h', time: '11:30 AM', impact: 'High Impact' },
    { label: 'Global Flood Awareness System', source: 'Hooghly River at 84% of bankfull', time: '11:15 AM', impact: 'High Impact' },
    { label: 'Sentinel-1 SAR', source: 'Saturated soil and high backscatter', time: '10:45 AM', impact: 'Medium Impact' },
    { label: 'India CWC Water Levels', source: 'Above danger level at multiple gauges', time: '10:30 AM', impact: 'High Impact' },
    { label: 'IMD Weather Forecast', source: 'Heavy rainfall forecast in next 72h', time: '10:00 AM', impact: 'Medium Impact' },
  ],
  history: [
    { time: '12:10 PM', title: 'Bay of Bengal', detail: 'Cyclone Intensifies', severity: 'high' },
    { time: '11:58 AM', title: 'Kolkata Corridor', detail: 'Flood Risk Elevated', severity: 'elevated' },
    { time: '11:45 AM', title: 'Mumbai Port', detail: 'Berth Congestion Increased', severity: 'moderate' },
    { time: '11:20 AM', title: 'Red Sea Route', detail: 'Security Risk Escalated', severity: 'high' },
    { time: '10:55 AM', title: 'Pacific Storm Belt', detail: 'Watch Issued', severity: 'elevated' },
    { time: '10:40 AM', title: 'Gulf of Guinea', detail: 'Suspicious Vessel Activity Detected', severity: 'moderate' },
  ],
};

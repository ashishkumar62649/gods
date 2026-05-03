import type { MockMapEntity } from '../earth/mockMapEntities';
import type { Severity } from '../app/appTypes';

const metricSeed = {
  storms: 2,
  flights: 15842,
  fires: 128,
  earthquakes: 7,
  watchZones: 4,
  sources: 14,
};

export function wave(nowMs: number, periodMs: number, phase = 0) {
  return Math.sin(nowMs / periodMs + phase);
}

export function formatClock(nowMs: number, timeZone?: string) {
  return new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
    timeZone,
  }).format(new Date(nowMs));
}

export function formatDate(nowMs: number, timeZone = 'UTC') {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone,
  }).format(new Date(nowMs));
}

export function relativeUpdated(nowMs: number, lagSeconds: number) {
  const seconds = Math.max(1, Math.round((Date.now() - (nowMs - lagSeconds * 1000)) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  return `${Math.round(seconds / 60)}m ago`;
}

export function makeWorldMetrics(nowMs: number) {
  const storms = metricSeed.storms + Math.max(0, Math.round(wave(nowMs, 90_000, 0.4)));
  const flights = metricSeed.flights + Math.round(wave(nowMs, 18_000, 1.2) * 190);
  const fires = metricSeed.fires + Math.round(wave(nowMs, 45_000, 2.1) * 14);
  const earthquakes = Math.max(1, metricSeed.earthquakes + Math.round(wave(nowMs, 120_000, 0.7) * 2));
  const watchZones = metricSeed.watchZones + Math.max(0, Math.round(wave(nowMs, 60_000, 1.7)));
  const sourcesHealthy = 12 + Math.max(0, Math.round(wave(nowMs, 150_000, 0.2)));

  return [
    { label: 'Active Storms', value: storms, severity: storms > 2 ? 'critical' : 'high', confidence: confidence(nowMs, 86, 3, 1) },
    { label: 'Flights Online', value: flights.toLocaleString('en-US'), severity: 'elevated', confidence: confidence(nowMs, 92, 2, 2) },
    { label: 'Fires Detected (24h)', value: fires, severity: fires > 135 ? 'high' : 'moderate', confidence: confidence(nowMs, 78, 5, 3) },
    { label: 'Earthquakes (Today)', value: earthquakes, severity: earthquakes > 8 ? 'elevated' : 'moderate', confidence: confidence(nowMs, 79, 4, 4) },
    { label: 'High-Risk Watch Zones', value: watchZones, severity: watchZones > 4 ? 'critical' : 'high', confidence: confidence(nowMs, 88, 3, 5) },
    { label: 'Source Health', value: `${sourcesHealthy} / ${metricSeed.sources}`, severity: sourcesHealthy >= 12 ? 'healthy' : 'elevated', confidence: confidence(nowMs, 64, 6, 6) },
  ] as Array<{ label: string; value: string | number; severity: Severity; confidence: number }>;
}

export function makeAssetTelemetry(nowMs: number) {
  const altitude = 33_600 + Math.round(wave(nowMs, 22_000) * 650);
  const speed = 428 + Math.round(wave(nowMs, 17_000, 1.4) * 18);
  const heading = normalizeHeading(88 + Math.round(wave(nowMs, 26_000, 2.2) * 9));
  const anomaly = 70 + Math.round(Math.abs(wave(nowMs, 35_000, 0.9)) * 18);
  const routeProgress = 42 + Math.round(((nowMs / 1000) % 180) / 180 * 38);

  return {
    callsign: `IGNITE${20 + Math.round(Math.abs(wave(nowMs, 70_000)) * 3)}`,
    altitudeFt: altitude,
    speedKt: speed,
    headingDeg: heading,
    distanceNm: Math.max(58, 340 - Math.round(((nowMs / 1000) % 900) * 0.18)),
    anomaly,
    anomalyTrend: anomaly > 80 ? '+ rising' : anomaly > 74 ? '+ watch' : 'stable',
    routeProgress,
    updatedLabel: relativeUpdated(nowMs, 8),
  };
}

export function makeLocationSnapshot(
  nowMs: number,
  context: { name: string; lat: number; lon: number; elevationM: number },
) {
  const temp = 23 + Math.round(Math.abs(wave(nowMs, 85_000, context.lat)) * 11);
  const humidity = 54 + Math.round(Math.abs(wave(nowMs, 60_000, context.lon)) * 34);
  const nearbyFlights = 6 + Math.round(Math.abs(wave(nowMs, 28_000, context.lat)) * 19);
  const fires = Math.round(Math.abs(wave(nowMs, 52_000, context.lon)) * 11);
  const earthquakes = Math.round(Math.abs(wave(nowMs, 140_000, context.lat + context.lon)) * 3);
  const population = 1.5 + Math.abs(wave(nowMs, 130_000, context.lat)) * 13.2;
  const risk = Math.min(96, Math.round(28 + humidity * 0.32 + fires * 1.8 + earthquakes * 5));

  return {
    location: {
      name: context.name,
      coordinates: `${Math.abs(context.lat).toFixed(2)} deg ${context.lat >= 0 ? 'N' : 'S'}, ${Math.abs(context.lon).toFixed(2)} deg ${context.lon >= 0 ? 'E' : 'W'}`,
      elevation: `Elev. ${context.elevationM} m`,
    },
    weather: {
      temperatureC: temp,
      feelsLikeC: temp + Math.round(humidity / 24),
      condition: humidity > 78 ? 'Rain bands nearby' : humidity > 66 ? 'Cloud build-up' : 'Mostly clear',
      wind: `${8 + Math.round(Math.abs(wave(nowMs, 40_000)) * 22)} km/h ${windDirection(nowMs)}`,
      humidity,
      pressureHpa: 1002 + Math.round(wave(nowMs, 96_000) * 8),
      visibilityKm: Math.max(2, 11 - Math.round(humidity / 14)),
      confidence: confidence(nowMs, 83, 5, 8),
    },
    nearbyFlights,
    fires,
    earthquakes,
    populationM: population,
    risk,
    riskLabel: risk > 75 ? 'High' : risk > 55 ? 'Moderate' : 'Low',
    confidence: confidence(nowMs, 81, 4, 9),
    updatedLabel: relativeUpdated(nowMs, 5),
  };
}

export function makeWatchAlerts(nowMs: number) {
  const alertPulse = Math.round(Math.abs(wave(nowMs, 50_000)) * 10);
  return [
    { id: 'storm-cell', title: 'Cyclone Structure Change', region: 'Bay of Bengal', severity: alertPulse > 7 ? 'critical' : 'high', time: relativeUpdated(nowMs, 35), confidence: 80 + alertPulse },
    { id: 'route-security', title: 'Maritime Security Watch', region: 'Red Sea Route', severity: 'high', time: relativeUpdated(nowMs, 95), confidence: 73 + Math.round(alertPulse / 2) },
    { id: 'basin-flood', title: 'River Basin Flood Signal', region: 'Selected Corridor', severity: alertPulse > 4 ? 'elevated' : 'moderate', time: relativeUpdated(nowMs, 140), confidence: 68 + alertPulse },
    { id: 'port-flow', title: 'Port Throughput Disruption', region: 'Active Port Cluster', severity: 'moderate', time: relativeUpdated(nowMs, 220), confidence: 62 + Math.round(alertPulse / 2) },
  ] as Array<{ id: string; title: string; region: string; severity: Severity; time: string; confidence: number }>;
}

export function moveOverlayEntities(base: MockMapEntity[], nowMs: number) {
  return base.map((entity, index) => {
    const driftX = wave(nowMs, 24_000 + index * 3000, index) * (entity.type === 'aircraft' ? 5 : 1.4);
    const driftY = wave(nowMs, 30_000 + index * 2500, index + 2) * (entity.type === 'aircraft' ? 3 : 1.2);
    return {
      ...entity,
      x: clamp(8, 92, entity.x + driftX),
      y: clamp(12, 84, entity.y + driftY),
    };
  });
}

export function timelineTicks(nowMs: number) {
  const base = new Date(nowMs);
  return Array.from({ length: 9 }, (_, index) => {
    const tick = new Date(base.getTime() + (index - 3) * 3 * 60 * 60 * 1000);
    return new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }).format(tick);
  });
}

function confidence(nowMs: number, base: number, swing: number, phase: number) {
  return Math.max(30, Math.min(99, Math.round(base + wave(nowMs, 41_000, phase) * swing)));
}

function normalizeHeading(value: number) {
  return ((value % 360) + 360) % 360;
}

function windDirection(nowMs: number) {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.abs(Math.floor(nowMs / 30000)) % dirs.length];
}

function clamp(min: number, max: number, value: number) {
  return Math.max(min, Math.min(max, value));
}

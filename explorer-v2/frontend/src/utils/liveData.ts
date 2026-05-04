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

export function timelineTicks(startTimeMs: number, endTimeMs?: number) {
  if (typeof endTimeMs === 'number') {
    const span = Math.max(1, endTimeMs - startTimeMs);
    return Array.from({ length: 9 }, (_, index) => {
      const tick = new Date(startTimeMs + (span * index) / 8);
      return new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }).format(tick);
    });
  }

  const base = new Date(startTimeMs);
  return Array.from({ length: 9 }, (_, index) => {
    const tick = new Date(base.getTime() + (index - 3) * 3 * 60 * 60 * 1000);
    return new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }).format(tick);
  });
}

function confidence(nowMs: number, base: number, swing: number, phase: number) {
  return Math.max(30, Math.min(99, Math.round(base + wave(nowMs, 41_000, phase) * swing)));
}

function windDirection(nowMs: number) {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.abs(Math.floor(nowMs / 30000)) % dirs.length];
}

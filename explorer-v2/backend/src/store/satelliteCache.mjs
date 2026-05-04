export const tleStore = new Map();
export const satelliteStore = new Map();

let tleStats = {
  count: 0,
  lastFetchAt: null,
  source: null,
  error: null,
};

let propagationStats = {
  count: 0,
  propagatedAt: null,
  errorCount: 0,
  skippedCount: 0,
  loopActive: false,
};

export function replaceTles(tles, source = 'Space-Track GP') {
  tleStore.clear();

  for (const tle of tles) {
    if (!tle?.id_norad || !tle.line1 || !tle.line2) continue;
    tleStore.set(tle.id_norad, tle);
  }

  tleStats = {
    count: tleStore.size,
    lastFetchAt: new Date().toISOString(),
    source,
    error: null,
  };
}

export function setTleFetchError(error) {
  tleStats = {
    ...tleStats,
    error: error instanceof Error ? error.message : String(error),
  };
}

export function getAllTles() {
  return Array.from(tleStore.values());
}

export function upsertSatellite(satellite) {
  if (!satellite?.id_norad) return;
  satelliteStore.set(satellite.id_norad, satellite);
}

export function replaceSatellites(satellites, stats = {}) {
  satelliteStore.clear();

  for (const satellite of satellites) {
    upsertSatellite(satellite);
  }

  propagationStats = {
    count: satelliteStore.size,
    propagatedAt: new Date().toISOString(),
    errorCount: stats.errorCount ?? 0,
    skippedCount: stats.skippedCount ?? 0,
    loopActive: stats.loopActive ?? propagationStats.loopActive,
  };
}

export function setSatelliteLoopActive(loopActive) {
  propagationStats = {
    ...propagationStats,
    loopActive,
  };
}

export function getAllSatellites() {
  return Array.from(satelliteStore.values());
}

export function getSatelliteStats() {
  return {
    tle: { ...tleStats },
    propagation: { ...propagationStats },
  };
}

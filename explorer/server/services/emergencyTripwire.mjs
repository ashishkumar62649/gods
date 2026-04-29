const EMERGENCY_SQUAWKS = new Set(['7700', '7600', '7500']);
const REQUIRED_EMERGENCY_FRAMES = 3;
const REQUIRED_CLEAR_FRAMES = 3;
const EMERGENCY_TTL_MS = 15 * 60 * 1000;

export const squawkWindowByHex = new Map();
export const emergencyCacheByHex = new Map();

let activeSweepSeenHexes = new Set();

export function beginEmergencySweep() {
  activeSweepSeenHexes = new Set();
}

export function endEmergencySweep() {
  const nowMs = Date.now();
  purgeExpiredEmergencies(nowMs);

  for (const [hex, cached] of emergencyCacheByHex) {
    if (!activeSweepSeenHexes.has(hex)) {
      cached.emergency_status = 'SIGNAL_LOST';
      cached.is_active_emergency = false;
      cached.expiresAt = new Date(cached.expiresAtMs).toISOString();
    }
  }
}

export function classifyEmergencySquawk(squawk) {
  const normalized = normalizeSquawk(squawk);
  return EMERGENCY_SQUAWKS.has(normalized) ? normalized : null;
}

export function applyEmergencyTripwire(flight) {
  if (!flight?.id_icao) return flight;

  const hex = String(flight.id_icao).toLowerCase();
  const nowMs = Date.now();
  const emergencySquawk = classifyEmergencySquawk(flight.squawk);
  const window = squawkWindowByHex.get(hex) ?? {
    emergencyFrames: 0,
    clearFrames: 0,
    activeSquawk: null,
  };

  activeSweepSeenHexes.add(hex);

  if (emergencySquawk) {
    if (window.activeSquawk === emergencySquawk) {
      window.emergencyFrames += 1;
    } else {
      window.activeSquawk = emergencySquawk;
      window.emergencyFrames = 1;
    }
    window.clearFrames = 0;
  } else {
    window.clearFrames += 1;
    window.emergencyFrames = 0;
  }

  let cached = emergencyCacheByHex.get(hex) ?? null;

  if (
    emergencySquawk &&
    (window.emergencyFrames >= REQUIRED_EMERGENCY_FRAMES || cached)
  ) {
    const verifiedAtMs = cached?.verifiedAtMs ?? nowMs;
    cached = buildEmergencyCacheRecord(
      flight,
      emergencySquawk,
      verifiedAtMs,
      nowMs,
    );
    emergencyCacheByHex.set(hex, cached);
  } else if (!emergencySquawk && cached && window.clearFrames >= REQUIRED_CLEAR_FRAMES) {
    emergencyCacheByHex.delete(hex);
    cached = null;
    window.activeSquawk = null;
  }

  squawkWindowByHex.set(hex, window);

  if (cached) {
    return {
      ...flight,
      squawk: normalizeSquawk(flight.squawk) || cached.squawk,
      is_active_emergency: cached.emergency_status === 'ACTIVE',
      emergency_status: cached.emergency_status,
    };
  }

  return {
    ...flight,
    squawk: normalizeSquawk(flight.squawk) || (flight.squawk ?? null),
    is_active_emergency: false,
    emergency_status: 'NONE',
  };
}

export function getEmergencySnapshots() {
  const nowMs = Date.now();
  purgeExpiredEmergencies(nowMs);

  return Array.from(emergencyCacheByHex.values())
    .map((cached) => ({
      id_icao: cached.id_icao,
      callsign: cached.callsign,
      registration: cached.registration,
      aircraft_type: cached.aircraft_type,
      description: cached.description,
      owner_operator: cached.owner_operator,
      country_origin: cached.country_origin,
      latitude: cached.latitude,
      longitude: cached.longitude,
      altitude_baro_m: cached.altitude_baro_m,
      altitude_geom_m: cached.altitude_geom_m,
      velocity_mps: cached.emergency_status === 'SIGNAL_LOST' ? 0 : cached.velocity_mps,
      heading_true_deg: cached.heading_true_deg,
      heading_mag_deg: cached.heading_mag_deg,
      vertical_rate_mps: cached.emergency_status === 'SIGNAL_LOST' ? 0 : cached.vertical_rate_mps,
      on_ground: cached.on_ground,
      vehicle_type: cached.vehicle_type,
      vehicle_subtype: cached.vehicle_subtype,
      operation_type: cached.operation_type,
      operation_subtype: cached.operation_subtype,
      squawk: cached.squawk,
      is_military: cached.is_military,
      is_interesting: cached.is_interesting,
      is_pia: cached.is_pia,
      is_ladd: cached.is_ladd,
      is_estimated: cached.is_estimated,
      is_active_emergency: cached.emergency_status === 'ACTIVE',
      emergency_status: cached.emergency_status,
      data_source: cached.data_source,
      timestamp: cached.emergency_status === 'SIGNAL_LOST'
        ? Math.floor(nowMs / 1000)
        : cached.timestamp,
      verifiedAt: new Date(cached.verifiedAtMs).toISOString(),
      lastSeenAt: new Date(cached.lastSeenAtMs).toISOString(),
      expiresAt: new Date(cached.expiresAtMs).toISOString(),
    }))
    .sort((a, b) => b.lastSeenAt.localeCompare(a.lastSeenAt));
}

export function getEmergencyStats() {
  const snapshots = getEmergencySnapshots();
  return {
    active: snapshots.filter((item) => item.emergency_status === 'ACTIVE').length,
    signalLost: snapshots.filter((item) => item.emergency_status === 'SIGNAL_LOST').length,
    cached: snapshots.length,
    windows: squawkWindowByHex.size,
  };
}

function buildEmergencyCacheRecord(flight, squawk, verifiedAtMs, nowMs) {
  return {
    id_icao: flight.id_icao,
    callsign: flight.callsign ?? null,
    registration: flight.registration ?? null,
    aircraft_type: flight.aircraft_type ?? null,
    description: flight.description ?? null,
    owner_operator: flight.owner_operator ?? null,
    country_origin: flight.country_origin ?? null,
    latitude: flight.latitude,
    longitude: flight.longitude,
    altitude_baro_m: flight.altitude_baro_m,
    altitude_geom_m: flight.altitude_geom_m ?? null,
    velocity_mps: flight.velocity_mps ?? 0,
    heading_true_deg: flight.heading_true_deg ?? 0,
    heading_mag_deg: flight.heading_mag_deg ?? null,
    vertical_rate_mps: flight.vertical_rate_mps ?? 0,
    on_ground: Boolean(flight.on_ground),
    vehicle_type: flight.vehicle_type ?? 'Airplane',
    vehicle_subtype: flight.vehicle_subtype ?? 'General',
    operation_type: flight.operation_type ?? 'Private',
    operation_subtype: flight.operation_subtype ?? 'General Aviation',
    squawk,
    is_military: Boolean(flight.is_military),
    is_interesting: Boolean(flight.is_interesting),
    is_pia: Boolean(flight.is_pia),
    is_ladd: Boolean(flight.is_ladd),
    is_estimated: Boolean(flight.is_estimated),
    is_active_emergency: true,
    emergency_status: 'ACTIVE',
    data_source: flight.data_source ?? 'UNKNOWN',
    timestamp: flight.timestamp,
    verifiedAtMs,
    lastSeenAtMs: nowMs,
    expiresAtMs: nowMs + EMERGENCY_TTL_MS,
  };
}

function purgeExpiredEmergencies(nowMs) {
  for (const [hex, cached] of emergencyCacheByHex) {
    if (cached.expiresAtMs <= nowMs) {
      emergencyCacheByHex.delete(hex);
      squawkWindowByHex.delete(hex);
    }
  }
}

function normalizeSquawk(squawk) {
  const text = String(squawk ?? '').trim();
  return /^[0-7]{4}$/.test(text) ? text : null;
}

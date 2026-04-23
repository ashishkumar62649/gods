import {
  CABLE_RISK_DISTANCE_M,
  CABLE_RISK_SPEED_KNOTS,
  SHIP_STALE_TIMEOUT_MS,
} from '../config/constants.mjs';

export const cableStore = new Map();
export const shipStore = new Map();
export const intelligenceNodeStore = new Map();

let cableStats = {
  count: 0,
  lastFetchAt: null,
  source: null,
  error: null,
};

let shipStats = {
  count: 0,
  lastUpdateAt: null,
  source: 'aisstream.io',
  connected: false,
  error: null,
};

export function replaceCables(cables, source = 'Submarine Cable Map') {
  cableStore.clear();

  for (const cable of cables) {
    if (!cable?.asset_id || !Array.isArray(cable.segments)) continue;
    cableStore.set(cable.asset_id, {
      ...cable,
      status: cable.status ?? 'Active',
      last_inspected_by: cable.last_inspected_by ?? null,
    });
  }

  cableStats = {
    count: cableStore.size,
    lastFetchAt: new Date().toISOString(),
    source,
    error: null,
  };
}

export function setCableFetchError(error) {
  cableStats = {
    ...cableStats,
    error: error instanceof Error ? error.message : String(error),
  };
}

export function upsertShip(ship) {
  if (!ship?.vessel_id) return;

  const previous = shipStore.get(ship.vessel_id);
  const trail = [
    ...(previous?.trail ?? []),
    {
      lat: ship.latitude,
      lon: ship.longitude,
      timestamp: ship.timestamp,
    },
  ].slice(-36);
  const nearestCable = findNearestCable(ship.latitude, ship.longitude);
  const atRisk = Boolean(
    nearestCable &&
    ship.speed_knots != null &&
    ship.speed_knots < CABLE_RISK_SPEED_KNOTS &&
    nearestCable.distance_m <= CABLE_RISK_DISTANCE_M,
  );

  const normalized = {
    ...ship,
    trail,
    nearest_cable_id: nearestCable?.asset_id ?? null,
    nearest_cable_distance_m: nearestCable?.distance_m ?? null,
    risk_status: atRisk ? 'RISK' : 'NORMAL',
  };

  shipStore.set(ship.vessel_id, normalized);
  shipStats = {
    ...shipStats,
    count: shipStore.size,
    lastUpdateAt: new Date().toISOString(),
    error: null,
  };

  if (atRisk && nearestCable?.asset_id) {
    const cable = cableStore.get(nearestCable.asset_id);
    if (cable) {
      cable.last_inspected_by = ship.vessel_id;
    }
  }
}

export function removeStaleShips(nowMs = Date.now()) {
  for (const [vesselId, ship] of shipStore) {
    const ageMs = nowMs - ship.timestamp * 1000;
    if (ageMs <= SHIP_STALE_TIMEOUT_MS) continue;

    if (
      ship.nearest_cable_id &&
      ship.nearest_cable_distance_m != null &&
      ship.nearest_cable_distance_m <= CABLE_RISK_DISTANCE_M
    ) {
      addIntelligenceNode({
        cableId: ship.nearest_cable_id,
        vesselId,
        lat: ship.latitude,
        lon: ship.longitude,
        reason: 'AIS_OFF_OVER_CABLE',
      });
    }

    shipStore.delete(vesselId);
  }

  shipStats = {
    ...shipStats,
    count: shipStore.size,
  };
}

export function setShipConnectionState(connected, error = null) {
  shipStats = {
    ...shipStats,
    connected,
    error: error ? error.message ?? String(error) : null,
  };
}

export function getAllCables() {
  return Array.from(cableStore.values());
}

export function getAllShips() {
  return Array.from(shipStore.values());
}

export function getAllInfrastructureNodes() {
  return Array.from(intelligenceNodeStore.values());
}

export function getInfrastructureStats() {
  return {
    cables: { ...cableStats },
    ships: { ...shipStats },
    nodes: {
      count: intelligenceNodeStore.size,
    },
  };
}

function addIntelligenceNode({ cableId, vesselId, lat, lon, reason }) {
  const nodeId = `${reason}:${vesselId}:${Math.round(lat * 10000)}:${Math.round(lon * 10000)}`;
  if (intelligenceNodeStore.has(nodeId)) return;

  const cable = cableStore.get(cableId);
  if (cable) {
    cable.status = 'Breached';
    cable.last_inspected_by = vesselId;
  }

  intelligenceNodeStore.set(nodeId, {
    node_id: nodeId,
    asset_id: cableId,
    vessel_id: vesselId,
    latitude: lat,
    longitude: lon,
    reason,
    severity: 'HIGH',
    timestamp: Math.floor(Date.now() / 1000),
  });
}

function findNearestCable(lat, lon) {
  let nearest = null;

  for (const cable of cableStore.values()) {
    for (const segment of cable.segments) {
      for (let index = 1; index < segment.length; index += 1) {
        const a = segment[index - 1];
        const b = segment[index];
        const distance = distanceToSegmentMeters(lat, lon, a.lat, a.lon, b.lat, b.lon);
        if (!nearest || distance < nearest.distance_m) {
          nearest = {
            asset_id: cable.asset_id,
            distance_m: distance,
          };
        }
      }
    }
  }

  return nearest;
}

function distanceToSegmentMeters(lat, lon, lat1, lon1, lat2, lon2) {
  const metersPerDegLat = 111_320;
  const metersPerDegLon = Math.max(
    1,
    metersPerDegLat * Math.cos(toRadians((lat + lat1 + lat2) / 3)),
  );
  const px = lon * metersPerDegLon;
  const py = lat * metersPerDegLat;
  const ax = lon1 * metersPerDegLon;
  const ay = lat1 * metersPerDegLat;
  const bx = lon2 * metersPerDegLon;
  const by = lat2 * metersPerDegLat;
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSquared = dx * dx + dy * dy;
  const t = lengthSquared === 0
    ? 0
    : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lengthSquared));
  const cx = ax + t * dx;
  const cy = ay + t * dy;
  return Math.hypot(px - cx, py - cy);
}

function toRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

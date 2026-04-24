import { Cartesian3 } from 'cesium';
import { twoline2satrec } from 'satellite.js/dist/io.js';
import { gstime, propagate } from 'satellite.js/dist/propagation.js';
import {
  degreesLat,
  degreesLong,
  eciToGeodetic,
} from 'satellite.js/dist/transforms.js';
import type { SatelliteRecord } from './satellites';

export interface GroundStationRecord {
  id: string;
  lat: number;
  lon: number;
}

export interface SatelliteSignalStatus {
  station: GroundStationRecord | null;
  inContact: boolean;
  nextEventLabel: 'LOS' | 'AOS' | 'UNKNOWN';
  secondsUntilEvent: number | null;
}

const EARTH_RADIUS_KM = 6371;
const PASS_SCAN_SECONDS = 2 * 60 * 60;
const PASS_SCAN_STEP_SECONDS = 60;

export const SATELLITE_GROUND_STATIONS: GroundStationRecord[] = [
  { id: 'hfdl-santa-cruz', lat: 36.9741, lon: -122.0308 },
  { id: 'hfdl-shannon', lat: 52.7137, lon: -8.8686 },
  { id: 'hfdl-hong-kong', lat: 22.3193, lon: 114.1694 },
  { id: 'hfdl-auckland', lat: -36.8509, lon: 174.7645 },
  { id: 'hfdl-johannesburg', lat: -26.2041, lon: 28.0473 },
  { id: 'hfdl-reykjavik', lat: 64.1466, lon: -21.9426 },
];

export function getSelectedSatelliteSignalStatus(
  satellite: SatelliteRecord,
): SatelliteSignalStatus {
  const station = getNearestGroundStation(satellite);
  if (!station) {
    return {
      station: null,
      inContact: false,
      nextEventLabel: 'UNKNOWN',
      secondsUntilEvent: null,
    };
  }

  const inContact = hasLineOfSight(satellite, station);
  const secondsUntilEvent = findNextSignalTransitionSeconds(
    satellite,
    station,
    inContact,
  );

  return {
    station,
    inContact,
    nextEventLabel: inContact ? 'LOS' : 'AOS',
    secondsUntilEvent,
  };
}

export function getNearestGroundStation(satellite: SatelliteRecord) {
  let nearest: GroundStationRecord | null = null;
  let nearestAngle = Number.POSITIVE_INFINITY;

  for (const station of SATELLITE_GROUND_STATIONS) {
    const angle = centralAngleRadians(
      satellite.latitude,
      satellite.longitude,
      station.lat,
      station.lon,
    );
    if (angle < nearestAngle) {
      nearestAngle = angle;
      nearest = station;
    }
  }

  return nearest;
}

export function hasLineOfSight(
  satellite: Pick<SatelliteRecord, 'latitude' | 'longitude' | 'altitude_km'>,
  station: GroundStationRecord,
) {
  const centralAngle = centralAngleRadians(
    satellite.latitude,
    satellite.longitude,
    station.lat,
    station.lon,
  );
  const horizonAngle = Math.acos(
    EARTH_RADIUS_KM / (EARTH_RADIUS_KM + Math.max(0, satellite.altitude_km)),
  );

  return centralAngle <= horizonAngle;
}

export function groundStationToCartesian(station: GroundStationRecord) {
  return Cartesian3.fromDegrees(station.lon, station.lat, 0);
}

export function formatSignalCountdown(status: SatelliteSignalStatus) {
  if (status.secondsUntilEvent == null) {
    return status.inContact ? 'Signal active' : 'Next pass unknown';
  }

  const minutes = Math.floor(status.secondsUntilEvent / 60);
  const seconds = status.secondsUntilEvent % 60;
  return `${status.nextEventLabel} in ${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function findNextSignalTransitionSeconds(
  satellite: SatelliteRecord,
  station: GroundStationRecord,
  currentlyInContact: boolean,
) {
  let satrec;
  try {
    satrec = twoline2satrec(satellite.line1, satellite.line2);
  } catch {
    return null;
  }

  if (satrec?.error) return null;

  const startMs = Date.now();
  for (
    let offsetSec = PASS_SCAN_STEP_SECONDS;
    offsetSec <= PASS_SCAN_SECONDS;
    offsetSec += PASS_SCAN_STEP_SECONDS
  ) {
    const date = new Date(startMs + offsetSec * 1000);
    const propagated = propagate(satrec, date);
    const positionEci = propagated?.position;
    if (!positionEci || typeof positionEci === 'boolean') continue;

    const geodetic = eciToGeodetic(positionEci, gstime(date));
    const projected = {
      latitude: degreesLat(geodetic.latitude),
      longitude: degreesLong(geodetic.longitude),
      altitude_km: geodetic.height,
    };

    if (hasLineOfSight(projected, station) !== currentlyInContact) {
      return offsetSec;
    }
  }

  return null;
}

function centralAngleRadians(
  latADeg: number,
  lonADeg: number,
  latBDeg: number,
  lonBDeg: number,
) {
  const latA = toRadians(latADeg);
  const latB = toRadians(latBDeg);
  const deltaLat = toRadians(latBDeg - latADeg);
  const deltaLon = toRadians(lonBDeg - lonADeg);
  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(latA) * Math.cos(latB) * Math.sin(deltaLon / 2) ** 2;
  return 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRadians(degrees: number) {
  return (degrees * Math.PI) / 180;
}

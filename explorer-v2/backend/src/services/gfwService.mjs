import {
  FETCH_TIMEOUT_MS,
  GFW_API_BASE_URL,
  GFW_API_KEY,
  GFW_MARITIME_REFRESH_INTERVAL_MS,
} from '../config/constants.mjs';
import { enqueueMaritimePresenceSnapshots } from './liveDomainDbWriter.mjs';

const REPORT_LOOKBACK_HOURS = 24;
const GFW_PRESENCE_DATASET = 'public-global-presence:latest';
const REPORT_TEMPORAL_RESOLUTION = 'HOURLY';
const REPORT_SPATIAL_RESOLUTION = 'HIGH';
const PRIMARY_VESSEL_FILTER = 'vessel_type in ("cargo","carrier","bunker_or_tanker")';
const FALLBACK_VESSEL_FILTER = 'vessel_type in ("cargo","carrier")';
const WORLD_SECTORS = [
  { name: 'northwest', west: -179, south: 40, east: -90, north: 80 },
  { name: 'north-central-west', west: -90, south: 40, east: 0, north: 80 },
  { name: 'north-central-east', west: 0, south: 40, east: 90, north: 80 },
  { name: 'northeast', west: 90, south: 40, east: 179, north: 80 },
  { name: 'mid-west', west: -179, south: -20, east: -90, north: 40 },
  { name: 'mid-central-west', west: -90, south: -20, east: 0, north: 40 },
  { name: 'mid-central-east', west: 0, south: -20, east: 90, north: 40 },
  { name: 'mid-east', west: 90, south: -20, east: 179, north: 40 },
  { name: 'southwest', west: -179, south: -80, east: -90, north: -20 },
  { name: 'south-central-west', west: -90, south: -80, east: 0, north: -20 },
  { name: 'south-central-east', west: 0, south: -80, east: 90, north: -20 },
  { name: 'southeast', west: 90, south: -80, east: 179, north: -20 },
];
const AVAILABILITY_PROBE_SECTOR = WORLD_SECTORS[6];
const REPORT_WINDOW_OFFSETS_DAYS = [0, 30, 90, 180, 365, 730];

let snapshotCache = {
  vessels: [],
  meta: {
    count: 0,
    fetchedAt: null,
    source: 'Global Fishing Watch',
    error: null,
    loading: false,
  },
};
let inflightPromise = null;

export async function getGfwTradeSnapshot({ force = false } = {}) {
  if (!GFW_API_KEY) {
    return refreshGfwTradeSnapshot();
  }

  const cacheAgeMs = snapshotCache.meta.fetchedAt
    ? Date.now() - Date.parse(snapshotCache.meta.fetchedAt)
    : Number.POSITIVE_INFINITY;

  if (!force && snapshotCache.meta.fetchedAt && cacheAgeMs < GFW_MARITIME_REFRESH_INTERVAL_MS) {
    return snapshotCache;
  }

  if (inflightPromise) {
    return force ? inflightPromise : buildPendingSnapshot();
  }

  inflightPromise = refreshGfwTradeSnapshot()
    .finally(() => {
      inflightPromise = null;
    });

  if (!force) {
    return buildPendingSnapshot();
  }

  return inflightPromise;
}

export function primeGfwTradeSnapshot() {
  if (!GFW_API_KEY || inflightPromise) {
    return inflightPromise ?? Promise.resolve(snapshotCache);
  }

  inflightPromise = refreshGfwTradeSnapshot()
    .finally(() => {
      inflightPromise = null;
    });

  return inflightPromise;
}

async function refreshGfwTradeSnapshot() {
  if (!GFW_API_KEY) {
    snapshotCache = {
      vessels: [],
      meta: {
        count: 0,
        fetchedAt: null,
        source: 'Global Fishing Watch',
        error: 'GFW_API_KEY missing; maritime trade layer disabled.',
        loading: false,
      },
    };
    return snapshotCache;
  }

  const reportRows = await fetchTradePresenceRows();
  const vessels = normalizeTradePresenceRows(reportRows);

  snapshotCache = {
    vessels,
    meta: {
      count: vessels.length,
      fetchedAt: new Date().toISOString(),
      source: 'Global Fishing Watch / 4Wings AIS Vessel Presence',
      error: null,
      loading: false,
    },
  };
  enqueueMaritimePresenceSnapshots(vessels, {
    observedAt: snapshotCache.meta.fetchedAt,
    sourceLabel: snapshotCache.meta.source,
  });

  return snapshotCache;
}

async function fetchTradePresenceRows() {
  try {
    return await fetchPresenceReport(PRIMARY_VESSEL_FILTER);
  } catch (error) {
    const shouldRetry =
      error instanceof GfwHttpError &&
      error.status >= 400 &&
      error.status < 500 &&
      error.status !== 401;
    if (!shouldRetry) {
      throw error;
    }

    console.warn('[GFW] Retrying vessel presence without bunker_or_tanker filter.');
    return fetchPresenceReport(FALLBACK_VESSEL_FILTER);
  }
}

async function fetchPresenceReport(vesselFilter) {
  const availability = await resolveAvailableReportWindow(vesselFilter);
  if (!availability) {
    return [];
  }

  const rows = [];
  const errors = [];

  for (const sector of WORLD_SECTORS) {
    try {
      const sectorRows =
        sector.name === AVAILABILITY_PROBE_SECTOR.name
          ? availability.probeRows
          : await fetchPresenceReportForSector(vesselFilter, sector, availability.window);
      appendRows(rows, sectorRows);
    } catch (error) {
      errors.push(error);
    }
  }

  if (rows.length === 0 && errors.length > 0) {
    throw errors[0];
  }

  for (const error of errors) {
    console.warn(
      '[GFW] Presence sector skipped:',
      error instanceof Error ? error.message : error,
    );
  }

  return rows;
}

async function resolveAvailableReportWindow(vesselFilter) {
  const probeErrors = [];

  for (const offsetDays of REPORT_WINDOW_OFFSETS_DAYS) {
    const window = buildReportWindow(offsetDays);

    try {
      const probeRows = await fetchPresenceReportForSector(
        vesselFilter,
        AVAILABILITY_PROBE_SECTOR,
        window,
      );
      if (probeRows.length > 0) {
        return { window, probeRows };
      }
    } catch (error) {
      probeErrors.push(error);
    }
  }

  if (probeErrors.length > 0) {
    throw probeErrors[0];
  }

  return null;
}

function buildReportWindow(offsetDays) {
  const offsetMs = offsetDays * 24 * 60 * 60 * 1000;
  const endDate = new Date(Date.now() - offsetMs);
  const startDate = new Date(endDate.getTime() - REPORT_LOOKBACK_HOURS * 60 * 60 * 1000);
  return { startDate, endDate };
}

async function fetchPresenceReportForSector(vesselFilter, sector, window) {
  const url = new URL(`${GFW_API_BASE_URL}/4wings/report`);
  url.searchParams.set('spatial-resolution', REPORT_SPATIAL_RESOLUTION);
  url.searchParams.set('temporal-resolution', REPORT_TEMPORAL_RESOLUTION);
  url.searchParams.set('spatial-aggregation', 'false');
  url.searchParams.set('datasets[0]', GFW_PRESENCE_DATASET);
  url.searchParams.set(
    'date-range',
    `${window.startDate.toISOString()},${window.endDate.toISOString()}`,
  );
  url.searchParams.set('format', 'JSON');
  url.searchParams.set('filters[0]', vesselFilter);

  const response = await fetchWithTimeout(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      geojson: buildSectorPolygon(sector),
    }),
  });
  await assertGfwResponse(response);
  const payload = await response.json();

  if (payload?.status === 'running') {
    throw new Error('[GFW] 4Wings report is still running. Retry shortly.');
  }

  return flattenPresenceEntries(payload);
}

function buildSectorPolygon(sector) {
  return {
    type: 'Polygon',
    coordinates: [[
      [sector.west, sector.south],
      [sector.west, sector.north],
      [sector.east, sector.north],
      [sector.east, sector.south],
      [sector.west, sector.south],
    ]],
  };
}

function appendRows(target, rows) {
  for (const row of rows) {
    target.push(row);
  }
}

function flattenPresenceEntries(payload) {
  const rows = [];
  const entries = Array.isArray(payload?.entries) ? payload.entries : [];

  for (const entry of entries) {
    if (!entry || typeof entry !== 'object') continue;

    for (const [datasetKey, datasetRows] of Object.entries(entry)) {
      if (!Array.isArray(datasetRows)) continue;

      for (const row of datasetRows) {
        rows.push({
          ...row,
          dataset: safeText(row?.dataset) ?? datasetKey,
        });
      }
    }
  }

  return rows;
}

function normalizeTradePresenceRows(rows) {
  const latestByVessel = new Map();

  for (const row of rows) {
    const vesselKey = safeText(row?.vesselId ?? row?.vessel_id) ?? safeText(row?.mmsi);
    if (!vesselKey) continue;

    const lat = Number(row?.lat);
    const lon = Number(row?.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;

    const type = normalizeTradeType(row?.vesselType ?? row?.vessel_type);
    if (!type) continue;

    const timestamp = normalizePresenceTimestamp(row);
    if (!timestamp) continue;

    const normalized = {
      vesselKey,
      sortTime: Date.parse(timestamp) || 0,
      vessel: {
        vessel_id: vesselKey,
        vesselId: vesselKey,
        mmsi: safeText(row?.mmsi),
        name:
          safeText(row?.shipName) ??
          safeText(row?.shipname) ??
          safeText(row?.vesselName) ??
          safeText(row?.mmsi) ??
          'Unknown Vessel',
        lat,
        lon,
        latitude: lat,
        longitude: lon,
        timestamp,
        type,
        vessel_type: type,
        data_source: 'global_fishing_watch',
      },
    };

    const existing = latestByVessel.get(vesselKey);
    if (!existing || normalized.sortTime > existing.sortTime) {
      latestByVessel.set(vesselKey, normalized);
    }
  }

  return [...latestByVessel.values()]
    .sort((a, b) => b.sortTime - a.sortTime)
    .map((entry) => entry.vessel);
}

function normalizeTradeType(rawType) {
  const type = safeText(rawType)?.toLowerCase() ?? null;
  if (!type) return null;
  if (type.includes('cargo') || type.includes('carrier')) return 'CARGO';
  if (type.includes('bunker') || type.includes('tanker')) return 'BUNKER_OR_TANKER';
  return null;
}

function normalizePresenceTimestamp(row) {
  return (
    normalizeTimestamp(row?.exitTimestamp) ??
    normalizeTimestamp(row?.entryTimestamp) ??
    normalizeTimestamp(row?.date)
  );
}

function normalizeTimestamp(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return new Date(value).toISOString();
  }

  const text = safeText(value);
  if (!text) return null;

  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(text)) {
    return `${text.replace(' ', 'T')}:00Z`;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return `${text}T00:00:00Z`;
  }

  const parsed = Date.parse(text);
  if (Number.isFinite(parsed)) {
    return new Date(parsed).toISOString();
  }

  return null;
}

async function fetchWithTimeout(url, init = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  const extraHeaders = init.headers && typeof init.headers === 'object' ? init.headers : {};

  try {
    return await fetch(url, {
      ...init,
      headers: {
        Authorization: `Bearer ${GFW_API_KEY}`,
        ...extraHeaders,
      },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function assertGfwResponse(response) {
  if (response.ok) return;

  let detail = `${response.status} ${response.statusText}`;

  try {
    const body = await response.text();
    if (body) {
      detail = `${detail} - ${body.slice(0, 240)}`;
    }
  } catch {
    // Ignore secondary body-read failures.
  }

  if (response.status === 401) {
    console.error('[GFW] Authentication Failed - Check Token.');
  }

  throw new GfwHttpError(response.status, detail);
}

function safeText(value) {
  if (value == null) return null;
  const text = String(value).trim();
  return text || null;
}

class GfwHttpError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'GfwHttpError';
    this.status = status;
  }
}

function buildPendingSnapshot() {
  return {
    vessels: snapshotCache.vessels,
    meta: {
      ...snapshotCache.meta,
      loading: true,
    },
  };
}

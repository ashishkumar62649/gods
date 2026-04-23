import {
  FETCH_TIMEOUT_MS,
  INFRASTRUCTURE_REFRESH_INTERVAL_MS,
  SUBMARINE_CABLE_GEOJSON_URL,
} from '../config/constants.mjs';
import {
  replaceCables,
  setCableFetchError,
} from '../store/infrastructureStore.mjs';

let refreshTimer = null;
let refreshInFlight = null;

function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  return fetch(url, { ...options, signal: controller.signal })
    .finally(() => clearTimeout(timer));
}

export async function fetchSubseaCables() {
  const response = await fetchWithTimeout(SUBMARINE_CABLE_GEOJSON_URL, {
    headers: {
      Accept: 'application/geo+json,application/json',
      'User-Agent': 'GodEyesExplorer/0.1 infrastructure-layer',
    },
  });

  if (!response.ok) {
    throw new Error(`Submarine Cable Map returned HTTP ${response.status}`);
  }

  const payload = await response.json();
  const features = Array.isArray(payload?.features) ? payload.features : [];
  const cables = features
    .map(normalizeCableFeature)
    .filter(Boolean);

  replaceCables(cables, 'Submarine Cable Map');
  console.log(`[Infrastructure] ${cables.length.toLocaleString()} subsea cables cached`);
  return cables;
}

export function startInfrastructureRefreshLoop() {
  if (refreshTimer) return;

  const runRefresh = async () => {
    if (refreshInFlight) return refreshInFlight;

    refreshInFlight = fetchSubseaCables()
      .catch((error) => {
        setCableFetchError(error);
        console.error(`[Infrastructure] ${error.message}`);
      })
      .finally(() => {
        refreshInFlight = null;
      });

    return refreshInFlight;
  };

  void runRefresh();
  refreshTimer = setInterval(() => void runRefresh(), INFRASTRUCTURE_REFRESH_INTERVAL_MS);
}

function normalizeCableFeature(feature) {
  const geometry = feature?.geometry;
  const properties = feature?.properties ?? {};
  const rawSegments = extractSegments(geometry);
  const segments = rawSegments
    .map((segment) =>
      segment
        .map((coord) => ({
          lon: Number(coord?.[0]),
          lat: Number(coord?.[1]),
        }))
        .filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lon)),
    )
    .filter((segment) => segment.length > 1);

  if (!segments.length) return null;

  const assetId = safeStr(
    properties.id ??
    properties.slug ??
    properties.name ??
    feature.id,
  );
  const name = safeStr(properties.name ?? properties.Name ?? assetId);

  return {
    asset_id: assetId ?? stableCableId(name, segments),
    name: name ?? 'Unnamed cable',
    operator: safeStr(properties.operator ?? properties.owners ?? properties.owner),
    status: 'Active',
    last_inspected_by: null,
    segments,
  };
}

function extractSegments(geometry) {
  if (!geometry) return [];
  if (geometry.type === 'LineString') return [geometry.coordinates ?? []];
  if (geometry.type === 'MultiLineString') return geometry.coordinates ?? [];
  return [];
}

function stableCableId(name, segments) {
  const first = segments[0]?.[0];
  return `${name ?? 'cable'}:${first?.lat ?? 0}:${first?.lon ?? 0}`
    .toLowerCase()
    .replace(/[^a-z0-9.-]+/g, '-');
}

function safeStr(value) {
  if (value == null) return null;
  const text = String(value).trim();
  return text || null;
}

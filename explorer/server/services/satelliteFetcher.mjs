import {
  FETCH_TIMEOUT_MS,
  SATELLITE_TLE_REFRESH_INTERVAL_MS,
  SPACETRACK_EMAIL,
  SPACETRACK_GP_ACTIVE_URL,
  SPACETRACK_LOGIN_URL,
  SPACETRACK_PASSWORD,
} from '../config/constants.mjs';
import { replaceTles, setTleFetchError } from '../store/satelliteCache.mjs';

const requestHeaders = {
  'User-Agent': 'GodEyesExplorer/0.1 satellite-catalog',
  'Accept': 'application/json',
};

let cookieHeader = null;
let refreshTimer = null;
let refreshInFlight = null;

function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  return fetch(url, { ...options, signal: controller.signal })
    .finally(() => clearTimeout(timer));
}

export async function fetchActiveSatelliteTles(hasRetriedAuth = false) {
  if (!SPACETRACK_EMAIL || !SPACETRACK_PASSWORD) {
    throw new Error('SPACETRACK_EMAIL and SPACETRACK_PASSWORD are required to fetch satellite TLEs.');
  }

  await ensureSpaceTrackSession();

  const response = await fetchWithTimeout(SPACETRACK_GP_ACTIVE_URL, {
    headers: {
      ...requestHeaders,
      Cookie: cookieHeader,
    },
  });

  if (response.status === 401 || response.status === 403) {
    if (hasRetriedAuth) {
      throw new Error(`Space-Track GP fetch returned HTTP ${response.status}`);
    }
    cookieHeader = null;
    await ensureSpaceTrackSession();
    return fetchActiveSatelliteTles(true);
  }

  if (!response.ok) {
    throw new Error(`Space-Track GP fetch returned HTTP ${response.status}`);
  }

  const payload = await response.json();
  if (!Array.isArray(payload)) {
    throw new Error('Space-Track GP response did not contain an array.');
  }

  const tles = payload
    .map(normalizeSpaceTrackGpRecord)
    .filter(Boolean);

  replaceTles(tles, 'Space-Track GP');
  console.log(`[Satellite TLE] ✓ ${tles.length.toLocaleString()} active TLEs cached`);
  return tles;
}

export function startSatelliteTleRefreshLoop() {
  if (refreshTimer) return;

  const runRefresh = async () => {
    if (refreshInFlight) return refreshInFlight;

    refreshInFlight = fetchActiveSatelliteTles()
      .catch((error) => {
        setTleFetchError(error);
        console.error(`[Satellite TLE] ✗ ${error.message}`);
      })
      .finally(() => {
        refreshInFlight = null;
      });

    return refreshInFlight;
  };

  void runRefresh();
  refreshTimer = setInterval(() => void runRefresh(), SATELLITE_TLE_REFRESH_INTERVAL_MS);
}

async function ensureSpaceTrackSession() {
  if (cookieHeader) return;

  const body = new URLSearchParams({
    identity: SPACETRACK_EMAIL,
    password: SPACETRACK_PASSWORD,
  });

  const response = await fetchWithTimeout(SPACETRACK_LOGIN_URL, {
    method: 'POST',
    headers: {
      ...requestHeaders,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  if (!response.ok) {
    throw new Error(`Space-Track login returned HTTP ${response.status}`);
  }

  const loginBody = await response.text();
  if (loginBody) {
    try {
      const loginPayload = JSON.parse(loginBody);
      if (String(loginPayload?.Login ?? '').toLowerCase() === 'failed') {
        throw new Error(
          'Space-Track login failed. Check SPACETRACK_EMAIL, SPACETRACK_PASSWORD, account verification, and Space-Track terms access.',
        );
      }
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('Space-Track login failed')) {
        throw error;
      }
    }
  }

  const cookies = response.headers.getSetCookie?.() ?? parseSetCookieHeader(response.headers.get('set-cookie'));
  cookieHeader = cookies
    .map((cookie) => cookie.split(';')[0])
    .filter(Boolean)
    .join('; ');

  if (!cookieHeader) {
    throw new Error('Space-Track login did not return a session cookie.');
  }
}

function normalizeSpaceTrackGpRecord(record) {
  const id = safeStr(record.NORAD_CAT_ID ?? record.norad_cat_id);
  const line1 = safeStr(record.TLE_LINE1 ?? record.tle_line1);
  const line2 = safeStr(record.TLE_LINE2 ?? record.tle_line2);

  if (!id || !line1 || !line2) return null;

  return {
    id_norad: id,
    object_name: safeStr(record.OBJECT_NAME ?? record.object_name) ?? `SAT-${id}`,
    object_type: safeStr(record.OBJECT_TYPE ?? record.object_type),
    country_origin: safeStr(record.COUNTRY_CODE ?? record.country_code),
    launch_date: safeStr(record.LAUNCH_DATE ?? record.launch_date),
    epoch: safeStr(record.EPOCH ?? record.epoch),
    tle_source: 'Space-Track GP',
    line1,
    line2,
    fetched_at: new Date().toISOString(),
  };
}

function safeStr(value) {
  if (value == null) return null;
  const text = String(value).trim();
  return text || null;
}

function parseSetCookieHeader(header) {
  if (!header) return [];
  return header.split(/,(?=\s*[^;,]+=[^;,]+)/g).map((cookie) => cookie.trim());
}

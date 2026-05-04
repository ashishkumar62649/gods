import { createReadStream, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createGunzip } from 'node:zlib';
import { parse } from 'csv-parse';
import { AVIATION_REFERENCE_DATA_ROOT } from '../config/constants.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..', '..', '..');

const DATA_DIR = process.env.AVIATION_REFERENCE_DATA_ROOT || AVIATION_REFERENCE_DATA_ROOT;
const AIRCRAFT_GZIP_PATH = path.join(DATA_DIR, 'aircraft.csv.gz');
const AIRCRAFT_CSV_PATH = path.join(DATA_DIR, 'aircraft.csv');

const MILITARY_KEYWORDS = [
  'AIR FORCE',
  'USAF',
  'NAVY',
  'ARMY',
  'RAF',
  'NATO',
  'COAST GUARD',
  'MILITARY',
];

// Global RAM dictionary. Live polling only performs Map#get(), never disk IO.
export const aircraftCache = new Map();

// Compatibility shim for older callers that still expect an index object.
export const aircraftIndex = {
  available: false,
  sourcePath: null,
  loadError: null,
  aircraftByIcao: aircraftCache,
};

// Loads aircraft identity data once during server boot.
// This streams gzip/plain CSV rows through csv-parse, so the source file is
// never inflated into one giant string.
export async function initAircraftIndex() {
  const sourcePath = resolveAircraftCsvPath();

  aircraftCache.clear();
  aircraftIndex.available = false;
  aircraftIndex.sourcePath = sourcePath;
  aircraftIndex.loadError = null;

  if (!sourcePath) {
    const message = `Missing ${AIRCRAFT_GZIP_PATH} or ${AIRCRAFT_CSV_PATH}`;
    aircraftIndex.loadError = message;
    console.warn(`[AircraftIndex] SEVERE WARNING: ${message}. Continuing without aircraft identities.`);
    return aircraftCache;
  }

  try {
    let headers = null;
    let loadedCount = 0;

    const parser = createAircraftCsvStream(sourcePath);

    for await (const row of parser) {
      if (!Array.isArray(row) || row.length === 0) continue;

      // Support standard header CSVs while also handling the current
      // semicolon aircraft.csv.gz snapshot, which is positional/no-header.
      if (headers === null && looksLikeHeaderRow(row)) {
        headers = buildHeaderIndex(row);
        continue;
      }

      const identity = headers
        ? readHeaderRow(row, headers)
        : readPositionalRow(row);

      if (!identity) continue;

      aircraftCache.set(identity.icao24, {
        reg: identity.registration,
        type: identity.model,
        op: identity.operator,
        isMilitary: isMilitaryOperator(identity.operator, identity.owner),
      });
      loadedCount++;
    }

    aircraftIndex.available = true;
    console.log(
      `[AircraftIndex] Loaded ${loadedCount.toLocaleString()} aircraft identities from ${sourcePath}`,
    );
    return aircraftCache;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown aircraft CSV load error';
    aircraftCache.clear();
    aircraftIndex.loadError = message;
    console.warn(`[AircraftIndex] SEVERE WARNING: ${message}. Continuing with empty aircraft identity cache.`);
    return aircraftCache;
  }
}

// Hot-path lookup used by normalizers. O(1), synchronous, and disk-free.
export function getAircraftIdentity(hex) {
  const normalizedHex = normalizeIcao24(hex);
  return normalizedHex ? aircraftCache.get(normalizedHex) : undefined;
}

export function getAircraftStats() {
  return {
    available: aircraftIndex.available,
    sourcePath: aircraftIndex.sourcePath,
    aircraftCount: aircraftCache.size,
    error: aircraftIndex.loadError,
  };
}

function resolveAircraftCsvPath() {
  if (existsSync(AIRCRAFT_GZIP_PATH)) return AIRCRAFT_GZIP_PATH;
  if (existsSync(AIRCRAFT_CSV_PATH)) return AIRCRAFT_CSV_PATH;
  return null;
}

function createAircraftCsvStream(sourcePath) {
  const fileStream = createReadStream(sourcePath);
  const inputStream = sourcePath.toLowerCase().endsWith('.gz')
    ? fileStream.pipe(createGunzip())
    : fileStream;

  return inputStream.pipe(parse({
    bom: true,
    delimiter: [',', ';'],
    skip_empty_lines: true,
    relax_column_count: true,
    relax_quotes: true,
    trim: true,
  }));
}

function looksLikeHeaderRow(row) {
  const normalized = row.map(normalizeHeaderName);
  return normalized.includes('icao24') || normalized.includes('icao') || normalized.includes('hex');
}

function buildHeaderIndex(row) {
  const headers = new Map();
  row.forEach((name, index) => {
    const normalized = normalizeHeaderName(name);
    if (normalized) headers.set(normalized, index);
  });
  return headers;
}

function readHeaderRow(row, headers) {
  const icao24 = normalizeIcao24(readFirstHeader(row, headers, [
    'icao24',
    'icao',
    'icao_hex',
    'hex',
  ]));
  if (!icao24) return null;

  const registration = normalizeText(readFirstHeader(row, headers, [
    'registration',
    'reg',
    'tail',
    'tail_number',
  ]));
  const manufacturer = normalizeText(readFirstHeader(row, headers, ['manufacturer', 'make']));
  const model = normalizeText(readFirstHeader(row, headers, [
    'model',
    'type',
    'typecode',
    'aircraft_type',
    'description',
  ]));
  const operator = normalizeText(readFirstHeader(row, headers, [
    'operator',
    'owner_operator',
    'op',
  ]));
  const owner = normalizeText(readFirstHeader(row, headers, ['owner']));

  return {
    icao24,
    registration,
    model: buildAircraftType(manufacturer, model),
    operator: operator || owner,
    owner,
  };
}

function readPositionalRow(row) {
  const icao24 = normalizeIcao24(row[0]);
  if (!icao24) return null;

  // Current aircraft.csv.gz shape:
  // 0 icao24; 1 registration; 2 typecode; 3 flags; 4 description/model; 6 owner.
  const registration = normalizeText(row[1]);
  const typeCode = normalizeText(row[2]);
  const model = normalizeText(row[4]) || typeCode;
  const owner = normalizeText(row[6]);

  return {
    icao24,
    registration,
    model,
    operator: owner,
    owner,
  };
}

function readFirstHeader(row, headers, names) {
  for (const name of names) {
    const index = headers.get(name);
    if (index !== undefined) return row[index];
  }
  return null;
}

function buildAircraftType(manufacturer, model) {
  if (manufacturer && model && !model.toUpperCase().includes(manufacturer.toUpperCase())) {
    return `${manufacturer} ${model}`;
  }
  return model || manufacturer || null;
}

function isMilitaryOperator(operator, owner) {
  const haystack = `${operator || ''} ${owner || ''}`.toUpperCase();
  return MILITARY_KEYWORDS.some((keyword) => haystack.includes(keyword));
}

function normalizeIcao24(value) {
  const code = String(value || '').trim().toLowerCase();
  return /^[0-9a-f]{6}$/.test(code) ? code : null;
}

function normalizeText(value) {
  const text = typeof value === 'string' ? value.trim() : '';
  return text || null;
}

function normalizeHeaderName(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

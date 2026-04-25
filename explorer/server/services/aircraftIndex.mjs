import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'csv-parse/sync';
import { gunzipSync } from 'node:zlib';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..', '..');

const AIRCRAFT_CSV_PATH = path.join(projectRoot, 'server', 'data', 'aircraft.csv.gz');

export const aircraftIndex = loadAircraftIndex(AIRCRAFT_CSV_PATH);

export function getAircraftStats() {
  return {
    available: aircraftIndex.available,
    sourcePath: aircraftIndex.sourcePath,
    aircraftCount: aircraftIndex.aircraftByIcao.size,
    error: aircraftIndex.loadError,
  };
}

function loadAircraftIndex(csvPath) {
  if (!existsSync(csvPath)) {
    return emptyAircraftIndex(csvPath, 'File not found');
  }

  try {
    const buffer = readFileSync(csvPath);
    const isGzip = csvPath.toLowerCase().endsWith('.gz') || (buffer.length >= 2 && buffer[0] === 0x1f && buffer[1] === 0x8b);
    const source = isGzip ? gunzipSync(buffer).toString('utf8') : buffer.toString('utf8');

    const rows = parse(source, {
      delimiter: ';',
      skip_empty_lines: true,
      relax_column_count: true,
      trim: true,
    });

    const aircraftByIcao = new Map();

    for (const row of rows) {
      if (!row || row.length < 3) continue;
      
      const icao24 = normalizeAircraftIcao24(row[0]);
      if (!icao24) continue;

      aircraftByIcao.set(icao24, {
        icao24,
        registration: normalizeTextField(row[1]),
        typecode: normalizeAircraftTypeCode(row[2]),
        description: normalizeTextField(row[4]),
        owner: row.length >= 7 ? normalizeTextField(row[6]) : null,
      });
    }

    return {
      available: true,
      sourcePath: csvPath,
      loadError: null,
      aircraftByIcao,
    };
  } catch (error) {
    return emptyAircraftIndex(
      csvPath,
      error instanceof Error ? error.message : 'Unknown CSV parse error',
    );
  }
}

function emptyAircraftIndex(sourcePath, loadError) {
  return {
    available: false,
    sourcePath,
    loadError,
    aircraftByIcao: new Map(),
  };
}

function normalizeAircraftIcao24(value) {
  const code = String(value || '')
    .trim()
    .toLowerCase();

  return /^[0-9a-f]{6}$/.test(code) ? code : null;
}

function normalizeAircraftTypeCode(value) {
  const typeCode = String(value || '')
    .trim()
    .toUpperCase();

  return typeCode || null;
}

function normalizeTextField(value) {
  const text = typeof value === 'string' ? value.trim() : '';
  return text || null;
}

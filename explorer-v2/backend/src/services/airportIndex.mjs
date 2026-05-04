import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'csv-parse/sync';
import { AVIATION_REFERENCE_DATA_ROOT } from '../config/constants.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..', '..', '..');

const AIRPORTS_CSV_PATH = resolveAirportCsvPath();

export const airportIndex = loadAirportIndex(AIRPORTS_CSV_PATH);

export function getAirportStats() {
  return {
    available: airportIndex.available,
    sourcePath: airportIndex.sourcePath,
    airportCount: airportIndex.airports.length,
    routeCandidateAirportCount: airportIndex.routeAirports.length,
    error: airportIndex.loadError,
  };
}

function loadAirportIndex(csvPath) {
  if (!existsSync(csvPath)) {
    return emptyAirportIndex(csvPath, 'File not found');
  }

  try {
    const source = readFileSync(csvPath, 'utf8');
    const rows = parse(source, {
      columns: true,
      skip_empty_lines: true,
      bom: true,
      relax_column_count: true,
      trim: true,
    });

    const airportsByCode = new Map();
    const airports = [];
    const routeAirports = [];

    for (const row of rows) {
      const airport = normalizeAirportRow(row);
      if (!airport) continue;

      for (const code of buildAirportCodes(airport)) {
        airportsByCode.set(code, airport);
      }

      airports.push(serializeAirport(airport));

      if (isRouteCandidateAirport(airport)) {
        routeAirports.push(airport);
      }
    }

    airports.sort((a, b) => a.name.localeCompare(b.name));

    return {
      available: true,
      sourcePath: csvPath,
      loadError: null,
      airportsByCode,
      airports,
      routeAirports,
    };
  } catch (error) {
    return emptyAirportIndex(
      csvPath,
      error instanceof Error ? error.message : 'Unknown CSV parse error',
    );
  }
}

function emptyAirportIndex(sourcePath, loadError) {
  return {
    available: false,
    sourcePath,
    loadError,
    airportsByCode: new Map(),
    airports: [],
    routeAirports: [],
  };
}

function normalizeAirportRow(row) {
  const latitude = toFiniteNumber(Number(row.latitude_deg ?? row.latitude ?? row.lat ?? NaN));
  const longitude = toFiniteNumber(Number(row.longitude_deg ?? row.longitude ?? row.lon ?? NaN));
  const type = String(row.type || '').trim();
  const ident = normalizeAirportCode(row.ident);

  if (latitude === null || longitude === null || !type || !ident) {
    return null;
  }

  return {
    id: String(row.id || ident).trim(),
    ident,
    type,
    name: String(row.name || ident).trim(),
    municipality: typeof row.municipality === 'string' ? row.municipality.trim() || null : null,
    isoCountry: typeof row.iso_country === 'string' ? row.iso_country.trim() || null : null,
    iataCode: normalizeAirportCode(row.iata_code),
    icaoCode: normalizeAirportCode(row.gps_code) || ident,
    localCode: normalizeAirportCode(row.local_code),
    latitude,
    longitude,
  };
}

function buildAirportCodes(airport) {
  return Array.from(new Set([
    airport.ident,
    airport.icaoCode,
    airport.iataCode,
    airport.localCode,
  ])).filter(Boolean);
}

function serializeAirport(airport) {
  return {
    id: airport.id,
    ident: airport.ident,
    name: airport.name,
    type: airport.type,
    municipality: airport.municipality,
    isoCountry: airport.isoCountry,
    iataCode: airport.iataCode,
    icaoCode: airport.icaoCode,
    latitude: airport.latitude,
    longitude: airport.longitude,
  };
}

function isRouteCandidateAirport(airport) {
  return (
    airport.type === 'large_airport' ||
    airport.type === 'medium_airport' ||
    airport.type === 'small_airport'
  );
}

function resolveAirportCsvPath() {
  const configuredPath = process.env.AIRPORTS_CSV_PATH?.trim();
  if (!configuredPath) {
    return path.join(AVIATION_REFERENCE_DATA_ROOT, 'airports.csv');
  }

  return path.isAbsolute(configuredPath)
    ? configuredPath
    : path.resolve(projectRoot, configuredPath);
}

function normalizeAirportCode(value) {
  const code = typeof value === 'string' ? value.trim().toUpperCase() : '';
  return code || null;
}

function toFiniteNumber(value) {
  return Number.isFinite(value) ? value : null;
}

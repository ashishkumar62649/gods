import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const climateStatePath = path.resolve(__dirname, '..', 'data', 'climate-state.json');

function ensureClimateStateDirectory() {
  mkdirSync(path.dirname(climateStatePath), { recursive: true });
}

export function getClimateStatePath() {
  return climateStatePath;
}

export function readLatestClimateState() {
  if (!existsSync(climateStatePath)) {
    return null;
  }

  try {
    const raw = readFileSync(climateStatePath, 'utf8');
    const parsed = JSON.parse(raw);
    return isValidClimateState(parsed) ? parsed : null;
  } catch (error) {
    console.error('[Climate] Failed to read climate state:', error);
    return null;
  }
}

export function writeLatestClimateState(state) {
  if (!isValidClimateState(state)) {
    throw new Error('Climate state write rejected: invalid schema.');
  }

  ensureClimateStateDirectory();
  const tempPath = `${climateStatePath}.tmp`;
  const body = `${JSON.stringify(state, null, 2)}\n`;
  writeFileSync(tempPath, body, 'utf8');
  renameSync(tempPath, climateStatePath);
  return state;
}

function isValidClimateState(value) {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const state = value;
  return (
    typeof state.timestamp === 'string' &&
    (state.activeSource === 'OWM' || state.activeSource === 'FALLBACK') &&
    typeof state.precipitationUrl === 'string' &&
    typeof state.temperatureUrl === 'string' &&
    typeof state.cloudsUrl === 'string' &&
    typeof state.windUrl === 'string' &&
    typeof state.pressureUrl === 'string'
  );
}

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const migration = readFileSync(
  new URL('../../database/postgres/migrations/0006_v2_domain_schemas.sql', import.meta.url),
  'utf8',
);
const operationalMigration = readFileSync(
  new URL('../../database/postgres/migrations/0007_v2_operational_domain_tables.sql', import.meta.url),
  'utf8',
);

test('v2 domain database migration creates core and intelligence schemas', () => {
  for (const schema of [
    'core',
    'aviation',
    'weather',
    'satellites',
    'maritime',
    'hazards',
    'infrastructure',
    'locations',
    'economy',
    'population',
    'news',
  ]) {
    assert.match(migration, new RegExp(`CREATE SCHEMA IF NOT EXISTS ${schema};`));
  }
});

test('v2 operational migration defines major domain tables and current views', () => {
  for (const table of [
    'aviation.live_flight_snapshots',
    'aviation.airports',
    'satellites.tle_catalog',
    'satellites.state_snapshots',
    'maritime.vessels',
    'maritime.position_snapshots',
    'infrastructure.cables',
    'infrastructure.landing_points',
    'hazards.events',
  ]) {
    assert.match(operationalMigration, new RegExp(`CREATE TABLE IF NOT EXISTS ${table.replace('.', '\\.')}`));
  }
  for (const view of [
    'aviation.current_flights',
    'satellites.current_states',
    'maritime.current_positions',
    'hazards.current_events',
  ]) {
    assert.match(operationalMigration, new RegExp(`CREATE OR REPLACE VIEW ${view.replace('.', '\\.')}`));
  }
});

test('v2 domain database migration defines shared platform tables', () => {
  for (const table of [
    'core.source_registry',
    'core.fetch_runs',
    'core.source_health',
    'core.entities',
    'core.provenance',
  ]) {
    assert.match(migration, new RegExp(`CREATE TABLE IF NOT EXISTS ${table.replace('.', '\\.')}`));
  }
});

import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  LIVE_BINARY_CONTENT_TYPE,
  encodeFlightsLiveBinary,
  encodeMaritimeLiveBinary,
  encodeSatellitesLiveBinary,
} from '../../backend/src/core/binaryTransport.mjs';
import { parseTilePath } from '../../backend/src/core/tilePaths.mjs';

test('live binary flight payload has stable header and record size', () => {
  const buffer = encodeFlightsLiveBinary([
    {
      id_icao: 'abc123',
      timestamp: 1777850000,
      latitude: 22.57,
      longitude: 88.36,
      altitude_baro_m: 11000,
      velocity_mps: 220,
      heading_true_deg: 90,
      vertical_rate_mps: 0,
      is_military: true,
      is_active_emergency: false,
      is_interesting: true,
      is_pia: false,
      is_ladd: false,
      on_ground: false,
      callsign: 'TEST123',
    },
  ]);
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  assert.equal(view.getUint32(0, true), 0x47453242);
  assert.equal(view.getUint16(4, true), 1);
  assert.equal(view.getUint16(6, true), 1);
  assert.equal(view.getUint32(8, true), 1);
  assert.equal(view.getUint32(12, true), 40);
  assert.equal(buffer.byteLength, 56);
  assert.match(LIVE_BINARY_CONTENT_TYPE, /god-eyes\.live/);
});

test('live binary encoders skip records without points', () => {
  const satellites = encodeSatellitesLiveBinary([{ id_norad: 1 }, { id_norad: 2, latitude: 1, longitude: 2 }]);
  const maritime = encodeMaritimeLiveBinary([{ vessel_id: 'x' }, { vessel_id: 'y', latitude: 1, longitude: 2 }]);
  assert.equal(new DataView(satellites.buffer, satellites.byteOffset, satellites.byteLength).getUint32(8, true), 1);
  assert.equal(new DataView(maritime.buffer, maritime.byteOffset, maritime.byteLength).getUint32(8, true), 1);
});

test('MVT path parser recognizes v2 tile endpoints', () => {
  assert.deepEqual(parseTilePath('/api/v2/weather/tiles/4/5/6.mvt', '/api/v2/weather/tiles'), { z: 4, x: 5, y: 6 });
  assert.equal(parseTilePath('/api/v2/weather/tiles/99/5/6.mvt', '/api/v2/weather/tiles'), null);
});

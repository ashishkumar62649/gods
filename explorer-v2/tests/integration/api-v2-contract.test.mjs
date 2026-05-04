import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const server = readFileSync(new URL('../../backend/src/index.mjs', import.meta.url), 'utf8');

test('backend keeps /api/v2 as the preferred public namespace', () => {
  assert.match(server, /normalizeApiUrl/);
  assert.match(server, /\/api\/v2\//);
});

test('backend exposes optimized v2 binary and vector tile routes', () => {
  assert.match(server, /\/api\/v2\/aviation\/flights\/live\.bin/);
  assert.match(server, /\/api\/v2\/satellites\/live\.bin/);
  assert.match(server, /\/api\/v2\/maritime\/live\.bin/);
  assert.match(server, /\/api\/v2\/weather\/tiles/);
  assert.match(server, /\/api\/v2\/hazards\/tiles/);
  assert.match(server, /\/api\/v2\/infrastructure\/cables\/tiles/);
});

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const explorerRoot = fileURLToPath(new URL('../..', import.meta.url));

function runPython(args) {
  return spawnSync('python', args, {
    cwd: explorerRoot,
    encoding: 'utf8',
  });
}

test('Python pipeline structure check passes', () => {
  const result = runPython(['-m', 'pipelines.cli', '--check']);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /"runtime": "python"/);
});

test('weather pipeline default entrypoint is Python and supports non-writing plan mode', () => {
  const result = runPython(['-m', 'pipelines.weather.jobs.run_weather_pipeline', '--plan-only']);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /"domain": "weather"/);
  assert.match(result.stdout, /"load_db"/);
});

test('hazard pipeline supports non-writing plan mode', () => {
  const result = runPython(['-m', 'pipelines.weather.jobs.run_hazard_pipeline', '--plan-only']);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /"domain": "hazards"/);
  assert.match(result.stdout, /"source": "usgs_earthquake"/);
});

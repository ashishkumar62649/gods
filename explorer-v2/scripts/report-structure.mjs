import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const reportPath = resolve('docs/STRUCTURE_AND_DATA_PLATFORM.md');

if (!existsSync(reportPath)) {
  console.error(`Missing canonical structure report: ${reportPath}`);
  process.exit(1);
}

console.log(`God Eyes v2 structure report: ${reportPath}`);
console.log('Read this file before adding new code, sources, migrations, or generated data.');

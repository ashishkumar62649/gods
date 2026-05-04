import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const cwd = fileURLToPath(new URL('..', import.meta.url));

for (const [label, command] of [
  ['frontend', 'npm --prefix frontend run build'],
]) {
  console.log(`[build:${label}] ${command}`);
  const result = spawnSync(command, {
    cwd,
    stdio: 'inherit',
    shell: true,
  });

  if (result.status !== 0) {
    if (result.error) console.error(result.error);
    process.exit(result.status ?? 1);
  }
}

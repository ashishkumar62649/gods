import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const commands = [
  ['backend', 'npm --prefix backend run dev'],
  ['frontend', 'npm --prefix frontend run dev'],
];
const cwd = fileURLToPath(new URL('..', import.meta.url));

const children = commands.map(([name, command]) => {
  const child = spawn(command, {
    cwd,
    stdio: 'inherit',
    shell: true,
  });

  child.on('exit', (code) => {
    if (code && code !== 0) {
      console.error(`[dev:${name}] exited with code ${code}`);
      process.exitCode = code;
    }
  });

  return child;
});

function shutdown() {
  for (const child of children) {
    if (!child.killed) child.kill();
  }
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

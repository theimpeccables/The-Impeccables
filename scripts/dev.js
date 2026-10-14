import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const processes = [
  { name: 'frontend', cwd: resolve(rootDir, 'frontend') },
  { name: 'backend', cwd: resolve(rootDir, 'backend') },
].map(({ name, cwd }) => {
  const child = spawn('npm', ['run', 'dev'], {
    cwd,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: process.env,
  });
  child.on('error', (error) => {
    console.error(`[dev:${name}] ${error.message}`);
    shutdown(1);
  });
  child.on('exit', (code) => {
    if (!shuttingDown && code !== 0) shutdown(code || 1);
  });
  return child;
});

let shuttingDown = false;
function shutdown(exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of processes) {
    if (child.exitCode === null && !child.killed) child.kill('SIGTERM');
  }
  process.exitCode = exitCode;
}

process.once('SIGINT', () => shutdown(0));
process.once('SIGTERM', () => shutdown(0));

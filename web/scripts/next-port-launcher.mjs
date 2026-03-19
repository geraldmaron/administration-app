/*
 * Launches Next.js dev/start on a preferred port with automatic fallback to the
 * next available port when the preferred port is already in use.
 */

import net from 'node:net';
import { spawn } from 'node:child_process';

const mode = process.argv[2];

if (!mode || (mode !== 'dev' && mode !== 'start')) {
  console.error('Usage: node scripts/next-port-launcher.mjs <dev|start>');
  process.exit(1);
}

const requestedPort = Number.parseInt(process.env.PORT ?? '3001', 10);
const startPort = Number.isFinite(requestedPort) ? requestedPort : 3001;
const scanLimit = 20;

function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.once('error', (error) => {
      if (error && (error.code === 'EADDRINUSE' || error.code === 'EACCES')) {
        resolve(false);
        return;
      }
      resolve(false);
    });

    server.once('listening', () => {
      server.close(() => resolve(true));
    });

    server.listen(port, '0.0.0.0');
  });
}

async function findAvailablePort() {
  for (let port = startPort; port < startPort + scanLimit; port += 1) {
    // eslint-disable-next-line no-await-in-loop
    const available = await isPortAvailable(port);
    if (available) return port;
  }

  throw new Error(`No open port found in range ${startPort}-${startPort + scanLimit - 1}`);
}

async function main() {
  const port = await findAvailablePort();
  if (port !== startPort) {
    console.log(`[next-port-launcher] Port ${startPort} busy; using ${port}`);
  } else {
    console.log(`[next-port-launcher] Using port ${port}`);
  }

  const child = spawn('next', [mode, '-p', String(port)], {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: process.env,
  });

  child.on('exit', (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }
    process.exit(code ?? 1);
  });
}

main().catch((error) => {
  console.error(`[next-port-launcher] ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});

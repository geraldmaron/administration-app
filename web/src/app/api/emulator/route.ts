export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { type ChildProcess, spawn } from 'child_process';
import * as net from 'net';
import * as path from 'path';

let emulatorProcess: ChildProcess | null = null;
let emulatorStatus: 'stopped' | 'starting' | 'ready' | 'error' = 'stopped';
let emulatorError: string | null = null;
let emulatorOutput = '';

function appendEmulatorOutput(chunk: string): void {
  emulatorOutput = `${emulatorOutput}${chunk}`.slice(-8000);
}

function summarizeEmulatorFailure(code: number | null): string {
  const output = emulatorOutput.trim();

  if (/Unable to locate a Java Runtime|java -version|Java is installed/i.test(output)) {
    return 'Firebase emulator start failed: Java runtime not found. Install a JDK/JRE and ensure `java` is on PATH.';
  }

  if (/command not found|spawn .* ENOENT|firebase: not found/i.test(output)) {
    return 'Firebase emulator start failed: Firebase CLI not found on PATH.';
  }

  const lastLines = output
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .slice(-3)
    .join(' ');

  return lastLines || `Process exited with code ${code}`;
}

function probePort(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let settled = false;

    const finish = (result: boolean) => {
      if (!settled) {
        settled = true;
        socket.destroy();
        resolve(result);
      }
    };

    socket.setTimeout(1000);
    socket.on('connect', () => finish(true));
    socket.on('error', () => finish(false));
    socket.on('timeout', () => finish(false));
    socket.connect(port, '127.0.0.1');
  });
}

export async function GET() {
  const [firestoreUp, functionsUp] = await Promise.all([
    probePort(8080),
    probePort(5001),
  ]);

  if (firestoreUp && functionsUp) {
    emulatorStatus = 'ready';
    emulatorError = null;
  } else if (
    (emulatorStatus === 'stopped' || emulatorStatus === 'error') &&
    (firestoreUp || functionsUp)
  ) {
    emulatorStatus = 'ready';
    emulatorError = null;
  }

  return NextResponse.json({
    status: emulatorStatus,
    ...(emulatorError ? { error: emulatorError } : {}),
  });
}

export async function POST() {
  const firestoreUp = await probePort(8080);

  if (firestoreUp) {
    emulatorStatus = 'ready';
    emulatorError = null;
    return NextResponse.json({ status: 'ready' });
  }

  if (emulatorStatus === 'starting') {
    return NextResponse.json({ status: 'starting' });
  }

  emulatorStatus = 'starting';
  emulatorError = null;
  emulatorOutput = '';

  const repoRoot = path.resolve(process.cwd(), '..');

  const proc = spawn(
    'firebase',
    ['emulators:start', '--only', 'functions,firestore,auth'],
    { cwd: repoRoot, stdio: ['ignore', 'pipe', 'pipe'], detached: false }
  );

  emulatorProcess = proc;

  proc.stdout?.on('data', (chunk: Buffer | string) => {
    appendEmulatorOutput(String(chunk));
  });

  proc.stderr?.on('data', (chunk: Buffer | string) => {
    appendEmulatorOutput(String(chunk));
  });

  proc.on('error', (err: Error) => {
    emulatorStatus = 'error';
    emulatorError = err.message;
    emulatorProcess = null;
  });

  proc.on('exit', (code: number | null) => {
    if (emulatorStatus !== 'ready') {
      emulatorStatus = 'error';
      emulatorError = summarizeEmulatorFailure(code);
    }
    emulatorProcess = null;
  });

  return NextResponse.json({ status: 'starting' });
}

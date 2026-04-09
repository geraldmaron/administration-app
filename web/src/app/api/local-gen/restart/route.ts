import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import { execSync } from 'child_process';
import path from 'path';
import { db } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { requireAdminAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const LOCAL_GEN_PORT = 3099;

function findPidsOnPort(port: number): number[] {
  try {
    const out = execSync(`lsof -ti :${port}`, { encoding: 'utf8' }).trim();
    return out.split('\n').map(Number).filter(Boolean);
  } catch {
    return [];
  }
}

async function forceFailStuckJobs(): Promise<number> {
  const snap = await db.collection('generation_jobs')
    .where('status', '==', 'running')
    .get();

  const stuck = snap.docs.filter((doc) => {
    const d = doc.data();
    return d.currentPhase === 'queued_local' || d.executionTarget === 'local';
  });

  await Promise.all(stuck.map(async (doc) => {
    const ref = db.collection('generation_jobs').doc(doc.id);
    const msg = 'Local runner restarted by operator — resubmit to retry.';
    await Promise.all([
      ref.update({
        status: 'failed',
        error: msg,
        completedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        currentPhase: 'failed',
        currentMessage: msg,
      }),
      ref.collection('events').add({
        timestamp: FieldValue.serverTimestamp(),
        level: 'error',
        code: 'job_runner_restarted',
        message: msg,
      }),
    ]);
  }));

  return stuck.length;
}

export async function POST(request: NextRequest) {
  const authError = requireAdminAuth(request);
  if (authError) return authError;

  try {
    const pids = findPidsOnPort(LOCAL_GEN_PORT);
    for (const pid of pids) {
      try { process.kill(pid, 'SIGKILL'); } catch { /* already dead */ }
    }

    const failedCount = await forceFailStuckJobs();

    const functionsDir = path.resolve(process.cwd(), '..', 'functions');
    const child = spawn('npm', ['exec', 'tsx', 'src/tools/local-gen-server.ts'], {
      cwd: functionsDir,
      detached: true,
      stdio: 'ignore',
      env: { ...process.env, FORCE_COLOR: '0' },
    });
    child.unref();

    return NextResponse.json({ ok: true, killedPids: pids, failedJobs: failedCount });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Restart failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

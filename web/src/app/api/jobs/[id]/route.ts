import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { db } from '@/lib/firebase-admin';
import { requireAdminAuth } from '@/lib/auth';
import fs from 'fs/promises';
import path from 'path';

export const dynamic = 'force-dynamic';
import type { JobDetail, JobEvent, JobAttemptSummary, JobFailureAnalysis } from '@/lib/types';

type PhaseName = 'concept' | 'blueprint' | 'details';

async function getLiveActivity(data: FirebaseFirestore.DocumentData) {
  const status = data.status ?? 'pending';
  if (status !== 'running' && status !== 'pending') return undefined;

  const bundles = Array.isArray(data.bundles)
    ? data.bundles.filter((b: unknown): b is string => typeof b === 'string')
    : [];
  if (bundles.length === 0) return undefined;

  const hasProgress = typeof data.progress === 'number' && data.progress > 0;
  const hasResults = Array.isArray(data.results) && data.results.length > 0;
  if (hasProgress || hasResults) return undefined;

  const startedAtDate = data.startedAt?.toDate?.() ?? data.requestedAt?.toDate?.();
  if (!(startedAtDate instanceof Date)) return undefined;

  const metricsSnap = await db
    .collection('generation_metrics')
    .where('timestamp', '>=', startedAtDate)
    .orderBy('timestamp', 'desc')
    .limit(120)
    .get();

  const bundleSet = new Set(bundles);
  const byBundle: Record<string, {
    attempts: number;
    concept: number;
    blueprint: number;
    details: number;
    successes: number;
    scoreTotal: number;
    scoreCount: number;
  }> = {};

  let totalAttempts = 0;
  let lastMetricAt: string | undefined;

  for (const doc of metricsSnap.docs) {
    const metric = doc.data();
    const bundle = typeof metric.bundle === 'string' ? metric.bundle : '';
    if (!bundleSet.has(bundle)) continue;

    if (!byBundle[bundle]) {
      byBundle[bundle] = {
        attempts: 0,
        concept: 0,
        blueprint: 0,
        details: 0,
        successes: 0,
        scoreTotal: 0,
        scoreCount: 0,
      };
    }

    const row = byBundle[bundle];
    row.attempts += 1;
    totalAttempts += 1;

    const phase = metric.phase as PhaseName | undefined;
    if (phase === 'concept' || phase === 'blueprint' || phase === 'details') {
      row[phase] += 1;
    }

    if (metric.success === true) {
      row.successes += 1;
    }

    if (typeof metric.auditScore === 'number') {
      row.scoreTotal += metric.auditScore;
      row.scoreCount += 1;
    }

    const tsIso = metric.timestamp?.toDate?.()?.toISOString?.();
    if (!lastMetricAt && typeof tsIso === 'string') {
      lastMetricAt = tsIso;
    }
  }

  if (totalAttempts === 0) return undefined;

  const normalizedByBundle: Record<string, {
    attempts: number;
    concept: number;
    blueprint: number;
    details: number;
    successes: number;
    avgAuditScore?: number;
  }> = {};

  for (const [bundle, row] of Object.entries(byBundle)) {
    normalizedByBundle[bundle] = {
      attempts: row.attempts,
      concept: row.concept,
      blueprint: row.blueprint,
      details: row.details,
      successes: row.successes,
      ...(row.scoreCount > 0 ? { avgAuditScore: Math.round((row.scoreTotal / row.scoreCount) * 10) / 10 } : {}),
    };
  }

  return {
    totalAttempts,
    lastMetricAt,
    byBundle: normalizedByBundle,
  };
}

function toDetail(id: string, data: FirebaseFirestore.DocumentData): JobDetail {
  return {
    id,
    status: data.status ?? 'pending',
    bundles: data.bundles ?? [],
    count: data.count ?? 0,
    requestedAt: data.requestedAt?.toDate?.()?.toISOString() ?? new Date(0).toISOString(),
    progress: data.progress,
    completedCount: data.completedCount,
    failedCount: data.failedCount,
    description: data.description,
    total: data.total,
    mode: data.mode ?? 'manual',
    distributionConfig: data.distributionConfig ?? { mode: 'auto' },
    regions: data.regions,
    region: data.region,
    requestedBy: data.requestedBy,
    priority: data.priority ?? 'normal',
    startedAt: data.startedAt?.toDate?.()?.toISOString(),
    completedAt: data.completedAt?.toDate?.()?.toISOString(),
    savedScenarioIds: data.savedScenarioIds,
    results: data.results,
    errors: data.errors,
    error: data.error,
    auditSummary: data.auditSummary,
    rateLimitRetries: data.rateLimitRetries,
    currentBundle: data.currentBundle,
    currentPhase: data.currentPhase,
    currentMessage: data.currentMessage,
    lastHeartbeatAt: data.lastHeartbeatAt?.toDate?.()?.toISOString(),
    executionTarget: data.executionTarget,
    dryRun: data.dryRun ?? false,
    modelConfig: data.modelConfig,
    tokenSummary: data.tokenSummary,
    eventCount: data.eventCount,
  };
}

async function getAttemptSummary(
  startedAt: Date | undefined,
  completedAt: Date | undefined,
  bundles: string[]
): Promise<JobAttemptSummary[]> {
  if (!startedAt || !completedAt || bundles.length === 0) return [];

  const bundleSet = new Set(bundles);
  const snap = await db
    .collection('generation_attempts')
    .where('timestamp', '>=', startedAt)
    .where('timestamp', '<=', completedAt)
    .orderBy('timestamp', 'asc')
    .limit(200)
    .get();

  return snap.docs
    .map((doc) => {
      const d = doc.data();
      return {
        bundle: d.bundle ?? '',
        phase: d.phase ?? '',
        modelUsed: d.modelUsed ?? '',
        success: d.success ?? false,
        auditScore: typeof d.auditScore === 'number' ? d.auditScore : undefined,
        failureReasons: Array.isArray(d.failureReasons) ? d.failureReasons : undefined,
        retryCount: d.retryCount ?? 0,
        tokenUsage: d.tokenUsage,
      } as JobAttemptSummary;
    })
    .filter((a) => bundleSet.has(a.bundle));
}

function toEvent(id: string, data: FirebaseFirestore.DocumentData): JobEvent {
  return {
    id,
    timestamp: data.timestamp?.toDate?.()?.toISOString(),
    level: data.level ?? 'info',
    code: data.code ?? 'event',
    message: data.message ?? '',
    bundle: data.bundle,
    phase: data.phase,
    scenarioId: data.scenarioId,
    data: data.data,
  };
}

async function getFailureAnalysis(jobId: string, data: FirebaseFirestore.DocumentData): Promise<JobFailureAnalysis | undefined> {
  if (data.status !== 'failed') return undefined;

  const executionTarget = typeof data.executionTarget === 'string' ? data.executionTarget : '';
  if (!executionTarget.includes('local')) return undefined;

  const logPath = path.join(process.cwd(), '..', `ollama-runner-${jobId}.log`);

  let logText: string;
  try {
    logText = await fs.readFile(logPath, 'utf8');
  } catch {
    return undefined;
  }

  const lines = logText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const contextWindowErrors = Array.from(new Set(
    lines
      .filter((line) => line.includes('n_keep:') && line.includes('n_ctx:'))
      .map((line) => {
        const match = line.match(/\{"error":"([^"]+)"\}/);
        return match ? match[1] : line;
      })
  ));

  if (contextWindowErrors.length > 0) {
    const modelLine = lines.find((line) => line.startsWith('[Ollama] Request to '));
    const modelMatch = modelLine?.match(/^\[Ollama\] Request to (.+?) \(attempt/);
    const actFailure = lines.find((line) => line.includes('Failed to generate Act'));
    const loopFailure = lines.find((line) => line.includes('Loop validation failed:'));

    return {
      source: 'runner-log',
      summary: `${modelMatch?.[1] ?? 'The Ollama drafter model'} could not accept the generated prompt because its loaded context window is too small. Ollama returned HTTP 400 for every draft attempt, no act was produced, and the bundle finished with zero scenarios.`,
      evidence: [
        contextWindowErrors[0],
        actFailure,
        loopFailure,
      ].filter((value): value is string => Boolean(value)),
    };
  }

  const httpErrors = Array.from(new Set(
    lines
      .filter((line) => line.includes('[Ollama] Error '))
      .slice(-5)
      .map((line) => line.replace(/^\[Ollama\] /, ''))
  ));

  if (httpErrors.length > 0) {
    return {
      source: 'runner-log',
      summary: 'The Ollama runner failed during drafting and the bundle produced no accepted scenarios.',
      evidence: httpErrors,
    };
  }

  return undefined;
}

async function appendJobEvent(
  jobRef: FirebaseFirestore.DocumentReference,
  event: {
    level: 'info' | 'warning' | 'error' | 'success';
    code: string;
    message: string;
  },
  heartbeat?: { currentPhase?: string; currentMessage?: string }
) {
  const timestamp = FieldValue.serverTimestamp();
  await Promise.all([
    jobRef.collection('events').add({
      timestamp,
      level: event.level,
      code: event.code,
      message: event.message,
    }),
    jobRef.set({
      lastHeartbeatAt: timestamp,
      eventCount: FieldValue.increment(1),
      ...(heartbeat?.currentPhase !== undefined ? { currentPhase: heartbeat.currentPhase } : {}),
      ...(heartbeat?.currentMessage !== undefined ? { currentMessage: heartbeat.currentMessage } : {}),
    }, { merge: true }),
  ]);
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const docRef = db.collection('generation_jobs').doc(params.id);
    const [doc, eventsSnap] = await Promise.all([
      docRef.get(),
      docRef.collection('events').orderBy('timestamp', 'desc').limit(120).get(),
    ]);
    if (!doc.exists) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    const data = doc.data()!;
    const detail = toDetail(doc.id, data);
    const startedAt = data.startedAt?.toDate?.() as Date | undefined;
    const completedAt = data.completedAt?.toDate?.() as Date | undefined;
    const bundles: string[] = Array.isArray(data.bundles) ? data.bundles : [];

    const events = eventsSnap.docs.map((eventDoc) => toEvent(eventDoc.id, eventDoc.data())).reverse();
    const [liveActivity, attemptSummary, failureAnalysis] = await Promise.all([
      getLiveActivity(data),
      getAttemptSummary(startedAt, completedAt, bundles),
      getFailureAnalysis(doc.id, data),
    ]);

    // Backfill results from saved scenarios when results array is empty (n8n path)
    let backfilledResults = detail.results;
    if ((!backfilledResults || backfilledResults.length === 0) && detail.savedScenarioIds?.length) {
      const ids = detail.savedScenarioIds.slice(0, 50);
      const scenarioDocs = await Promise.all(
        ids.map(sid => db.collection('scenarios').doc(sid).get())
      );
      backfilledResults = scenarioDocs
        .filter(d => d.exists)
        .map(d => {
          const s = d.data()!;
          return {
            id: d.id,
            title: s.title ?? '',
            bundle: s.metadata?.bundle ?? '',
            auditScore: s.metadata?.auditMetadata?.score,
            autoFixed: s.metadata?.auditMetadata?.autoFixed ?? false,
          };
        });
    }

    return NextResponse.json({
      ...detail,
      ...(backfilledResults?.length ? { results: backfilledResults } : {}),
      events,
      ...(liveActivity ? { liveActivity } : {}),
      ...(attemptSummary.length > 0 ? { attemptSummary } : {}),
      ...(failureAnalysis ? { failureAnalysis } : {}),
    });
  } catch (err) {
    console.error('GET /api/jobs/[id] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authError = requireAdminAuth(request);
  if (authError) return authError;

  try {
    const jobRef = db.collection('generation_jobs').doc(params.id);
    const doc = await jobRef.get();
    if (!doc.exists) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    const data = doc.data()!;
    if (data.status === 'running') {
      return NextResponse.json({ error: 'Cannot delete a running job' }, { status: 400 });
    }
    await appendJobEvent(jobRef, {
      level: 'warning',
      code: 'job_deleted',
      message: 'Pending job deleted by operator.',
    }, { currentPhase: 'cancelled', currentMessage: 'Pending job deleted' });
    await jobRef.delete();
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/jobs/[id] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authError = requireAdminAuth(request);
  if (authError) return authError;

  try {
    const body = await request.json() as { action?: unknown };
    if (body.action !== 'stop') {
      return NextResponse.json({ error: 'Invalid action. Supported: stop' }, { status: 400 });
    }

    const doc = await db.collection('generation_jobs').doc(params.id).get();
    if (!doc.exists) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const data = doc.data()!;
    const terminalStatuses = ['completed', 'failed', 'cancelled'];
    if (terminalStatuses.includes(data.status)) {
      return NextResponse.json(
        { error: `Job is already in terminal state: ${data.status}` },
        { status: 400 }
      );
    }

    const jobRef = db.collection('generation_jobs').doc(params.id);
    await jobRef.update({
      status: 'cancelled',
      completedAt: FieldValue.serverTimestamp(),
      lastHeartbeatAt: FieldValue.serverTimestamp(),
      currentPhase: 'cancelled',
      currentMessage: 'Stop requested by operator',
    });
    await appendJobEvent(jobRef, {
      level: 'warning',
      code: 'job_stop_requested',
      message: 'Stop requested by operator.',
    }, { currentPhase: 'cancelled', currentMessage: 'Stop requested by operator' });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('PATCH /api/jobs/[id] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

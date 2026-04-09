import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import type { GenerationRunDetail, JobEvent, JobIssueSummary, JobSummary } from '@/lib/types';
import { rollupRunDocument, toJobSummary } from '../_lib';

export const dynamic = 'force-dynamic';

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

function buildRunIssueSummaries(jobs: JobSummary[], mergedEvents: Array<JobEvent & { jobId: string; jobLabel?: string }>): JobIssueSummary[] {
  const buckets = new Map<string, JobIssueSummary>();

  const upsert = (key: string, next: Omit<JobIssueSummary, 'count' | 'examples'> & { example?: string }) => {
    const existing = buckets.get(key);
    if (existing) {
      existing.count += 1;
      if (next.example && !existing.examples.includes(next.example) && existing.examples.length < 4) {
        existing.examples.push(next.example);
      }
      return;
    }
    buckets.set(key, {
      category: next.category,
      severity: next.severity,
      title: next.title,
      summary: next.summary,
      count: 1,
      examples: next.example ? [next.example] : [],
    });
  };

  for (const job of jobs) {
    if (job.errors?.length) {
      upsert('job-errors', {
        category: 'runtime',
        severity: 'warning',
        title: 'Child job errors',
        summary: 'One or more child jobs reported bundle-level failures or runtime problems.',
        example: job.errors[0]?.error,
      });
    }
  }

  for (const event of mergedEvents) {
    if (event.code === 'audit_fail') {
      const issues = Array.isArray(event.data?.issues) ? event.data?.issues as Array<{ rule?: string; message?: string }> : [];
      const tokenIssue = issues.find((issue) => issue.rule === 'invalid-token');
      upsert(tokenIssue ? 'token' : 'audit', {
        category: tokenIssue ? 'token' : 'audit',
        severity: 'warning',
        title: tokenIssue ? 'Invalid token output across child jobs' : 'Audit failures across child jobs',
        summary: tokenIssue
          ? 'Child jobs emitted unsupported placeholders that were rejected during audit.'
          : 'Child jobs failed editorial or structural quality checks during generation.',
        example: tokenIssue?.message ?? event.message,
      });
    }
    if (event.code === 'engine_aborted') {
      upsert('aborted', {
        category: 'runtime',
        severity: 'warning',
        title: 'Bundles aborted before completion',
        summary: 'At least one child job aborted a bundle before producing all requested scenarios.',
        example: `${event.jobLabel ?? event.jobId}: ${event.message}`,
      });
    }
  }

  return [...buckets.values()].sort((a, b) => b.count - a.count);
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const runRef = db.collection('generation_runs').doc(params.id);
    const [runDoc, jobsSnap] = await Promise.all([
      runRef.get(),
      db.collection('generation_jobs').where('runId', '==', params.id).get(),
    ]);

    if (!runDoc.exists) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const runData = runDoc.data() ?? {};
    const jobs = jobsSnap.docs
      .map((doc) => toJobSummary(doc.id, doc.data()))
      .sort((a, b) => (a.runJobIndex ?? 0) - (b.runJobIndex ?? 0));

    const summary = await rollupRunDocument(runDoc.id, runData, jobs);

    const eventSnaps = await Promise.all(
      jobsSnap.docs.map((doc) => doc.ref.collection('events').orderBy('timestamp', 'asc').limit(80).get())
    );

    const mergedEvents = eventSnaps.flatMap((snap, index) => {
      const job = jobs[index];
      return snap.docs.map((doc) => ({
        ...toEvent(doc.id, doc.data()),
        jobId: job.id,
        jobLabel: job.runLabel ?? job.description,
      }));
    }).sort((a, b) => {
      const at = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const bt = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return at - bt;
    });

    const issueSummaries = buildRunIssueSummaries(jobs, mergedEvents);

    const detail: GenerationRunDetail = {
      ...summary,
      summary: runData.summary,
      jobs,
      mergedEvents,
      issueSummaries,
    };

    return NextResponse.json(detail);
  } catch (err) {
    console.error('GET /api/runs/[id] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

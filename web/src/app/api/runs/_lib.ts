import { db } from '@/lib/firebase-admin';
import type { GenerationRunSummary, JobSummary } from '@/lib/types';

export function toJobSummary(id: string, data: FirebaseFirestore.DocumentData): JobSummary {
  return {
    id,
    status: data.status ?? 'pending',
    runId: data.runId,
    runKind: data.runKind,
    runJobIndex: data.runJobIndex,
    runTotalJobs: data.runTotalJobs,
    runLabel: data.runLabel,
    bundles: data.bundles ?? [],
    count: data.count ?? 0,
    requestedAt: data.requestedAt?.toDate?.()?.toISOString() ?? new Date(0).toISOString(),
    startedAt: data.startedAt?.toDate?.()?.toISOString(),
    completedAt: data.completedAt?.toDate?.()?.toISOString(),
    progress: data.progress,
    completedCount: data.completedCount,
    failedCount: data.failedCount,
    description: data.description,
    total: data.total,
    totalCount: data.totalCount,
    errors: (data.errors ?? []).slice(0, 5),
    auditSummary: data.auditSummary,
    currentBundle: data.currentBundle,
    currentPhase: data.currentPhase,
    currentMessage: data.currentMessage,
    lastHeartbeatAt: data.lastHeartbeatAt?.toDate?.()?.toISOString(),
    executionTarget: data.executionTarget,
    requestedBy: data.requestedBy,
    modelConfig: data.modelConfig,
    eventCount: data.eventCount,
  };
}

export function deriveRunStatus(jobs: JobSummary[], existingStatus?: string): string {
  if (jobs.length === 0) return existingStatus ?? 'queued';
  const statuses = jobs.map((job) => job.status);
  if (statuses.some((status) => status === 'running' || status === 'claimed')) return 'running';
  if (statuses.every((status) => status === 'pending')) return 'queued';
  if (statuses.every((status) => status === 'completed')) return 'completed';
  if (statuses.some((status) => status === 'failed') && statuses.every((status) => status === 'failed' || status === 'completed' || status === 'cancelled')) {
    return statuses.some((status) => status === 'completed') ? 'partial_failure' : 'failed';
  }
  if (statuses.every((status) => status === 'cancelled')) return 'cancelled';
  if (statuses.some((status) => status === 'pending')) return 'submitted';
  return existingStatus ?? 'submitted';
}

export async function rollupRunDocument(
  runId: string,
  runData: FirebaseFirestore.DocumentData,
  jobs: JobSummary[],
): Promise<GenerationRunSummary> {
  const status = deriveRunStatus(jobs, runData.status);
  const failedJobCount = jobs.filter((job) => job.status === 'failed').length;
  const payload = {
    status,
    totalJobs: runData.totalJobs ?? jobs.length,
    failedJobCount,
    jobIds: jobs.map((job) => job.id),
    lastRolledUpAt: new Date().toISOString(),
  };

  await db.collection('generation_runs').doc(runId).set(payload, { merge: true });

  return {
    id: runId,
    kind: runData.kind ?? 'blitz',
    status,
    requestedAt: runData.requestedAt,
    submittedAt: runData.submittedAt,
    requestedBy: runData.requestedBy,
    totalJobs: payload.totalJobs,
    failedJobCount,
    description: runData.description,
    executionTarget: runData.executionTarget,
    jobIds: payload.jobIds,
  };
}

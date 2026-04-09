import { isEmulatorMode, db } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { hasRequestedOllamaModel } from '@/lib/generation-models';
import type { GenerationJobRequest } from '@/lib/types';

const DEFAULT_N8N_WEBHOOK_PATH = 'scenario-generate';
const DEFAULT_N8N_RUNNER_WEBHOOK_PATH = 'scenario-run';

export function getN8NBaseUrl(): string | undefined {
  const baseUrl = process.env.N8N_BASE_URL?.trim();
  return baseUrl ? baseUrl.replace(/\/$/, '') : undefined;
}

export function getN8NScenarioWebhookUrl(): string | undefined {
  const baseUrl = getN8NBaseUrl();
  if (!baseUrl) return undefined;
  return `${baseUrl}/webhook/${DEFAULT_N8N_WEBHOOK_PATH}`;
}

export function getN8NRunnerWebhookUrl(): string | undefined {
  const baseUrl = getN8NBaseUrl();
  if (!baseUrl) return undefined;
  return `${baseUrl}/webhook/${DEFAULT_N8N_RUNNER_WEBHOOK_PATH}`;
}

export function getGenerationIntakeUrl(): string {
  const explicitUrl = process.env.GENERATION_INTAKE_URL;
  if (explicitUrl) {
    return explicitUrl;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID || 'the-administration-3a072';
  if (isEmulatorMode) {
    return `http://127.0.0.1:5001/${projectId}/us-central1/submitGenerationJob`;
  }

  return `https://us-central1-${projectId}.cloudfunctions.net/submitGenerationJob`;
}

export function getGenerationIntakeSecret(): string | undefined {
  return process.env.GENERATION_INTAKE_SECRET || process.env.ADMIN_SECRET;
}

export function getLocalGenerationDispatchUrl(): string {
  const explicitUrl = process.env.LOCAL_GENERATION_DISPATCH_URL?.trim();
  if (explicitUrl) return explicitUrl;
  return 'http://127.0.0.1:3099/processGenerationBundle';
}

export async function submitQueuedGenerationJob(payload: GenerationJobRequest): Promise<string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-request-origin': 'admin-web',
  };

  const intakeSecret = getGenerationIntakeSecret();
  if (intakeSecret) {
    headers['x-admin-secret'] = intakeSecret;
  }

  const response = await fetch(getGenerationIntakeUrl(), {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  const responseBody = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof responseBody?.error === 'string'
      ? responseBody.error
      : 'Failed to queue generation job';
    throw new Error(message);
  }

  if (!responseBody?.jobId || typeof responseBody.jobId !== 'string') {
    throw new Error('Generation intake response did not include a jobId');
  }

  return responseBody.jobId as string;
}

export async function submitGenerationJobViaN8n(payload: GenerationJobRequest): Promise<string> {
  const webhookUrl = getN8NScenarioWebhookUrl();
  if (!webhookUrl) {
    throw new Error('N8N scenario webhook is not configured');
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-request-origin': 'admin-web',
  };

  const intakeSecret = getGenerationIntakeSecret();
  if (intakeSecret) {
    headers['x-admin-secret'] = intakeSecret;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const rawBody = await response.text().catch(() => '');
    const responseBody = (() => {
      if (!rawBody.trim()) return {} as Record<string, unknown>;
      try {
        return JSON.parse(rawBody) as Record<string, unknown>;
      } catch {
        return {} as Record<string, unknown>;
      }
    })();

    if (!response.ok) {
      const message = typeof responseBody?.error === 'string'
        ? responseBody.error
        : 'Failed to submit generation job to n8n';
      throw new Error(message);
    }

    if (typeof responseBody?.jobId === 'string' && responseBody.jobId.length > 0) {
      return responseBody.jobId as string;
    }

    const requestIdHeader = response.headers.get('x-n8n-job-id');
    if (requestIdHeader) {
      return requestIdHeader;
    }

    if (!rawBody.trim()) {
      throw new Error('n8n intake returned an empty body; workflow accepted the request but did not return a jobId');
    }

    if (!responseBody?.jobId || typeof responseBody.jobId !== 'string') {
      throw new Error('n8n intake response did not include a jobId');
    }

    return responseBody.jobId as string;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function dispatchQueuedGenerationJobViaN8n(jobId: string, payload: GenerationJobRequest): Promise<void> {
  const webhookUrl = getN8NRunnerWebhookUrl();
  if (!webhookUrl) {
    throw new Error('N8N runner webhook is not configured');
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-request-origin': 'admin-web',
  };

  const intakeSecret = getGenerationIntakeSecret();
  if (intakeSecret) {
    headers['x-admin-secret'] = intakeSecret;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({ jobId, ...payload }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const rawBody = await response.text().catch(() => '');
      throw new Error(rawBody || 'Failed to dispatch queued generation job to n8n runner');
    }
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function dispatchQueuedGenerationJobLocally(jobId: string, payload: GenerationJobRequest): Promise<void> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-request-origin': 'admin-web',
  };

  const intakeSecret = getGenerationIntakeSecret();
  if (intakeSecret) {
    headers['x-admin-secret'] = intakeSecret;
  }

  const bundles = Array.isArray(payload.bundles) ? payload.bundles : [];
  const totalBundles = bundles.length;
  const requests = bundles.map((bundle) =>
    fetch(getLocalGenerationDispatchUrl(), {
      method: 'POST',
      headers,
      body: JSON.stringify({
        jobId,
        bundle,
        count: payload.count,
        mode: payload.mode,
        lowLatencyMode: payload.lowLatencyMode ?? false,
        modelConfig: payload.modelConfig ?? {},
        dryRun: payload.dryRun ?? false,
        newsContext: payload.newsContext ?? [],
        totalBundles,
        scopeTier: payload.scopeTier,
        scopeKey: payload.scopeKey,
        sourceKind: payload.sourceKind,
        regions: payload.regions,
        region: payload.region,
        applicable_countries: payload.applicable_countries,
        exclusivityReason: payload.exclusivityReason,
        clusterId: payload.clusterId,
      }),
    }).then(async (response) => {
      if (!response.ok) {
        const rawBody = await response.text().catch(() => '');
        throw new Error(rawBody || `Local generation dispatch failed for bundle ${bundle}`);
      }
    })
  );

  await Promise.all(requests);
}

export function resolveSubmissionMethod(executionTarget?: string): 'n8n' | 'cloud_function' {
  const n8nWebhookUrl = getN8NScenarioWebhookUrl();
  if (executionTarget === 'n8n') return n8nWebhookUrl ? 'n8n' : 'cloud_function';
  if (executionTarget === 'cloud_function') return 'cloud_function';
  return n8nWebhookUrl ? 'n8n' : 'cloud_function';
}

async function markJobFailed(jobId: string, error: string): Promise<void> {
  try {
    await db.collection('generation_jobs').doc(jobId).update({
      status: 'failed',
      error,
      currentPhase: 'failed',
      currentMessage: error,
      completedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  } catch (cleanupErr) {
    console.error(`Failed to mark job ${jobId} as failed after dispatch error:`, cleanupErr);
  }
}

export async function submitJob(payload: GenerationJobRequest, executionTarget?: string): Promise<string> {
  if (hasRequestedOllamaModel(payload.modelConfig)) {
    const jobId = await submitQueuedGenerationJob({
      ...payload,
      executionTarget: 'local',
    });

    try {
      await dispatchQueuedGenerationJobLocally(jobId, payload);
    } catch (dispatchErr) {
      await markJobFailed(jobId, `Local dispatch failed: ${dispatchErr instanceof Error ? dispatchErr.message : String(dispatchErr)}`);
      throw dispatchErr;
    }
    return jobId;
  }

  const method = resolveSubmissionMethod(executionTarget);
  if (method !== 'n8n') {
    return submitQueuedGenerationJob(payload);
  }

  const jobId = await submitQueuedGenerationJob({
    ...payload,
    executionTarget: 'n8n',
  });

  try {
    await dispatchQueuedGenerationJobViaN8n(jobId, payload);
  } catch (dispatchErr) {
    await markJobFailed(jobId, `n8n dispatch failed: ${dispatchErr instanceof Error ? dispatchErr.message : String(dispatchErr)}`);
    throw dispatchErr;
  }
  return jobId;
}

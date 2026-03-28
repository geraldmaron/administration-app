import { isEmulatorMode } from '@/lib/firebase-admin';
import type { GenerationJobRequest } from '@/lib/types';

const DEFAULT_N8N_WEBHOOK_PATH = 'scenario-generate';

export function getN8NBaseUrl(): string | undefined {
  const baseUrl = process.env.N8N_BASE_URL?.trim();
  return baseUrl ? baseUrl.replace(/\/$/, '') : undefined;
}

export function getN8NScenarioWebhookUrl(): string | undefined {
  const baseUrl = getN8NBaseUrl();
  if (!baseUrl) return undefined;
  return `${baseUrl}/webhook/${DEFAULT_N8N_WEBHOOK_PATH}`;
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

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  const responseBody = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof responseBody?.error === 'string'
      ? responseBody.error
      : 'Failed to submit generation job to n8n';
    throw new Error(message);
  }

  if (!responseBody?.jobId || typeof responseBody.jobId !== 'string') {
    throw new Error('n8n intake response did not include a jobId');
  }

  return responseBody.jobId as string;
}

export function resolveSubmissionMethod(executionTarget?: string): 'n8n' | 'cloud_function' {
  const n8nWebhookUrl = getN8NScenarioWebhookUrl();
  if (executionTarget === 'n8n') return n8nWebhookUrl ? 'n8n' : 'cloud_function';
  if (executionTarget === 'cloud_function') return 'cloud_function';
  return n8nWebhookUrl ? 'n8n' : 'cloud_function';
}

export async function submitJob(payload: GenerationJobRequest, executionTarget?: string): Promise<string> {
  const method = resolveSubmissionMethod(executionTarget);
  return method === 'n8n'
    ? submitGenerationJobViaN8n(payload)
    : submitQueuedGenerationJob(payload);
}

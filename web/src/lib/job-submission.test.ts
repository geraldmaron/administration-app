import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { GenerationJobRequest } from '@/lib/types';

const mockUpdate = vi.fn().mockResolvedValue(undefined);
const mockDoc = vi.fn().mockReturnValue({ update: mockUpdate });
const mockCollection = vi.fn().mockReturnValue({ doc: mockDoc });

vi.mock('@/lib/firebase-admin', () => ({
  isEmulatorMode: false,
  db: { collection: mockCollection },
}));

vi.mock('firebase-admin/firestore', () => ({
  FieldValue: {
    serverTimestamp: () => 'SERVER_TIMESTAMP',
  },
}));

const OLLAMA_MODEL_CONFIG = {
  architectModel: 'ollama:ai-reasoning',
  drafterModel: 'ollama:ai-coding',
  contentQualityModel: 'ollama:ai-general',
} as const;

const OPENAI_MODEL_CONFIG = {
  architectModel: 'gpt-4o-mini',
  drafterModel: 'gpt-4o-mini',
} as const;

function makePayload(overrides: Partial<GenerationJobRequest> = {}): GenerationJobRequest {
  return {
    bundles: ['environment'],
    count: 1,
    ...overrides,
  };
}

function mockFetchResponse(body: Record<string, unknown>, ok = true) {
  return Promise.resolve({
    ok,
    status: ok ? 200 : 500,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
    headers: new Headers(),
  } as Response);
}

describe('submitJob', () => {
  let submitJob: typeof import('./job-submission').submitJob;

  beforeEach(async () => {
    vi.stubEnv('N8N_BASE_URL', '');
    vi.stubEnv('GENERATION_INTAKE_URL', 'http://test-intake');
    vi.stubEnv('LOCAL_GENERATION_DISPATCH_URL', 'http://test-local');
    vi.stubGlobal('fetch', vi.fn());

    const mod = await import('./job-submission');
    submitJob = mod.submitJob;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it('routes Ollama payloads to local dispatch with executionTarget "local"', async () => {
    const fetchMock = vi.mocked(globalThis.fetch);

    fetchMock
      .mockImplementationOnce(() =>
        mockFetchResponse({ jobId: 'job_ollama_123' }),
      )
      .mockImplementationOnce(() =>
        mockFetchResponse({ ok: true }),
      );

    const payload = makePayload({ modelConfig: OLLAMA_MODEL_CONFIG });
    const jobId = await submitJob(payload);

    expect(jobId).toBe('job_ollama_123');
    expect(fetchMock).toHaveBeenCalledTimes(2);

    const [intakeUrl, intakeOpts] = fetchMock.mock.calls[0];
    expect(intakeUrl).toBe('http://test-intake');
    const intakeBody = JSON.parse((intakeOpts as RequestInit).body as string);
    expect(intakeBody.executionTarget).toBe('local');

    const [localUrl] = fetchMock.mock.calls[1];
    expect(localUrl).toBe('http://test-local');
  });

  it('routes Ollama payloads to local dispatch even when n8n is configured', async () => {
    vi.stubEnv('N8N_BASE_URL', 'http://n8n-host');
    const { submitJob: freshSubmitJob } = await import('./job-submission');
    const fetchMock = vi.mocked(globalThis.fetch);

    fetchMock
      .mockImplementationOnce(() =>
        mockFetchResponse({ jobId: 'job_ollama_n8n_456' }),
      )
      .mockImplementationOnce(() =>
        mockFetchResponse({ ok: true }),
      );

    const payload = makePayload({ modelConfig: OLLAMA_MODEL_CONFIG });
    const jobId = await freshSubmitJob(payload);

    expect(jobId).toBe('job_ollama_n8n_456');

    const [intakeUrl, intakeOpts] = fetchMock.mock.calls[0];
    expect(intakeUrl).toBe('http://test-intake');
    const intakeBody = JSON.parse((intakeOpts as RequestInit).body as string);
    expect(intakeBody.executionTarget).toBe('local');

    const [localUrl] = fetchMock.mock.calls[1];
    expect(localUrl).toBe('http://test-local');
  });

  it('routes non-Ollama payloads to cloud_function when n8n is not configured', async () => {
    const fetchMock = vi.mocked(globalThis.fetch);

    fetchMock.mockImplementationOnce(() =>
      mockFetchResponse({ jobId: 'job_cloud_789' }),
    );

    const payload = makePayload({ modelConfig: OPENAI_MODEL_CONFIG });
    const jobId = await submitJob(payload);

    expect(jobId).toBe('job_cloud_789');
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [intakeUrl] = fetchMock.mock.calls[0];
    expect(intakeUrl).toBe('http://test-intake');
  });

  it('routes non-Ollama payloads to n8n when configured', async () => {
    vi.stubEnv('N8N_BASE_URL', 'http://n8n-host');
    const { submitJob: freshSubmitJob } = await import('./job-submission');
    const fetchMock = vi.mocked(globalThis.fetch);

    fetchMock
      .mockImplementationOnce(() =>
        mockFetchResponse({ jobId: 'job_n8n_101' }),
      )
      .mockImplementationOnce(() =>
        mockFetchResponse({ ok: true }),
      );

    const payload = makePayload({ modelConfig: OPENAI_MODEL_CONFIG });
    const jobId = await freshSubmitJob(payload);

    expect(jobId).toBe('job_n8n_101');
    expect(fetchMock).toHaveBeenCalledTimes(2);

    const [intakeUrl, intakeOpts] = fetchMock.mock.calls[0];
    expect(intakeUrl).toBe('http://test-intake');
    const intakeBody = JSON.parse((intakeOpts as RequestInit).body as string);
    expect(intakeBody.executionTarget).toBe('n8n');

    const [n8nUrl] = fetchMock.mock.calls[1];
    expect(n8nUrl).toBe('http://n8n-host/webhook/scenario-run');
  });

  it('routes payloads with no modelConfig to cloud_function', async () => {
    const fetchMock = vi.mocked(globalThis.fetch);

    fetchMock.mockImplementationOnce(() =>
      mockFetchResponse({ jobId: 'job_default_202' }),
    );

    const payload = makePayload();
    const jobId = await submitJob(payload);

    expect(jobId).toBe('job_default_202');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('marks job as failed when n8n dispatch fails', async () => {
    vi.stubEnv('N8N_BASE_URL', 'http://n8n-host');
    const { submitJob: freshSubmitJob } = await import('./job-submission');
    const fetchMock = vi.mocked(globalThis.fetch);

    fetchMock
      .mockImplementationOnce(() =>
        mockFetchResponse({ jobId: 'job_n8n_fail_301' }),
      )
      .mockImplementationOnce(() =>
        mockFetchResponse({ error: 'n8n unreachable' }, false),
      );

    mockUpdate.mockClear();
    mockDoc.mockClear();
    mockCollection.mockClear();

    const payload = makePayload({ modelConfig: OPENAI_MODEL_CONFIG });
    await expect(freshSubmitJob(payload)).rejects.toThrow();

    expect(mockCollection).toHaveBeenCalledWith('generation_jobs');
    expect(mockDoc).toHaveBeenCalledWith('job_n8n_fail_301');
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'failed',
        currentPhase: 'failed',
      }),
    );
  });

  it('marks job as failed when local dispatch fails', async () => {
    const fetchMock = vi.mocked(globalThis.fetch);

    fetchMock
      .mockImplementationOnce(() =>
        mockFetchResponse({ jobId: 'job_local_fail_401' }),
      )
      .mockImplementationOnce(() =>
        mockFetchResponse({ error: 'local server down' }, false),
      );

    mockUpdate.mockClear();
    mockDoc.mockClear();
    mockCollection.mockClear();

    const payload = makePayload({ modelConfig: OLLAMA_MODEL_CONFIG });
    await expect(submitJob(payload)).rejects.toThrow();

    expect(mockCollection).toHaveBeenCalledWith('generation_jobs');
    expect(mockDoc).toHaveBeenCalledWith('job_local_fail_401');
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'failed',
        currentPhase: 'failed',
      }),
    );
  });

  it('still throws to caller even after marking job failed on dispatch error', async () => {
    vi.stubEnv('N8N_BASE_URL', 'http://n8n-host');
    const { submitJob: freshSubmitJob } = await import('./job-submission');
    const fetchMock = vi.mocked(globalThis.fetch);

    fetchMock
      .mockImplementationOnce(() =>
        mockFetchResponse({ jobId: 'job_rethrow_501' }),
      )
      .mockImplementationOnce(() =>
        Promise.reject(new Error('network timeout')),
      );

    mockUpdate.mockClear();

    await expect(freshSubmitJob(makePayload({ modelConfig: OPENAI_MODEL_CONFIG }))).rejects.toThrow('network timeout');
    expect(mockUpdate).toHaveBeenCalled();
  });
});

describe('resolveSubmissionMethod', () => {
  let resolveSubmissionMethod: typeof import('./job-submission').resolveSubmissionMethod;

  beforeEach(async () => {
    vi.stubEnv('N8N_BASE_URL', '');
    const mod = await import('./job-submission');
    resolveSubmissionMethod = mod.resolveSubmissionMethod;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('returns cloud_function when n8n is not configured', () => {
    expect(resolveSubmissionMethod()).toBe('cloud_function');
    expect(resolveSubmissionMethod('n8n')).toBe('cloud_function');
    expect(resolveSubmissionMethod('cloud_function')).toBe('cloud_function');
  });

  it('returns n8n when configured and requested', async () => {
    vi.stubEnv('N8N_BASE_URL', 'http://n8n-host');
    const { resolveSubmissionMethod: fresh } = await import('./job-submission');
    expect(fresh('n8n')).toBe('n8n');
    expect(fresh()).toBe('n8n');
  });

  it('returns cloud_function when explicitly requested even with n8n configured', async () => {
    vi.stubEnv('N8N_BASE_URL', 'http://n8n-host');
    const { resolveSubmissionMethod: fresh } = await import('./job-submission');
    expect(fresh('cloud_function')).toBe('cloud_function');
  });
});

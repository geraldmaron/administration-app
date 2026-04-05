jest.mock('firebase-functions/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

jest.mock('firebase-functions/v2/firestore', () => ({
  onDocumentCreated: jest.fn(),
}));

jest.mock('firebase-functions/v2/scheduler', () => ({
  onSchedule: jest.fn(),
}));

jest.mock('../scenario-engine', () => ({
  getGenerationConfig: jest.fn().mockResolvedValue({
    max_pending_jobs: 10,
    max_scenarios_per_job: 50,
  }),
  generateScenarios: jest.fn(),
}));

jest.mock('../storage', () => ({
  getActiveBundleCount: jest.fn(),
  saveScenario: jest.fn(),
}));

import { createGenerationJob } from '../background-jobs';

describe('job sizing guards', () => {
  test('rejects oversized ollama multi-bundle jobs at creation time', async () => {
    const docRef = { id: 'job-123', set: jest.fn().mockResolvedValue(undefined) };
    const whereResult = {
      count: jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue({
          data: () => ({ count: 0 }),
        }),
      }),
    };
    const db = {
      collection: jest.fn((name: string) => {
        if (name === 'generation_jobs') {
          return {
            where: jest.fn().mockReturnValue(whereResult),
            doc: jest.fn(() => docRef),
          };
        }
        throw new Error(`Unexpected collection ${name}`);
      }),
    } as any;

    await expect(createGenerationJob(db, {
      bundles: ['resources', 'tech', 'environment'],
      count: 10,
      mode: 'manual',
      modelConfig: { drafterModel: 'ollama:phi4:14b' },
      requestedBy: 'test',
    })).rejects.toThrow('supports at most 2 bundles per job');

    expect(docRef.set).not.toHaveBeenCalled();
  });
});

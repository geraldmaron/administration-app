import { buildJobProgressEvent } from '../generation-services';

describe('buildJobProgressEvent', () => {
    test('emits a job_started event for n8n running-starting updates', () => {
        expect(buildJobProgressEvent({
            jobId: 'job-1',
            status: 'running',
            currentPhase: 'starting',
            currentMessage: 'n8n runner: starting bundle fan-out',
            totalCount: 4,
        })).toEqual({
            level: 'info',
            code: 'job_started',
            message: 'n8n runner: starting bundle fan-out',
            phase: 'starting',
            data: { totalCount: 4 },
        });
    });

    test('emits a progress event for bundle-scoped running updates', () => {
        expect(buildJobProgressEvent({
            jobId: 'job-2',
            status: 'running',
            currentBundle: 'health',
            currentPhase: 'generate',
            currentMessage: 'Generating health',
            completedCount: 1,
            failedCount: 0,
        })).toEqual({
            level: 'info',
            code: 'job_progress',
            message: 'Generating health',
            bundle: 'health',
            phase: 'generate',
            data: { completedCount: 1, failedCount: 0 },
        });
    });

    test('emits a success event for completed jobs', () => {
        expect(buildJobProgressEvent({
            jobId: 'job-3',
            status: 'completed',
            completedCount: 3,
            failedCount: 1,
        })).toEqual({
            level: 'success',
            code: 'job_completed',
            message: 'Job completed: 3 saved, 1 failed',
            phase: 'completed',
            data: { completedCount: 3, failedCount: 1 },
        });
    });

    test('does not emit events for heartbeat-only updates', () => {
        expect(buildJobProgressEvent({ jobId: 'job-4' })).toBeUndefined();
    });
});

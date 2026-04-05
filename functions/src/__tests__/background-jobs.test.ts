import { shouldFinalizeHardCappedJob } from '../background-jobs';

describe('shouldFinalizeHardCappedJob', () => {
    const nowMs = Date.UTC(2026, 3, 3, 19, 0, 0);
    const minute = 60 * 1000;

    test('finalizes cloud-function jobs that exceed the hard cap', () => {
        expect(shouldFinalizeHardCappedJob({
            startedAtMs: nowMs - 21 * minute,
            updatedAtMs: nowMs - 21 * minute,
            lastHeartbeatAtMs: nowMs - 21 * minute,
            hardCapMinutes: 20,
            executionTarget: 'cloud_function',
            nowMs,
        })).toBe(true);
    });

    test('does not finalize actively heartbeating n8n jobs just because startedAt exceeds hard cap', () => {
        expect(shouldFinalizeHardCappedJob({
            startedAtMs: nowMs - 28 * minute,
            updatedAtMs: nowMs - 1 * minute,
            lastHeartbeatAtMs: nowMs - 30 * 1000,
            hardCapMinutes: 20,
            executionTarget: 'n8n',
            nowMs,
        })).toBe(false);
    });

    test('finalizes stale n8n jobs after the hard cap window', () => {
        expect(shouldFinalizeHardCappedJob({
            startedAtMs: nowMs - 28 * minute,
            updatedAtMs: nowMs - 24 * minute,
            lastHeartbeatAtMs: nowMs - 24 * minute,
            hardCapMinutes: 20,
            executionTarget: 'n8n',
            nowMs,
        })).toBe(true);
    });

    test('does not finalize jobs that have not exceeded the hard cap yet', () => {
        expect(shouldFinalizeHardCappedJob({
            startedAtMs: nowMs - 10 * minute,
            updatedAtMs: nowMs - 1 * minute,
            lastHeartbeatAtMs: nowMs - 1 * minute,
            hardCapMinutes: 20,
            executionTarget: 'n8n',
            nowMs,
        })).toBe(false);
    });
});

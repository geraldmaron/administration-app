import {
    applyDecision,
    applyMetricDeltasAsDecision,
    calculateApproval,
    createInitialBackendState,
    deriveSecondaryImpacts,
    type RandomSource,
} from '../lib/scoring-engine';

class SequenceRandom implements RandomSource {
    private index = 0;

    constructor(private readonly values: number[]) {}

    next(): number {
        const value = this.values[this.index] ?? this.values[this.values.length - 1] ?? 0.5;
        this.index += 1;
        return value;
    }
}

describe('scoring-engine', () => {
    test('deriveSecondaryImpacts propagates military shocks to economy and relations', () => {
        const random = new SequenceRandom(new Array(20).fill(0.5));
        const result = deriveSecondaryImpacts({ metric_military: 4 }, random);
        expect(result.metric_economy).toBeLessThan(0);
        expect(result.metric_foreign_relations).toBeLessThan(0);
    });

    test('calculateApproval penalizes corruption and foreign-relations collapse', () => {
        const state = createInitialBackendState({
            metric_economy: 60,
            metric_employment: 62,
            metric_health: 55,
            metric_public_order: 54,
            metric_crime: 40,
            metric_corruption: 80,
            metric_foreign_relations: 20,
        });
        const resolved = calculateApproval(state);
        expect(resolved.metrics.metric_approval).toBeLessThan(45);
    });

    test('applyDecision stages tails and advances turn', () => {
        const random = new SequenceRandom(new Array(80).fill(0.5));
        const state = createInitialBackendState({ metric_economy: 50 }, 7, 60);
        const resolved = applyDecision(state, {
            effects: [{ targetMetricId: 'metric_economy', value: 5.5, duration: 1, probability: 1 }],
        }, random);

        expect(resolved.turn).toBe(8);
        expect(resolved.activeEffects.some((effect) => effect.baseEffect.delay === 0)).toBe(true);
        expect(resolved.activeEffects.some((effect) => effect.baseEffect.delay === 1)).toBe(true);
        expect(resolved.activeEffects.some((effect) => effect.baseEffect.delay === 2)).toBe(true);
        expect(resolved.metrics.metric_economy).not.toBe(50);
    });

    test('applyMetricDeltasAsDecision returns resolved post-turn state for action resolution', () => {
        const random = new SequenceRandom(new Array(80).fill(0.5));
        const state = createInitialBackendState({
            metric_economy: 45,
            metric_public_order: 50,
            metric_approval: 50,
        }, 3, 30);
        const resolved = applyMetricDeltasAsDecision(state, [
            { metricId: 'metric_economy', delta: 4 },
            { metricId: 'metric_public_order', delta: -2 },
        ], random);

        expect(resolved.turn).toBe(4);
        expect(resolved.metrics.metric_economy).toBeGreaterThan(45);
        expect(resolved.metricHistory.metric_economy.length).toBeGreaterThan(1);
        expect(resolved.metrics.metric_approval).toBeGreaterThan(0);
    });
});

import {
    advanceTurn,
    applyDecision,
    applyMetricDeltasAsDecision,
    calculateApproval,
    createInitialBackendState,
    deriveSecondaryImpacts,
    INITIAL_METRIC_VALUE,
    type RandomSource,
} from '../lib/scoring-engine';
import { METRIC_IDS } from '../data/schemas/metricIds';

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

describe('scoring-engine simulations', () => {
    describe('neutral play (no decisions)', () => {
        test('approval stays in 30–70 range over 60 turns', () => {
            let state = createInitialBackendState({}, 1, 60);
            state = calculateApproval(state);

            for (let i = 0; i < 60; i++) {
                state = advanceTurn(state);
            }

            const approval = state.metrics[METRIC_IDS.APPROVAL] ?? INITIAL_METRIC_VALUE;
            expect(approval).toBeGreaterThanOrEqual(30);
            expect(approval).toBeLessThanOrEqual(70);
        });

        test('no core metric collapses below 15 under neutral play in 60 turns', () => {
            let state = createInitialBackendState({}, 1, 60);
            const coreMetrics = [
                METRIC_IDS.ECONOMY,
                METRIC_IDS.FOREIGN_RELATIONS,
                METRIC_IDS.PUBLIC_ORDER,
            ];

            for (let i = 0; i < 60; i++) {
                state = advanceTurn(state);
            }

            for (const id of coreMetrics) {
                const val = state.metrics[id] ?? INITIAL_METRIC_VALUE;
                expect(val).toBeGreaterThanOrEqual(15);
            }
        });
    });

    describe('pure-negative decisions', () => {
        test('approval reaches collapse territory (<20) within 60 turns', () => {
            let state = createInitialBackendState({}, 1, 60);

            const badOption = {
                effectsMap: {
                    [METRIC_IDS.ECONOMY]: -8,
                    [METRIC_IDS.PUBLIC_ORDER]: -6,
                    [METRIC_IDS.HEALTH]: -5,
                    [METRIC_IDS.FOREIGN_RELATIONS]: -6,
                },
            };

            let collapseReached = false;
            for (let i = 0; i < 60; i++) {
                state = applyDecision(state, badOption);
                const approval = state.metrics[METRIC_IDS.APPROVAL] ?? INITIAL_METRIC_VALUE;
                if (approval < 20) {
                    collapseReached = true;
                    break;
                }
            }

            expect(collapseReached).toBe(true);
        });

        test('collapse under sustained negative play occurs before turn 50', () => {
            let state = createInitialBackendState({}, 1, 60);

            const badOption = {
                effectsMap: {
                    [METRIC_IDS.ECONOMY]: -8,
                    [METRIC_IDS.PUBLIC_ORDER]: -6,
                    [METRIC_IDS.HEALTH]: -5,
                    [METRIC_IDS.FOREIGN_RELATIONS]: -6,
                },
            };

            let collapseTurn: number | null = null;
            for (let i = 0; i < 60; i++) {
                state = applyDecision(state, badOption);
                const approval = state.metrics[METRIC_IDS.APPROVAL] ?? INITIAL_METRIC_VALUE;
                if (approval < 20 && collapseTurn === null) {
                    collapseTurn = state.turn;
                    break;
                }
            }

            expect(collapseTurn).not.toBeNull();
            expect(collapseTurn!).toBeLessThan(50);
        });
    });

    describe('pure-positive decisions', () => {
        test('approval rises but does not exceed 88 after 60 turns', () => {
            let state = createInitialBackendState({}, 1, 60);

            const goodOption = {
                effectsMap: {
                    [METRIC_IDS.ECONOMY]: 5,
                    [METRIC_IDS.PUBLIC_ORDER]: 4,
                    [METRIC_IDS.HEALTH]: 4,
                    [METRIC_IDS.FOREIGN_RELATIONS]: 4,
                },
            };

            for (let i = 0; i < 60; i++) {
                state = applyDecision(state, goodOption);
            }

            const approval = state.metrics[METRIC_IDS.APPROVAL] ?? INITIAL_METRIC_VALUE;
            expect(approval).toBeGreaterThan(60);
            expect(approval).toBeLessThanOrEqual(88);
        });

        test('positive play approval exceeds neutral approval after 30 turns', () => {
            let neutralState = createInitialBackendState({}, 1, 60);
            let positiveState = createInitialBackendState({}, 1, 60);

            const goodOption = {
                effectsMap: {
                    [METRIC_IDS.ECONOMY]: 3,
                    [METRIC_IDS.PUBLIC_ORDER]: 2,
                    [METRIC_IDS.HEALTH]: 2,
                },
            };

            for (let i = 0; i < 30; i++) {
                neutralState = advanceTurn(neutralState);
                positiveState = applyDecision(positiveState, goodOption);
            }

            const neutralApproval = neutralState.metrics[METRIC_IDS.APPROVAL] ?? INITIAL_METRIC_VALUE;
            const positiveApproval = positiveState.metrics[METRIC_IDS.APPROVAL] ?? INITIAL_METRIC_VALUE;
            expect(positiveApproval).toBeGreaterThan(neutralApproval);
        });
    });

    describe('approval responds to individual metrics', () => {
        test('high corruption reduces approval vs baseline', () => {
            const base = calculateApproval(createInitialBackendState({}, 1, 60));
            const corrupt = calculateApproval(createInitialBackendState({ [METRIC_IDS.CORRUPTION]: 80 }, 1, 60));
            expect(corrupt.metrics[METRIC_IDS.APPROVAL]!).toBeLessThan(base.metrics[METRIC_IDS.APPROVAL]!);
        });

        test('low foreign relations reduces approval vs baseline', () => {
            const base = calculateApproval(createInitialBackendState({}, 1, 60));
            const isolated = calculateApproval(createInitialBackendState({ [METRIC_IDS.FOREIGN_RELATIONS]: 20 }, 1, 60));
            expect(isolated.metrics[METRIC_IDS.APPROVAL]!).toBeLessThan(base.metrics[METRIC_IDS.APPROVAL]!);
        });

        test('high economy raises approval vs baseline', () => {
            const base = calculateApproval(createInitialBackendState({}, 1, 60));
            const prosper = calculateApproval(createInitialBackendState({ [METRIC_IDS.ECONOMY]: 80 }, 1, 60));
            expect(prosper.metrics[METRIC_IDS.APPROVAL]!).toBeGreaterThan(base.metrics[METRIC_IDS.APPROVAL]!);
        });
    });
});

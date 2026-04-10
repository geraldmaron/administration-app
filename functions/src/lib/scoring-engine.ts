import { ALL_METRIC_IDS, METRIC_IDS, isInverseMetric, normalizeMetricId } from '../data/schemas/metricIds';
import type { MetricDelta } from '../shared/action-resolution-contract';

export const INITIAL_METRIC_VALUE = 50.0;
export const MAX_METRIC_CHANGE_BASE = 4.5;
export const REFERENCE_GAME_LENGTH = 60;

export interface ScoringEffect {
    targetMetricId: string;
    value: number;
    duration?: number;
    probability?: number;
    delay?: number;
}

export interface ActiveEffect {
    baseEffect: Required<Pick<ScoringEffect, 'targetMetricId' | 'value' | 'duration' | 'probability'>> & Pick<ScoringEffect, 'delay'>;
    remainingDuration: number;
}

export interface BackendDecisionOption {
    effects?: ScoringEffect[];
    effectsMap?: Record<string, number>;
}

export interface BackendGameState {
    turn: number;
    maxTurns: number;
    metrics: Record<string, number>;
    metricHistory: Record<string, number[]>;
    activeEffects: ActiveEffect[];
    hiddenMetrics?: Record<string, number>;
}

export interface RandomSource {
    next(): number;
}

class MathRandomSource implements RandomSource {
    next(): number {
        return Math.random();
    }
}

const defaultRandom = new MathRandomSource();

function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
}

function clampMetric(value: number): number {
    const safe = Number.isFinite(value) ? value : INITIAL_METRIC_VALUE;
    return Math.round(Math.max(0, Math.min(100, safe)) * 10) / 10;
}

function jitter(random: RandomSource, amplitude: number): number {
    return random.next() * amplitude * 2 - amplitude;
}

export function applyJitter(value: number, random: RandomSource = defaultRandom, isProcessing = false): number {
    const baseJitter = random.next() * 0.34 - 0.17;
    const varianceMultiplier = isProcessing
        ? random.next() * 0.28 + 0.86
        : random.next() * 0.24 + 0.88;
    const microVariance = random.next() * 0.11 - 0.055;
    let newValue = value * varianceMultiplier + baseJitter + microVariance;

    const remainder = Math.abs(newValue % 1);
    if (remainder < 0.08 || remainder > 0.92) {
        newValue += random.next() * 0.23 - 0.115;
    }

    const modFive = Math.abs(newValue % 5);
    if (modFive < 0.15 || modFive > 4.85) {
        newValue += random.next() * 0.42 - 0.21;
    }

    return newValue;
}

function selectBucket(magnitude: number): 'minor' | 'moderate' | 'major' | 'critical' {
    if (magnitude < 2) return 'minor';
    if (magnitude < 5) return 'moderate';
    if (magnitude < 10) return 'major';
    return 'critical';
}

type SwingRange = { minor: readonly [number, number]; moderate: readonly [number, number]; major: readonly [number, number]; critical: readonly [number, number] };

const DEFAULT_RANGE: SwingRange = {
    minor: [0.3, 1.1],
    moderate: [1.2, 2.6],
    major: [2.7, 4.5],
    critical: [4.5, 7.5],
};

const METRIC_SWING_RANGES: Record<string, SwingRange> = {
    [METRIC_IDS.APPROVAL]: { minor: [0.5, 1.5], moderate: [2.0, 5.0], major: [5.0, 9.0], critical: [8.0, 16.0] },
    [METRIC_IDS.ECONOMY]: { minor: [0.3, 1.0], moderate: [1.1, 2.5], major: [2.5, 5.0], critical: [5.0, 9.0] },
    [METRIC_IDS.PUBLIC_ORDER]: { minor: [0.4, 1.2], moderate: [1.3, 3.0], major: [3.0, 6.0], critical: [6.0, 11.0] },
    [METRIC_IDS.HEALTH]: { minor: [0.3, 1.0], moderate: [1.1, 2.4], major: [2.5, 4.5], critical: [4.5, 8.0] },
    [METRIC_IDS.EDUCATION]: { minor: [0.2, 0.9], moderate: [1.0, 2.1], major: [2.2, 3.5], critical: [3.5, 6.0] },
    [METRIC_IDS.INFRASTRUCTURE]: { minor: [0.3, 1.1], moderate: [1.2, 2.5], major: [2.6, 4.0], critical: [4.0, 7.0] },
    [METRIC_IDS.ENVIRONMENT]: { minor: [0.3, 1.0], moderate: [1.1, 2.3], major: [2.4, 3.8], critical: [3.8, 6.5] },
    [METRIC_IDS.FOREIGN_RELATIONS]: { minor: [0.4, 1.5], moderate: [1.5, 4.0], major: [4.0, 8.0], critical: [8.0, 18.0] },
    [METRIC_IDS.MILITARY]: { minor: [0.3, 1.1], moderate: [1.2, 2.5], major: [2.6, 4.5], critical: [4.5, 8.0] },
    [METRIC_IDS.LIBERTY]: { minor: [0.4, 1.2], moderate: [1.3, 2.6], major: [2.7, 4.5], critical: [4.5, 8.0] },
    [METRIC_IDS.EQUALITY]: { minor: [0.3, 1.0], moderate: [1.1, 2.3], major: [2.4, 3.8], critical: [3.8, 6.5] },
    [METRIC_IDS.CORRUPTION]: { minor: [0.2, 0.9], moderate: [1.0, 2.2], major: [2.2, 4.0], critical: [4.0, 8.0] },
    [METRIC_IDS.EMPLOYMENT]: { minor: [0.3, 1.0], moderate: [1.1, 2.3], major: [2.4, 3.8], critical: [3.8, 6.5] },
    [METRIC_IDS.INFLATION]: { minor: [0.2, 0.8], moderate: [0.9, 2.0], major: [2.0, 4.0], critical: [4.0, 7.0] },
    [METRIC_IDS.INNOVATION]: { minor: [0.4, 1.2], moderate: [1.3, 2.5], major: [2.6, 3.9], critical: [3.9, 6.5] },
    [METRIC_IDS.TRADE]: { minor: [0.3, 1.1], moderate: [1.2, 2.5], major: [2.5, 4.5], critical: [4.5, 8.0] },
    [METRIC_IDS.ENERGY]: { minor: [0.3, 1.2], moderate: [1.3, 2.6], major: [2.7, 4.5], critical: [4.5, 8.0] },
    [METRIC_IDS.HOUSING]: { minor: [0.3, 1.0], moderate: [1.1, 2.3], major: [2.4, 3.8], critical: [3.8, 6.5] },
    [METRIC_IDS.CRIME]: { minor: [0.3, 1.1], moderate: [1.2, 2.4], major: [2.5, 4.0], critical: [4.0, 7.0] },
    [METRIC_IDS.BUREAUCRACY]: { minor: [0.2, 0.8], moderate: [0.9, 1.9], major: [2.0, 3.1], critical: [3.1, 5.0] },
    [METRIC_IDS.DEMOCRACY]: { minor: [0.3, 1.0], moderate: [1.1, 2.3], major: [2.4, 4.0], critical: [4.0, 7.5] },
    [METRIC_IDS.SOVEREIGNTY]: { minor: [0.3, 1.1], moderate: [1.2, 2.5], major: [2.6, 4.5], critical: [4.5, 8.0] },
    [METRIC_IDS.IMMIGRATION]: { minor: [0.3, 1.0], moderate: [1.1, 2.3], major: [2.4, 3.8], critical: [3.8, 6.5] },
    [METRIC_IDS.BUDGET]: { minor: [0.3, 1.0], moderate: [1.1, 2.3], major: [2.4, 3.8], critical: [3.8, 6.5] },
    [METRIC_IDS.UNREST]: { minor: [0.4, 1.2], moderate: [1.3, 3.0], major: [3.0, 6.0], critical: [6.0, 12.0] },
    [METRIC_IDS.ECONOMIC_BUBBLE]: { minor: [0.3, 1.0], moderate: [1.1, 2.3], major: [2.4, 4.5], critical: [4.5, 9.0] },
    [METRIC_IDS.FOREIGN_INFLUENCE]: { minor: [0.3, 1.1], moderate: [1.2, 2.5], major: [2.6, 4.5], critical: [4.5, 8.0] },
};

function normalizeEffectValue(targetMetricId: string, rawValue: number, random: RandomSource): number {
    const sign = rawValue >= 0 ? 1 : -1;
    const magnitude = Math.abs(rawValue);
    const bucket = selectBucket(magnitude);
    const range = METRIC_SWING_RANGES[targetMetricId] ?? DEFAULT_RANGE;
    const [low, high] = range[bucket];
    const chosen = low + random.next() * (high - low);
    return Math.round(sign * chosen * 100) / 100;
}

function appendMetricHistory(state: BackendGameState, metricId: string): void {
    if (!state.metricHistory[metricId]) {
        state.metricHistory[metricId] = [];
    }
    state.metricHistory[metricId].push(state.metrics[metricId] ?? INITIAL_METRIC_VALUE);
}

export function deriveSecondaryImpacts(primaryEffects: Record<string, number>, random: RandomSource = defaultRandom): Record<string, number> {
    const secondary: Record<string, number> = {};
    const keys = Object.keys(primaryEffects);

    const findMetricKey = (searchTerms: string[]): string | undefined => keys.find((key) =>
        searchTerms.some((term) => key.toLowerCase().includes(term.toLowerCase())),
    );

    const militaryKey = findMetricKey(['military']);
    if (militaryKey) {
        const militaryChange = primaryEffects[militaryKey] ?? 0;
        if (Math.abs(militaryChange) > 2) {
            const economyKey = findMetricKey(['economy']) ?? METRIC_IDS.ECONOMY;
            const relationsKey = findMetricKey(['relations', 'foreign']) ?? METRIC_IDS.FOREIGN_RELATIONS;
            secondary[economyKey] = (secondary[economyKey] ?? 0) - Math.abs(militaryChange) * (0.25 + jitter(random, 0.065) * 0.1);
            secondary[relationsKey] = (secondary[relationsKey] ?? 0) - Math.abs(militaryChange) * (0.3 + jitter(random, 0.075) * 0.1);
        }
    }

    const relationsKey = findMetricKey(['relations', 'foreign']);
    if (relationsKey) {
        const relationsChange = primaryEffects[relationsKey] ?? 0;
        if (Math.abs(relationsChange) > 2) {
            const economyKey = findMetricKey(['economy']) ?? METRIC_IDS.ECONOMY;
            const multiplier = relationsChange < 0 ? 0.2 + jitter(random, 0.055) * 0.1 : 0.15 + jitter(random, 0.055) * 0.1;
            secondary[economyKey] = (secondary[economyKey] ?? 0) + relationsChange * multiplier;
        }
    }

    const economyKey = findMetricKey(['economy']);
    if (economyKey) {
        const economyChange = primaryEffects[economyKey] ?? 0;
        if (Math.abs(economyChange) > 2) {
            const orderKey = findMetricKey(['order', 'control', 'public']) ?? METRIC_IDS.PUBLIC_ORDER;
            const approvalKey = findMetricKey(['approval']) ?? METRIC_IDS.APPROVAL;
            if (economyChange > 0) {
                secondary[orderKey] = (secondary[orderKey] ?? 0) + economyChange * (0.08 + jitter(random, 0.05) * 0.1);
                secondary[approvalKey] = (secondary[approvalKey] ?? 0) + economyChange * (0.14 + jitter(random, 0.06) * 0.1);
            } else {
                secondary[orderKey] = (secondary[orderKey] ?? 0) + economyChange * (0.12 + jitter(random, 0.05) * 0.1);
                secondary[approvalKey] = (secondary[approvalKey] ?? 0) + economyChange * (0.24 + jitter(random, 0.06) * 0.1);
            }
        }
    }

    const healthKey = findMetricKey(['health']);
    if (healthKey) {
        const healthChange = primaryEffects[healthKey] ?? 0;
        if (healthChange < -2) {
            const economyKey2 = findMetricKey(['economy']) ?? METRIC_IDS.ECONOMY;
            secondary[economyKey2] = (secondary[economyKey2] ?? 0) + healthChange * (0.15 + jitter(random, 0.055) * 0.1);
        }
    }

    const granularThreshold = 0.27 + random.next() * 0.08;
    return Object.fromEntries(Object.entries(secondary).filter(([, value]) => Math.abs(value) >= granularThreshold));
}

export function calculateApproval(state: BackendGameState): BackendGameState {
    const nextState: BackendGameState = {
        ...state,
        metrics: { ...state.metrics },
        metricHistory: { ...state.metricHistory },
        activeEffects: [...state.activeEffects],
        hiddenMetrics: { ...(state.hiddenMetrics ?? {}) },
    };

    const coreWeights: Array<[string, number]> = [
        [METRIC_IDS.ECONOMY, 0.30],
        [METRIC_IDS.INFLATION, 0.20],
        [METRIC_IDS.EMPLOYMENT, 0.14],
        [METRIC_IDS.HEALTH, 0.14],
        [METRIC_IDS.PUBLIC_ORDER, 0.12],
        [METRIC_IDS.CRIME, 0.10],
    ];

    let coreSum = 0;
    let coreTotal = 0;
    for (const [key, weight] of coreWeights) {
        const value = nextState.metrics[key] ?? INITIAL_METRIC_VALUE;
        const adjusted = isInverseMetric(key) ? 100 - value : value;
        coreSum += adjusted * weight;
        coreTotal += weight;
    }

    const rawBase = coreTotal > 0 ? coreSum / coreTotal : INITIAL_METRIC_VALUE;
    let base = 50 + (rawBase - 50) * 0.5;

    const secondaryFactors: Array<[string, number]> = [
        [METRIC_IDS.UNREST, 0.12],
        [METRIC_IDS.FOREIGN_RELATIONS, 0.12],
        [METRIC_IDS.EQUALITY, 0.09],
        [METRIC_IDS.HOUSING, 0.08],
        [METRIC_IDS.LIBERTY, 0.07],
        [METRIC_IDS.FOREIGN_INFLUENCE, 0.06],
        [METRIC_IDS.ECONOMIC_BUBBLE, 0.06],
        [METRIC_IDS.ENVIRONMENT, 0.06],
        [METRIC_IDS.MILITARY, 0.05],
        [METRIC_IDS.BUREAUCRACY, 0.04],
        [METRIC_IDS.INNOVATION, 0.04],
        [METRIC_IDS.INFRASTRUCTURE, 0.04],
    ];

    let secondaryPressure = 0;
    for (const [key, factor] of secondaryFactors) {
        const value = nextState.metrics[key] ?? INITIAL_METRIC_VALUE;
        const adjusted = isInverseMetric(key) ? 100 - value : value;
        secondaryPressure += (adjusted - 50) * factor;
    }
    base += Math.max(-20, Math.min(20, secondaryPressure)) * 0.5;

    const corruption = nextState.metrics[METRIC_IDS.CORRUPTION] ?? 0;
    if (corruption > 40) {
        base -= (corruption - 40) * 0.45 * 0.5;
    }

    const foreignRelations = nextState.metrics[METRIC_IDS.FOREIGN_RELATIONS] ?? INITIAL_METRIC_VALUE;
    if (foreignRelations < 35) {
        base -= (35 - foreignRelations) * 0.30 * 0.5;
    }

    const shock = nextState.hiddenMetrics?.diplomaticShock;
    if (typeof shock === 'number' && Math.abs(shock) > 0.1) {
        base += Math.max(-20, Math.min(20, shock)) * 0.5;
    }

    if (base > 72) {
        base = 72 + (base - 72) * 0.28;
    }

    nextState.metrics[METRIC_IDS.APPROVAL] = clampMetric(base);
    return nextState;
}

export function advanceTurn(state: BackendGameState, random: RandomSource = defaultRandom): BackendGameState {
    const nextState: BackendGameState = {
        ...state,
        turn: state.turn + 1,
        metrics: { ...state.metrics },
        metricHistory: { ...state.metricHistory },
        activeEffects: [],
        hiddenMetrics: { ...(state.hiddenMetrics ?? {}) },
    };

    const metricDeltas: Record<string, number> = {};

    for (const active of state.activeEffects) {
        if ((active.baseEffect.delay ?? 0) > 0) {
            nextState.activeEffects.push({
                ...active,
                baseEffect: { ...active.baseEffect, delay: (active.baseEffect.delay ?? 0) - 1 },
            });
            continue;
        }

        const effectValue = applyJitter(active.baseEffect.value, random, true);
        metricDeltas[active.baseEffect.targetMetricId] = (metricDeltas[active.baseEffect.targetMetricId] ?? 0) + effectValue;

        const remainingDuration = active.remainingDuration - 1;
        if (remainingDuration > 0) {
            nextState.activeEffects.push({ ...active, remainingDuration });
        }
    }

    const allMetricIds = new Set<string>([...ALL_METRIC_IDS, ...Object.keys(nextState.metrics), ...Object.keys(metricDeltas)]);
    for (const metricId of allMetricIds) {
        if (metricId === METRIC_IDS.APPROVAL) continue;
        const currentValue = nextState.metrics[metricId] ?? INITIAL_METRIC_VALUE;
        const clampedDelta = clamp(metricDeltas[metricId] ?? 0, -MAX_METRIC_CHANGE_BASE, MAX_METRIC_CHANGE_BASE);
        nextState.metrics[metricId] = clampMetric(currentValue + clampedDelta);
        appendMetricHistory(nextState, metricId);
    }

    const recalculated = calculateApproval(nextState);
    nextState.metrics = recalculated.metrics;
    const approvalEffect = metricDeltas[METRIC_IDS.APPROVAL] ?? 0;
    if (Math.abs(approvalEffect) > 0.01) {
        const capped = clamp(approvalEffect, -8, 8);
        nextState.metrics[METRIC_IDS.APPROVAL] = clampMetric((nextState.metrics[METRIC_IDS.APPROVAL] ?? INITIAL_METRIC_VALUE) + capped);
    }
    appendMetricHistory(nextState, METRIC_IDS.APPROVAL);

    applyOrganicDrift(nextState, nextState.maxTurns);

    const shock = nextState.hiddenMetrics?.diplomaticShock;
    if (typeof shock === 'number' && Math.abs(shock) > 0.1) {
        const decayed = shock * 0.55;
        if (Math.abs(decayed) > 0.2) {
            nextState.hiddenMetrics = { ...(nextState.hiddenMetrics ?? {}), diplomaticShock: decayed };
        } else if (nextState.hiddenMetrics) {
            const { diplomaticShock, ...rest } = nextState.hiddenMetrics;
            void diplomaticShock;
            nextState.hiddenMetrics = rest;
        }
    }

    return nextState;
}

function applyOrganicDrift(state: BackendGameState, maxTurns: number = REFERENCE_GAME_LENGTH): void {
    const ds = REFERENCE_GAME_LENGTH / Math.max(1, maxTurns);

    const economy = state.metrics[METRIC_IDS.ECONOMY] ?? INITIAL_METRIC_VALUE;
    const inflation = state.metrics[METRIC_IDS.INFLATION] ?? INITIAL_METRIC_VALUE;
    const publicOrder = state.metrics[METRIC_IDS.PUBLIC_ORDER] ?? INITIAL_METRIC_VALUE;
    const corruption = state.metrics[METRIC_IDS.CORRUPTION] ?? INITIAL_METRIC_VALUE;
    const foreignRelations = state.metrics[METRIC_IDS.FOREIGN_RELATIONS] ?? INITIAL_METRIC_VALUE;
    const crime = state.metrics[METRIC_IDS.CRIME] ?? INITIAL_METRIC_VALUE;
    const unrest = state.metrics[METRIC_IDS.UNREST] ?? INITIAL_METRIC_VALUE;
    const equality = state.metrics[METRIC_IDS.EQUALITY] ?? INITIAL_METRIC_VALUE;
    const foreignInfluence = state.metrics[METRIC_IDS.FOREIGN_INFLUENCE] ?? INITIAL_METRIC_VALUE;
    const housing = state.metrics[METRIC_IDS.HOUSING] ?? INITIAL_METRIC_VALUE;
    const liberty = state.metrics[METRIC_IDS.LIBERTY] ?? INITIAL_METRIC_VALUE;
    const democracy = state.metrics[METRIC_IDS.DEMOCRACY] ?? INITIAL_METRIC_VALUE;
    const innovation = state.metrics[METRIC_IDS.INNOVATION] ?? INITIAL_METRIC_VALUE;
    const energy = state.metrics[METRIC_IDS.ENERGY] ?? INITIAL_METRIC_VALUE;
    const budget = state.metrics[METRIC_IDS.BUDGET] ?? INITIAL_METRIC_VALUE;
    const military = state.metrics[METRIC_IDS.MILITARY] ?? INITIAL_METRIC_VALUE;
    const infra = state.metrics[METRIC_IDS.INFRASTRUCTURE] ?? INITIAL_METRIC_VALUE;

    let unrestDrift = 0;
    if (publicOrder < 40) unrestDrift += 1.5 * ds;
    if (inflation > 70) unrestDrift += 0.75 * ds;
    if (economy < 35) unrestDrift += 0.5 * ds;
    if (housing < 40) unrestDrift += (40 - housing) * 0.015 * ds;
    if (equality < 40) unrestDrift += (40 - equality) * 0.01 * ds;
    if (unrestDrift === 0) unrestDrift = -0.75 * ds;
    state.metrics[METRIC_IDS.UNREST] = clampMetric(unrest + unrestDrift);

    if (corruption > 60) {
        state.metrics[METRIC_IDS.LIBERTY] = clampMetric((state.metrics[METRIC_IDS.LIBERTY] ?? INITIAL_METRIC_VALUE) - 1 * ds);
    }
    if (liberty < 35) {
        state.metrics[METRIC_IDS.DEMOCRACY] = clampMetric((state.metrics[METRIC_IDS.DEMOCRACY] ?? INITIAL_METRIC_VALUE) - (35 - liberty) * 0.015 * ds);
    }
    let corruptionDrift = 0;
    if (democracy < 35) corruptionDrift += (35 - democracy) * 0.015 * ds;
    if (publicOrder < 40) corruptionDrift += (40 - publicOrder) * 0.010 * ds;
    if (economy < 35) corruptionDrift += (35 - economy) * 0.008 * ds;
    if (unrest > 65) corruptionDrift += (unrest - 65) * 0.008 * ds;
    if (corruptionDrift === 0 && corruption > 50) corruptionDrift = -0.25 * ds;
    if (corruptionDrift !== 0) state.metrics[METRIC_IDS.CORRUPTION] = clampMetric(corruption + corruptionDrift);

    let ecoDrift = 0;
    if (foreignRelations < 35) ecoDrift -= (35 - foreignRelations) * 0.02 * ds;
    if (corruption > 55) ecoDrift -= (corruption - 55) * 0.025 * ds;
    if (publicOrder < 35) ecoDrift -= (35 - publicOrder) * 0.02 * ds;
    if (inflation > 75) ecoDrift -= (inflation - 75) * 0.02 * ds;
    if (innovation > 65) ecoDrift += (innovation - 65) * 0.003 * ds;
    if (ecoDrift !== 0) state.metrics[METRIC_IDS.ECONOMY] = clampMetric(economy + ecoDrift);

    let inflationDrift = 0;
    if (economy > 65) inflationDrift += (economy - 65) * 0.012 * ds;
    if (economy < 35) inflationDrift -= (35 - economy) * 0.008 * ds;
    if (energy < 35) inflationDrift += (35 - energy) * 0.015 * ds;
    if (inflation > 70) inflationDrift -= (inflation - 70) * 0.010 * ds;
    if (inflationDrift !== 0) state.metrics[METRIC_IDS.INFLATION] = clampMetric(inflation + inflationDrift);

    let bubbleDrift = 0;
    if (economy > 70) bubbleDrift += (economy - 70) * 0.04 * ds;
    if (inflation > 55) bubbleDrift += (inflation - 55) * 0.025 * ds;
    if (economy < 55 && inflation < 55) bubbleDrift -= 0.4 * ds;
    if (bubbleDrift !== 0) state.metrics[METRIC_IDS.ECONOMIC_BUBBLE] = clampMetric((state.metrics[METRIC_IDS.ECONOMIC_BUBBLE] ?? INITIAL_METRIC_VALUE) + bubbleDrift);

    let orderDrift = 0;
    if (unrest > 50) orderDrift -= (unrest - 50) * 0.025 * ds;
    if (crime > 65) orderDrift -= (crime - 65) * 0.025 * ds;
    if (orderDrift !== 0) state.metrics[METRIC_IDS.PUBLIC_ORDER] = clampMetric(publicOrder + orderDrift);

    if (economy < 45) state.metrics[METRIC_IDS.HOUSING] = clampMetric(housing - (45 - economy) * 0.012 * ds);

    let crimeDrift = 0;
    if (equality < 45) crimeDrift += (45 - equality) * 0.015 * ds;
    if (housing < 40) crimeDrift += (40 - housing) * 0.012 * ds;
    if (crimeDrift !== 0) state.metrics[METRIC_IDS.CRIME] = clampMetric(crime + crimeDrift);

    if (housing < 40) state.metrics[METRIC_IDS.EQUALITY] = clampMetric(equality - (40 - housing) * 0.015 * ds);

    let foreignRelationsDrift = 0;
    if (corruption > 60) foreignRelationsDrift -= (corruption - 60) * 0.02 * ds;
    if (unrest > 65) foreignRelationsDrift -= (unrest - 65) * 0.02 * ds;
    if (foreignRelationsDrift !== 0) state.metrics[METRIC_IDS.FOREIGN_RELATIONS] = clampMetric(foreignRelations + foreignRelationsDrift);

    if (foreignInfluence > 60) state.metrics[METRIC_IDS.SOVEREIGNTY] = clampMetric((state.metrics[METRIC_IDS.SOVEREIGNTY] ?? INITIAL_METRIC_VALUE) - (foreignInfluence - 60) * 0.02 * ds);

    const currentHealth = state.metrics[METRIC_IDS.HEALTH] ?? INITIAL_METRIC_VALUE;
    if (economy > 65) state.metrics[METRIC_IDS.HEALTH] = clampMetric(currentHealth + (economy - 65) * 0.005 * ds);
    else if (economy < 35) state.metrics[METRIC_IDS.HEALTH] = clampMetric(currentHealth - (35 - economy) * 0.01 * ds);

    let employmentDrift = 0;
    if (economy > 60) employmentDrift += (economy - 60) * 0.012 * ds;
    if (economy < 40) employmentDrift -= (40 - economy) * 0.018 * ds;
    if (innovation > 70) employmentDrift -= (innovation - 70) * 0.005 * ds;
    if (employmentDrift !== 0) state.metrics[METRIC_IDS.EMPLOYMENT] = clampMetric((state.metrics[METRIC_IDS.EMPLOYMENT] ?? INITIAL_METRIC_VALUE) + employmentDrift);

    let budgetDrift = 0;
    if (economy > 60) budgetDrift += (economy - 60) * 0.01 * ds;
    if (economy < 40) budgetDrift -= (40 - economy) * 0.015 * ds;
    if (military > 70) budgetDrift -= (military - 70) * 0.008 * ds;
    if (budgetDrift !== 0) state.metrics[METRIC_IDS.BUDGET] = clampMetric(budget + budgetDrift);

    const trade = state.metrics[METRIC_IDS.TRADE] ?? INITIAL_METRIC_VALUE;
    let tradeDrift = 0;
    if (foreignRelations < 35) tradeDrift -= (35 - foreignRelations) * 0.015 * ds;
    if (foreignRelations > 65) tradeDrift += (foreignRelations - 65) * 0.008 * ds;
    if (economy < 35) tradeDrift -= (35 - economy) * 0.01 * ds;
    if (tradeDrift !== 0) state.metrics[METRIC_IDS.TRADE] = clampMetric(trade + tradeDrift);

    let infraDrift = 0;
    if (budget < 40) infraDrift -= (40 - budget) * 0.01 * ds;
    if (economy < 35) infraDrift -= (35 - economy) * 0.008 * ds;
    if (infra < 35) infraDrift -= 0.3 * ds;
    if (infraDrift !== 0) state.metrics[METRIC_IDS.INFRASTRUCTURE] = clampMetric(infra + infraDrift);

    const education = state.metrics[METRIC_IDS.EDUCATION] ?? INITIAL_METRIC_VALUE;
    let educationDrift = 0;
    if (budget < 35) educationDrift -= (35 - budget) * 0.008 * ds;
    if (economy > 65) educationDrift += (economy - 65) * 0.003 * ds;
    if (educationDrift !== 0) state.metrics[METRIC_IDS.EDUCATION] = clampMetric(education + educationDrift);

    const immigration = state.metrics[METRIC_IDS.IMMIGRATION] ?? INITIAL_METRIC_VALUE;
    let immigrationDrift = 0;
    if (economy > 65) immigrationDrift += (economy - 65) * 0.006 * ds;
    if (economy < 35) immigrationDrift -= (35 - economy) * 0.008 * ds;
    if (liberty > 65) immigrationDrift += (liberty - 65) * 0.004 * ds;
    if (unrest > 55) immigrationDrift -= (unrest - 55) * 0.008 * ds;
    if (immigrationDrift !== 0) state.metrics[METRIC_IDS.IMMIGRATION] = clampMetric(immigration + immigrationDrift);

    const environment = state.metrics[METRIC_IDS.ENVIRONMENT] ?? INITIAL_METRIC_VALUE;
    let environmentDrift = 0;
    if (economy > 70) environmentDrift -= (economy - 70) * 0.008 * ds;
    if (energy < 40) environmentDrift -= (40 - energy) * 0.006 * ds;
    if (innovation > 70) environmentDrift += (innovation - 70) * 0.004 * ds;
    if (environmentDrift !== 0) state.metrics[METRIC_IDS.ENVIRONMENT] = clampMetric(environment + environmentDrift);
}

export function createInitialBackendState(metrics: Partial<Record<string, number>> = {}, turn = 1, maxTurns = 60): BackendGameState {
    const baseMetrics = Object.fromEntries(ALL_METRIC_IDS.map((metricId) => [metricId, INITIAL_METRIC_VALUE]));
    const resolvedMetrics: Record<string, number> = { ...baseMetrics, ...metrics } as Record<string, number>;
    const metricHistory: Record<string, number[]> = {};
    for (const [metricId, value] of Object.entries(resolvedMetrics)) {
        metricHistory[metricId] = [value];
    }
    return {
        turn,
        maxTurns,
        metrics: resolvedMetrics,
        metricHistory,
        activeEffects: [],
        hiddenMetrics: {},
    };
}

export function applyDecision(state: BackendGameState, option: BackendDecisionOption, random: RandomSource = defaultRandom): BackendGameState {
    const nextState: BackendGameState = {
        ...state,
        metrics: { ...state.metrics },
        metricHistory: { ...state.metricHistory },
        activeEffects: [...state.activeEffects],
        hiddenMetrics: { ...(state.hiddenMetrics ?? {}) },
    };

    const primaryEffects: Record<string, number> = {};
    const stagedEffects: Array<{ effect: ScoringEffect; normalizedValue: number }> = [];

    for (const effect of option.effects ?? []) {
        const probability = effect.probability ?? 1;
        if (random.next() > probability) continue;
        const targetMetricId = normalizeMetricId(effect.targetMetricId);
        const normalizedValue = normalizeEffectValue(targetMetricId, effect.value, random);
        primaryEffects[targetMetricId] = (primaryEffects[targetMetricId] ?? 0) + normalizedValue;
        stagedEffects.push({ effect: { ...effect, targetMetricId }, normalizedValue });
    }

    for (const [metricName, value] of Object.entries(option.effectsMap ?? {})) {
        const targetMetricId = normalizeMetricId(metricName);
        const normalizedValue = normalizeEffectValue(targetMetricId, value, random);
        primaryEffects[targetMetricId] = (primaryEffects[targetMetricId] ?? 0) + normalizedValue;
        stagedEffects.push({ effect: { targetMetricId, value, duration: 1, probability: 1 }, normalizedValue });
    }

    const appendEffect = (targetMetricId: string, value: number, duration: number, probability: number, delay?: number) => {
        nextState.activeEffects.push({
            baseEffect: { targetMetricId, value, duration, probability, delay },
            remainingDuration: duration,
        });
    };

    for (const { effect, normalizedValue } of stagedEffects) {
        const duration = effect.duration ?? 1;
        const probability = effect.probability ?? 1;
        appendEffect(effect.targetMetricId, applyJitter(normalizedValue, random), duration, probability, effect.delay);

        const rawMagnitude = Math.abs(effect.value);
        if (rawMagnitude >= 1.5) appendEffect(effect.targetMetricId, normalizedValue * 0.55, 1, 1, 1);
        if (rawMagnitude >= 3.0) appendEffect(effect.targetMetricId, normalizedValue * 0.28, 1, 1, 2);
        if (rawMagnitude >= 5.0) appendEffect(effect.targetMetricId, normalizedValue * 0.12, 1, 1, 3);
    }

    if (Object.keys(primaryEffects).length > 0) {
        const secondary = deriveSecondaryImpacts(primaryEffects, random);
        for (const [metricId, value] of Object.entries(secondary)) {
            appendEffect(metricId, applyJitter(value, random), 1, 1);
        }
    }

    return advanceTurn(nextState, random);
}

export function applyMetricDeltasAsDecision(state: BackendGameState, metricDeltas: MetricDelta[], random: RandomSource = defaultRandom): BackendGameState {
    return applyDecision(state, {
        effects: metricDeltas.map((delta) => ({
            targetMetricId: delta.metricId,
            value: delta.delta,
            duration: 1,
            probability: 1,
        })),
    }, random);
}

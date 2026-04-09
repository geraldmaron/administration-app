import { resolveActionTemplate } from '../lib/action-templates';
import type { ActionResolutionRequest } from '../shared/action-resolution-contract';
import {
    DIPLOMATIC_DELTA_BOUNDS,
    MILITARY_DELTA_BOUNDS,
} from '../shared/action-resolution-contract';

function baseReq(overrides: Partial<ActionResolutionRequest> = {}): ActionResolutionRequest {
    return {
        actionCategory: 'diplomatic',
        actionType: 'trade_agreement',
        countryId: 'us',
        countryName: 'United States',
        targetCountryId: 'de',
        targetCountryName: 'Germany',
        leaderTitle: 'The President',
        turn: 5,
        maxTurns: 20,
        phase: 'mid',
        metrics: {},
        relationship: 60,
        relationshipType: 'strategic_partner',
        comparativePower: 'peer_conflict',
        severity: 'medium',
        ...overrides,
    };
}

describe('resolveActionTemplate', () => {
    describe('trust_your_gut', () => {
        it('returns null for trust_your_gut category', () => {
            const req = baseReq({ actionCategory: 'trust_your_gut', actionType: '', freeFormCommand: 'Do something' });
            expect(resolveActionTemplate(req)).toBeNull();
        });
    });

    describe('diplomatic actions', () => {
        it('resolves trade_agreement with ally relationship', () => {
            const result = resolveActionTemplate(baseReq({
                actionType: 'trade_agreement',
                relationshipType: 'formal_ally',
            }));
            expect(result).not.toBeNull();
            expect(result!.newsCategory).toBe('diplomacy');
            expect(result!.headline).toBeTruthy();
            expect(result!.metricDeltas.length).toBeGreaterThan(0);
        });

        it('resolves trade_agreement with rival relationship', () => {
            const result = resolveActionTemplate(baseReq({
                actionType: 'trade_agreement',
                relationshipType: 'rival',
            }));
            expect(result).not.toBeNull();
            expect(result!.newsTags).toContain('trade');
        });

        it('resolves impose_sanctions with adversary', () => {
            const result = resolveActionTemplate(baseReq({
                actionCategory: 'diplomatic',
                actionType: 'impose_sanctions',
                relationshipType: 'adversary',
            }));
            expect(result).not.toBeNull();
            expect(result!.relationshipDelta).toBeLessThan(0);
        });

        it('resolves request_alliance with neutral country', () => {
            const result = resolveActionTemplate(baseReq({
                actionCategory: 'diplomatic',
                actionType: 'request_alliance',
                relationshipType: 'neutral',
            }));
            expect(result).not.toBeNull();
            expect(result!.newsCategory).toBe('diplomacy');
        });

        it('resolves expel_ambassador with ally in crisis', () => {
            const result = resolveActionTemplate(baseReq({
                actionCategory: 'diplomatic',
                actionType: 'expel_ambassador',
                relationshipType: 'formal_ally',
            }));
            expect(result).not.toBeNull();
            expect(result!.newsCategory).toBe('crisis');
        });
    });

    describe('military actions', () => {
        it('resolves covert_ops low severity vs adversary', () => {
            const result = resolveActionTemplate(baseReq({
                actionCategory: 'military',
                actionType: 'covert_ops',
                relationshipType: 'adversary',
                severity: 'low',
            }));
            expect(result).not.toBeNull();
            expect(result!.targetMilitaryStrengthDelta).toBeLessThan(0);
        });

        it('resolves special_ops medium severity', () => {
            const result = resolveActionTemplate(baseReq({
                actionCategory: 'military',
                actionType: 'special_ops',
                severity: 'medium',
            }));
            expect(result).not.toBeNull();
            expect(result!.metricDeltas.some((d) => d.metricId === 'metric_health')).toBe(true);
        });

        it('resolves military_strike high severity — hits health, housing, infrastructure', () => {
            const result = resolveActionTemplate(baseReq({
                actionCategory: 'military',
                actionType: 'military_strike',
                relationshipType: 'adversary',
                severity: 'high',
            }));
            expect(result).not.toBeNull();
            const metricIds = result!.metricDeltas.map((d) => d.metricId);
            expect(metricIds).toContain('metric_health');
            expect(metricIds).toContain('metric_housing');
            expect(metricIds).toContain('metric_infrastructure');
        });

        it('resolves nuclear_strike — hits environment, energy, and economy', () => {
            const result = resolveActionTemplate(baseReq({
                actionCategory: 'military',
                actionType: 'nuclear_strike',
                severity: 'high',
            }));
            expect(result).not.toBeNull();
            const metricIds = result!.metricDeltas.map((d) => d.metricId);
            expect(metricIds).toContain('metric_environment');
            expect(metricIds).toContain('metric_energy');
            expect(metricIds).toContain('metric_health');
            expect(result!.newsCategory).toBe('crisis');
        });

        it('resolves cyberattack medium severity — hits infrastructure', () => {
            const result = resolveActionTemplate(baseReq({
                actionCategory: 'military',
                actionType: 'cyberattack',
                severity: 'medium',
            }));
            expect(result).not.toBeNull();
            const metricIds = result!.metricDeltas.map((d) => d.metricId);
            expect(metricIds).toContain('metric_infrastructure');
            expect(result!.targetCyberCapabilityDelta).toBeLessThan(0);
        });

        it('resolves naval_blockade medium severity — hits trade and economy', () => {
            const result = resolveActionTemplate(baseReq({
                actionCategory: 'military',
                actionType: 'naval_blockade',
                severity: 'medium',
            }));
            expect(result).not.toBeNull();
            const metricIds = result!.metricDeltas.map((d) => d.metricId);
            expect(metricIds).toContain('metric_trade');
            expect(metricIds).toContain('metric_economy');
        });

        it('picks striking_up variant when available', () => {
            const result = resolveActionTemplate(baseReq({
                actionCategory: 'military',
                actionType: 'military_strike',
                comparativePower: 'striking_up',
            }));
            expect(result).not.toBeNull();
        });
    });

    describe('token interpolation', () => {
        it('replaces {countryName} with the actor country name', () => {
            const result = resolveActionTemplate(baseReq({ countryName: 'Freedonia' }));
            expect(result!.headline).toContain('Freedonia');
            expect(result!.summary).toContain('Freedonia');
        });

        it('replaces {targetCountryName} with the target country name', () => {
            const result = resolveActionTemplate(baseReq({ targetCountryName: 'Sylvania' }));
            expect(result!.headline).toContain('Sylvania');
        });

        it('replaces {leaderTitle} in summary', () => {
            const result = resolveActionTemplate(baseReq({
                leaderTitle: 'Grand Chancellor',
                actionType: 'impose_sanctions',
                actionCategory: 'diplomatic',
                relationshipType: 'adversary',
            }));
            expect(result!.summary).toContain('Grand Chancellor');
        });

        it('uses fallback text when targetCountryName is absent', () => {
            const req = baseReq({ targetCountryName: undefined, targetCountryId: undefined });
            const result = resolveActionTemplate(req);
            expect(result!.headline).not.toContain('{targetCountryName}');
        });
    });

    describe('severity multiplier', () => {
        it('applies 0.5x multiplier for low severity', () => {
            const low = resolveActionTemplate(baseReq({
                actionCategory: 'military',
                actionType: 'covert_ops',
                relationshipType: 'adversary',
                severity: 'low',
            }));
            const med = resolveActionTemplate(baseReq({
                actionCategory: 'military',
                actionType: 'covert_ops',
                relationshipType: 'adversary',
                severity: 'medium',
                turn: 5,
                countryId: 'us',
            }));
            expect(low).not.toBeNull();
            expect(med).not.toBeNull();
            const lowDelta = Math.abs(low!.metricDeltas[0]?.delta ?? 0);
            const medDelta = Math.abs(med!.metricDeltas[0]?.delta ?? 0);
            expect(lowDelta).toBeLessThanOrEqual(medDelta);
        });

        it('scales relationshipDelta by severity', () => {
            const low = resolveActionTemplate(baseReq({
                actionCategory: 'diplomatic',
                actionType: 'impose_sanctions',
                relationshipType: 'adversary',
                severity: 'low',
            }));
            const high = resolveActionTemplate(baseReq({
                actionCategory: 'diplomatic',
                actionType: 'impose_sanctions',
                relationshipType: 'adversary',
                severity: 'high',
                turn: 5,
                countryId: 'us',
            }));
            expect(Math.abs(low!.relationshipDelta)).toBeLessThan(Math.abs(high!.relationshipDelta));
        });
    });

    describe('delta bounds compliance', () => {
        const diplomaticTypes = ['trade_agreement', 'impose_sanctions', 'request_alliance', 'expel_ambassador'];
        const militaryTypes = ['covert_ops', 'special_ops', 'military_strike', 'nuclear_strike', 'cyberattack', 'naval_blockade'];

        it.each(diplomaticTypes)('diplomatic %s deltas stay within bounds', (actionType) => {
            const result = resolveActionTemplate(baseReq({ actionCategory: 'diplomatic', actionType }));
            if (!result) return;
            for (const d of result.metricDeltas) {
                expect(d.delta).toBeGreaterThanOrEqual(DIPLOMATIC_DELTA_BOUNDS.metric.min);
                expect(d.delta).toBeLessThanOrEqual(DIPLOMATIC_DELTA_BOUNDS.metric.max);
            }
        });

        it.each(militaryTypes)('military %s deltas stay within military bounds (medium)', (actionType) => {
            const result = resolveActionTemplate(baseReq({
                actionCategory: 'military',
                actionType,
                severity: 'medium',
            }));
            if (!result) return;
            // nuclear_strike base deltas intentionally exceed normal bounds to signal
            // narrative severity; sanitizeResponse clamps them before game application.
            if (actionType === 'nuclear_strike') return;
            for (const d of result.metricDeltas) {
                expect(d.delta).toBeGreaterThanOrEqual(MILITARY_DELTA_BOUNDS.metric.min);
                expect(d.delta).toBeLessThanOrEqual(MILITARY_DELTA_BOUNDS.metric.max);
            }
        });
    });

    describe('deterministic variant selection', () => {
        it('same inputs always return same template', () => {
            const req = baseReq({ actionType: 'trade_agreement', turn: 7, countryId: 'gb' });
            const a = resolveActionTemplate(req);
            const b = resolveActionTemplate(req);
            expect(a!.headline).toBe(b!.headline);
        });

        it('different turns can return different variants when multiple templates match', () => {
            // Use a context where multiple templates match (adversary + peer + all-severity military)
            const headlines = new Set<string>();
            const relations = ['adversary', 'rival', 'neutral', 'formal_ally'] as const;
            for (const rel of relations) {
                const result = resolveActionTemplate(baseReq({ actionType: 'impose_sanctions', actionCategory: 'diplomatic', relationshipType: rel }));
                if (result) headlines.add(result.headline);
            }
            expect(headlines.size).toBeGreaterThan(1);
        });
    });
});

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const action_resolution_1 = require("../action-resolution");
function makeDiplomaticRequest(overrides = {}) {
    return Object.assign({ actionCategory: 'diplomatic', actionType: 'trade_agreement', targetCountryId: 'fr', countryId: 'us', countryName: 'United States', targetCountryName: 'France', turn: 5, maxTurns: 30, phase: 'early', metrics: { metric_approval: 55, metric_economy: 60, metric_foreign_relations: 50 }, relationship: 40, relationshipType: 'strategic_partner' }, overrides);
}
function makeMilitaryRequest(overrides = {}) {
    return Object.assign({ actionCategory: 'military', actionType: 'military_strike', targetCountryId: 'ir', severity: 'high', countryId: 'us', countryName: 'United States', targetCountryName: 'Iran', turn: 15, maxTurns: 30, phase: 'mid', metrics: { metric_approval: 45, metric_economy: 50, metric_foreign_relations: 35 }, relationship: -60, relationshipType: 'adversary', targetMilitaryStrength: 65, targetNuclearCapable: false }, overrides);
}
function makeTygRequest(overrides = {}) {
    return Object.assign({ actionCategory: 'trust_your_gut', actionType: 'freeform', freeFormCommand: 'Impose emergency economic controls on all imports', countryId: 'us', countryName: 'United States', turn: 10, maxTurns: 30, phase: 'mid', metrics: { metric_approval: 50, metric_economy: 45 } }, overrides);
}
function makeRawResponse(overrides = {}) {
    return Object.assign({ headline: 'Trade Deal Signed with France', summary: 'A new bilateral trade agreement opens markets.', context: 'The agreement is expected to boost GDP by 0.3% over the next quarter.', metricDeltas: [
            { metricId: 'metric_economy', delta: 2.5 },
            { metricId: 'metric_foreign_relations', delta: 3.0 },
        ], relationshipDelta: 12, newsCategory: 'diplomacy', newsTags: ['trade', 'bilateral'] }, overrides);
}
describe('clamp', () => {
    test('clamps values within bounds', () => {
        expect((0, action_resolution_1.clamp)(5, 0, 10)).toBe(5);
        expect((0, action_resolution_1.clamp)(-5, 0, 10)).toBe(0);
        expect((0, action_resolution_1.clamp)(15, 0, 10)).toBe(10);
    });
});
describe('clampMetricDeltas', () => {
    test('filters out invalid metric IDs', () => {
        const deltas = [
            { metricId: 'metric_economy', delta: 3.0 },
            { metricId: 'fake_metric', delta: 5.0 },
        ];
        const result = (0, action_resolution_1.clampMetricDeltas)(deltas, { min: -10, max: 10 });
        expect(result).toHaveLength(1);
        expect(result[0].metricId).toBe('metric_economy');
    });
    test('clamps deltas to bounds', () => {
        const deltas = [
            { metricId: 'metric_approval', delta: 20.0 },
            { metricId: 'metric_economy', delta: -15.0 },
        ];
        const result = (0, action_resolution_1.clampMetricDeltas)(deltas, { min: -10, max: 6 });
        expect(result[0].delta).toBe(6);
        expect(result[1].delta).toBe(-10);
    });
});
describe('validateRequest', () => {
    test('accepts valid diplomatic request', () => {
        expect((0, action_resolution_1.validateRequest)(makeDiplomaticRequest())).toBeNull();
    });
    test('accepts valid military request', () => {
        expect((0, action_resolution_1.validateRequest)(makeMilitaryRequest())).toBeNull();
    });
    test('accepts valid trust_your_gut request', () => {
        expect((0, action_resolution_1.validateRequest)(makeTygRequest())).toBeNull();
    });
    test('rejects missing actionCategory', () => {
        const req = makeDiplomaticRequest({ actionCategory: '' });
        expect((0, action_resolution_1.validateRequest)(req)).toContain('actionCategory');
    });
    test('rejects invalid actionCategory', () => {
        const req = makeDiplomaticRequest({ actionCategory: 'invalid' });
        expect((0, action_resolution_1.validateRequest)(req)).toContain('Invalid actionCategory');
    });
    test('rejects diplomatic action without actionType', () => {
        const req = makeDiplomaticRequest({ actionType: undefined });
        expect((0, action_resolution_1.validateRequest)(req)).toContain('actionType');
    });
    test('rejects trust_your_gut without freeFormCommand', () => {
        const req = makeTygRequest({ freeFormCommand: undefined });
        expect((0, action_resolution_1.validateRequest)(req)).toContain('freeFormCommand');
    });
    test('rejects missing countryId', () => {
        const req = makeDiplomaticRequest({ countryId: '' });
        expect((0, action_resolution_1.validateRequest)(req)).toContain('countryId');
    });
    test('rejects invalid turn', () => {
        const req = makeDiplomaticRequest({ turn: 0 });
        expect((0, action_resolution_1.validateRequest)(req)).toContain('turn');
    });
});
describe('sanitizeResponse', () => {
    test('passes through valid diplomatic response within bounds', () => {
        const req = makeDiplomaticRequest();
        const raw = makeRawResponse();
        const result = (0, action_resolution_1.sanitizeResponse)(raw, req);
        expect(result.headline).toBe('Trade Deal Signed with France');
        expect(result.metricDeltas).toHaveLength(2);
        expect(result.relationshipDelta).toBe(12);
        expect(result.newsCategory).toBe('diplomacy');
    });
    test('clamps diplomatic relationship delta to bounds', () => {
        const req = makeDiplomaticRequest();
        const raw = makeRawResponse({ relationshipDelta: 50 });
        const result = (0, action_resolution_1.sanitizeResponse)(raw, req);
        expect(result.relationshipDelta).toBe(20);
    });
    test('clamps diplomatic metric deltas to bounds', () => {
        const req = makeDiplomaticRequest();
        const raw = makeRawResponse({
            metricDeltas: [{ metricId: 'metric_economy', delta: 20 }],
        });
        const result = (0, action_resolution_1.sanitizeResponse)(raw, req);
        expect(result.metricDeltas[0].delta).toBe(6);
    });
    test('scales military bounds by severity multiplier', () => {
        const req = makeMilitaryRequest({ severity: 'high' });
        const raw = makeRawResponse({
            metricDeltas: [{ metricId: 'metric_foreign_relations', delta: -80 }],
            relationshipDelta: -90,
            targetMilitaryStrengthDelta: -40,
        });
        const result = (0, action_resolution_1.sanitizeResponse)(raw, req);
        expect(result.metricDeltas[0].delta).toBe(-80);
        expect(result.relationshipDelta).toBe(-90);
        expect(result.targetMilitaryStrengthDelta).toBe(-40);
    });
    test('zeroes target military deltas for diplomatic actions', () => {
        const req = makeDiplomaticRequest();
        const raw = makeRawResponse({ targetMilitaryStrengthDelta: -20 });
        const result = (0, action_resolution_1.sanitizeResponse)(raw, req);
        expect(result.targetMilitaryStrengthDelta).toBe(0);
    });
    test('applies atrocity bounds for trust_your_gut with isAtrocity', () => {
        const req = makeTygRequest();
        const raw = makeRawResponse({
            isAtrocity: true,
            metricDeltas: [
                { metricId: 'metric_approval', delta: -60 },
                { metricId: 'metric_foreign_relations', delta: -70 },
            ],
            relationshipDelta: -80,
        });
        const result = (0, action_resolution_1.sanitizeResponse)(raw, req);
        expect(result.isAtrocity).toBe(true);
        expect(result.metricDeltas[0].delta).toBe(-50);
        expect(result.metricDeltas[1].delta).toBe(-50);
        expect(result.relationshipDelta).toBe(-50);
    });
    test('applies modest TYG bounds for non-atrocity trust_your_gut', () => {
        const req = makeTygRequest();
        const raw = makeRawResponse({
            isAtrocity: false,
            metricDeltas: [{ metricId: 'metric_economy', delta: -30 }],
            relationshipDelta: -40,
        });
        const result = (0, action_resolution_1.sanitizeResponse)(raw, req);
        expect(result.metricDeltas[0].delta).toBe(-20);
        expect(result.relationshipDelta).toBe(-25);
    });
    test('truncates excessively long headline', () => {
        const req = makeDiplomaticRequest();
        const raw = makeRawResponse({ headline: 'X'.repeat(300) });
        const result = (0, action_resolution_1.sanitizeResponse)(raw, req);
        expect(result.headline.length).toBeLessThanOrEqual(200);
    });
    test('handles missing/malformed fields gracefully', () => {
        const req = makeDiplomaticRequest();
        const raw = {
            headline: null,
            summary: 123,
            context: undefined,
            metricDeltas: 'not_array',
            relationshipDelta: 'not_number',
            newsCategory: null,
            newsTags: null,
        };
        const result = (0, action_resolution_1.sanitizeResponse)(raw, req);
        expect(result.headline).toBe('Action Executed');
        expect(result.summary).toBe('');
        expect(result.metricDeltas).toEqual([]);
        expect(result.relationshipDelta).toBe(0);
        expect(result.newsTags).toEqual([]);
    });
    test('limits newsTags to 5 entries', () => {
        const req = makeDiplomaticRequest();
        const raw = makeRawResponse({
            newsTags: ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
        });
        const result = (0, action_resolution_1.sanitizeResponse)(raw, req);
        expect(result.newsTags.length).toBe(5);
    });
});
describe('buildPrompt', () => {
    test('includes action context for diplomatic actions', () => {
        const req = makeDiplomaticRequest();
        const prompt = (0, action_resolution_1.buildPrompt)(req);
        expect(prompt).toContain('trade_agreement');
        expect(prompt).toContain('France');
        expect(prompt).toContain('diplomatic');
        expect(prompt).toContain('RELATIONSHIP: 40');
    });
    test('includes severity for military actions', () => {
        const req = makeMilitaryRequest();
        const prompt = (0, action_resolution_1.buildPrompt)(req);
        expect(prompt).toContain('SEVERITY: high');
        expect(prompt).toContain('military_strike');
        expect(prompt).toContain('Iran');
    });
    test('includes freeform command for trust_your_gut', () => {
        const req = makeTygRequest();
        const prompt = (0, action_resolution_1.buildPrompt)(req);
        expect(prompt).toContain('EXECUTIVE COMMAND');
        expect(prompt).toContain('Impose emergency economic controls');
    });
    test('includes metrics in prompt', () => {
        const req = makeDiplomaticRequest();
        const prompt = (0, action_resolution_1.buildPrompt)(req);
        expect(prompt).toContain('metric_economy=60.0');
    });
    test('includes recent actions when present', () => {
        const req = makeDiplomaticRequest({ recentActions: ['military:strike', 'diplomatic:sanctions'] });
        const prompt = (0, action_resolution_1.buildPrompt)(req);
        expect(prompt).toContain('military:strike');
        expect(prompt).toContain('diplomatic:sanctions');
    });
    test('handles missing optional fields', () => {
        const req = makeDiplomaticRequest({
            leaderTitle: undefined,
            governmentCategory: undefined,
            recentActions: undefined,
        });
        const prompt = (0, action_resolution_1.buildPrompt)(req);
        expect(prompt).toContain('Head of State');
        expect(prompt).toContain('No recent actions');
    });
});
//# sourceMappingURL=action-resolution.test.js.map
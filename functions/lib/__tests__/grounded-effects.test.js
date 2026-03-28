"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const grounded_effects_1 = require("../lib/grounded-effects");
describe('grounded effects enforcement', () => {
    test('classifies missing and sign mismatches as blocking audit issues', () => {
        const missingIssue = (0, grounded_effects_1.groundingIssueToAuditIssue)({
            type: 'missing',
            reference: {
                mapping: 'gdp',
                value: 3,
                originalText: 'GDP drops 3%',
                expectedEffects: [{ metricId: 'metric_economy', value: -2.4 }],
            },
            message: 'Narrative mentions "GDP drops 3%" but no effect on metric_economy',
        }, 'scenario_1/option_a');
        const signIssue = (0, grounded_effects_1.groundingIssueToAuditIssue)({
            type: 'sign',
            reference: {
                mapping: 'inflation',
                value: 6,
                originalText: 'inflation rises to 6%',
                expectedEffects: [{ metricId: 'metric_inflation', value: 4.2 }],
            },
            actualEffect: { targetMetricId: 'metric_inflation', value: -2, duration: 2, probability: 1 },
            message: 'Sign mismatch for metric_inflation',
        }, 'scenario_1/option_a');
        expect(missingIssue).toMatchObject({ severity: 'error', rule: 'grounded-effects-critical' });
        expect(signIssue).toMatchObject({ severity: 'error', rule: 'grounded-effects-critical' });
    });
    test('keeps magnitude mismatches as warnings', () => {
        const magnitudeIssue = (0, grounded_effects_1.groundingIssueToAuditIssue)({
            type: 'magnitude',
            reference: {
                mapping: 'gdp',
                value: 4,
                originalText: 'GDP drops 4%',
                expectedEffects: [{ metricId: 'metric_economy', value: -3.2 }],
            },
            actualEffect: { targetMetricId: 'metric_economy', value: -1.1, duration: 2, probability: 1 },
            message: 'Magnitude mismatch for metric_economy',
        }, 'scenario_1/option_a');
        expect(magnitudeIssue).toMatchObject({ severity: 'warn', rule: 'grounded-effects-mismatch' });
    });
    test('suggestEffectCorrections repairs missing grounded effects', () => {
        const narrative = 'Officials warn that 3% of GDP could be lost if the crisis deepens.';
        const effects = [];
        const before = (0, grounded_effects_1.validateGroundedEffects)(narrative, effects);
        expect(before.some((issue) => issue.type === 'missing')).toBe(true);
        const corrected = (0, grounded_effects_1.suggestEffectCorrections)(narrative, effects);
        const after = (0, grounded_effects_1.validateGroundedEffects)(narrative, corrected);
        expect(corrected.some((effect) => effect.targetMetricId === 'metric_economy')).toBe(true);
        expect(after.some((issue) => issue.type === 'missing')).toBe(false);
    });
});
//# sourceMappingURL=grounded-effects.test.js.map
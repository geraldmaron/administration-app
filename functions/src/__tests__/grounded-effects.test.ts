import { groundingIssueToAuditIssue, suggestEffectCorrections, validateGroundedEffects } from '../lib/grounded-effects';
import type { Effect } from '../lib/audit-rules';

describe('grounded effects enforcement', () => {
    test('classifies missing and sign mismatches as blocking audit issues', () => {
        const missingIssue = groundingIssueToAuditIssue({
            type: 'missing',
            reference: {
                mapping: 'gdp',
                value: 3,
                originalText: 'GDP drops 3%',
                expectedEffects: [{ metricId: 'metric_economy', value: -2.4 }],
            },
            message: 'Narrative mentions "GDP drops 3%" but no effect on metric_economy',
        }, 'scenario_1/option_a');

        const signIssue = groundingIssueToAuditIssue({
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
        const magnitudeIssue = groundingIssueToAuditIssue({
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
        const effects: Effect[] = [];

        const before = validateGroundedEffects(narrative, effects);
        expect(before.some((issue) => issue.type === 'missing')).toBe(true);

        const corrected = suggestEffectCorrections(narrative, effects);
        const after = validateGroundedEffects(narrative, corrected);

        expect(corrected.some((effect) => effect.targetMetricId === 'metric_economy')).toBe(true);
        expect(after.some((issue) => issue.type === 'missing')).toBe(false);
    });
});
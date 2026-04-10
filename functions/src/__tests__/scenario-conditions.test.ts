import {
    buildBestEffortMetricGates as buildBestEffortScenarioConditions,
    inferMetricGates as inferScenarioConditions,
    mergeMetricGates as mergeScenarioConditions,
} from '../lib/scenario-conditions';

describe('scenario condition helpers', () => {
    test('preserves inflation gating instead of replacing it with bailout heuristics', () => {
        const conditions = buildBestEffortScenarioConditions({
            architectConditions: [{ metricId: 'metric_inflation', min: 50 }],
            title: 'Central Bank Warns of Currency Devaluation',
            description: 'Inflation pressures are rising while subsidy policies strain the budget.',
            tags: ['austerity', 'debt', 'trade'],
        });

        expect(conditions).toEqual(
            expect.arrayContaining([{ metricId: 'metric_inflation', min: 58 }])
        );
        expect(conditions).not.toEqual(
            expect.arrayContaining([{ metricId: 'metric_economy', max: 50 }])
        );
    });

    test('can infer multi-layer conditions from narrative and tags', () => {
        const conditions = buildBestEffortScenarioConditions({
            title: 'Subsidy Cuts Trigger Inflation Spiral',
            description: 'A cost-of-living crisis is driving civil unrest as inflation surges and debt restructuring talks intensify.',
            tags: ['inflation_crisis', 'unrest'],
        });

        expect(conditions).toEqual(
            expect.arrayContaining([
                { metricId: 'metric_inflation', min: 58 },
                { metricId: 'metric_public_order', max: 45 },
                { metricId: 'metric_budget', max: 40 },
            ])
        );
    });

    test('merges stricter bounds for the same metric', () => {
        const conditions = mergeScenarioConditions(
            [{ metricId: 'metric_inflation', min: 50 }],
            [{ metricId: 'metric_inflation', min: 60 }],
            [{ metricId: 'metric_budget', max: 45 }],
            [{ metricId: 'metric_budget', max: 40 }],
        );

        expect(conditions).toEqual(
            expect.arrayContaining([
                { metricId: 'metric_inflation', min: 60 },
                { metricId: 'metric_budget', max: 40 },
            ])
        );
    });

    test('does not infer conditions for generic governance prose', () => {
        expect(inferScenarioConditions({
            title: 'Auditors Review Procurement Rules',
            description: 'A ministerial dispute over oversight powers is delaying a routine administrative reform.',
            tags: ['reform'],
        })).toEqual([]);
    });

    test('infers military max condition from budget-cut narrative', () => {
        const conditions = inferScenarioConditions({
            title: 'Generals Demand Emergency Funding',
            description: 'The armed forces have been operating at reduced military readiness for months due to defense budget cuts, leaving critical defense infrastructure vulnerable.',
        });

        expect(conditions).toEqual(
            expect.arrayContaining([{ metricId: 'metric_military', max: 45 }])
        );
    });

    test('infers military max condition from military_underfunded tag', () => {
        const conditions = inferScenarioConditions({
            tags: ['military_underfunded'],
        });

        expect(conditions).toEqual(
            expect.arrayContaining([{ metricId: 'metric_military', max: 48 }])
        );
    });

    test('infers foreign relations max condition from diplomatic breakdown narrative', () => {
        const conditions = inferScenarioConditions({
            title: 'Ambassador Expelled After Diplomatic Standoff',
            description: 'A diplomatic crisis erupted after the foreign minister severed diplomatic ties with a neighboring state.',
        });

        expect(conditions).toEqual(
            expect.arrayContaining([{ metricId: 'metric_foreign_relations', max: 40 }])
        );
    });

    test('infers health max condition from health crisis narrative', () => {
        const conditions = inferScenarioConditions({
            title: 'Hospitals Report Critical Overcrowding',
            description: 'A healthcare crisis has overwhelmed regional hospitals as a disease outbreak stretches the health system to collapse.',
        });

        expect(conditions).toEqual(
            expect.arrayContaining([{ metricId: 'metric_health', max: 42 }])
        );
    });
});

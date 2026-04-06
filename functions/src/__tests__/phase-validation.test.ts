import { validateSkeleton, validateEffects } from '../lib/phase-validation';
import { ALL_TOKENS } from '../lib/token-registry';
import { ALL_METRIC_IDS } from '../data/schemas/metricIds';

const validTokens = new Set<string>(ALL_TOKENS);
const tokenValidator = (t: string) => validTokens.has(t);

const validMetricIds = new Set<string>(ALL_METRIC_IDS);
const inverseMetrics = new Set(['metric_corruption', 'metric_inflation', 'metric_crime', 'metric_bureaucracy']);

describe('validateSkeleton', () => {
    const baseSkeleton = () => ({
        title: 'Parliament Blocks Emergency Bill',
        description: 'Your {finance_role} has proposed a controversial austerity package that would slash public spending by 15 percent to stabilize the budget.',
        options: [
            { id: 'opt_a', text: 'Your {finance_role} implements the full austerity package, cutting spending across all departments to restore fiscal discipline.', label: 'Full Austerity' },
            { id: 'opt_b', text: 'You direct {the_finance_role} to negotiate a compromise with {the_legislature}, accepting smaller cuts in exchange for broader support.', label: 'Compromise' },
            { id: 'opt_c', text: 'You reject the austerity proposal entirely, maintaining current spending levels and seeking alternative revenue sources through {commerce_role}.', label: 'Reject Cuts' },
        ],
    });

    it('passes a clean skeleton', () => {
        const result = validateSkeleton(baseSkeleton(), tokenValidator);
        expect(result.pass).toBe(true);
        expect(result.issues).toHaveLength(0);
    });

    it('fails when title is missing', () => {
        const skel = baseSkeleton();
        skel.title = '';
        const result = validateSkeleton(skel, tokenValidator);
        expect(result.pass).toBe(false);
        expect(result.issues).toContain('missing title');
    });

    it('fails when description is too short', () => {
        const skel = baseSkeleton();
        skel.description = 'Too short.';
        const result = validateSkeleton(skel, tokenValidator);
        expect(result.pass).toBe(false);
        expect(result.issues).toEqual(expect.arrayContaining([expect.stringContaining('too-short description')]));
    });

    it('fails when fewer than 3 options', () => {
        const skel = baseSkeleton();
        skel.options = skel.options.slice(0, 2);
        const result = validateSkeleton(skel, tokenValidator);
        expect(result.pass).toBe(false);
        expect(result.issues).toEqual(expect.arrayContaining([expect.stringContaining('only 2 options')]));
    });

    it('normalizes token aliases in title and description', () => {
        const skel = baseSkeleton();
        skel.title = 'Finance Ministry Blocks Plan';
        skel.description = 'Your {finance_minister} has proposed a controversial austerity package that would slash public spending by 15 percent to stabilize the budget.';
        const result = validateSkeleton(skel, tokenValidator);
        expect(result.fixes.some(f => f.includes('normalized'))).toBe(true);
    });

    it('sanitizes invented tokens to plain text', () => {
        const skel = baseSkeleton();
        skel.description = 'Your {trade_commissioner} has proposed a controversial austerity package that would slash public spending by 15 percent to stabilize the budget.';
        const result = validateSkeleton(skel, tokenValidator);
        expect(skel.description).not.toContain('{trade_commissioner}');
    });

    it('sanitizes multiple invented tokens to plain text and passes', () => {
        const skel = baseSkeleton();
        skel.description = 'The {fake_one} and {fake_two} met with {fake_three} about {fake_four} while {fake_five} watched.';
        skel.options[0].text = 'The {fake_six} announced reforms that affect the whole country.';
        const result = validateSkeleton(skel, tokenValidator);
        expect(skel.description).not.toContain('{fake_one}');
        expect(skel.options[0].text).not.toContain('{fake_six}');
        expect(result.fixes.some(f => f.includes('sanitized'))).toBe(true);
    });
});

describe('validateEffects', () => {
    const baseEffects = () => ({
        options: [
            {
                id: 'opt_a',
                effects: [
                    { targetMetricId: 'metric_economy', value: 2.0, duration: 3, probability: 1 },
                    { targetMetricId: 'metric_approval', value: -1.5, duration: 2, probability: 1 },
                ],
            },
            {
                id: 'opt_b',
                effects: [
                    { targetMetricId: 'metric_trade', value: 1.0, duration: 2, probability: 1 },
                ],
            },
            {
                id: 'opt_c',
                effects: [
                    { targetMetricId: 'metric_budget', value: -2.0, duration: 3, probability: 1 },
                    { targetMetricId: 'metric_employment', value: 1.5, duration: 2, probability: 1 },
                ],
            },
        ],
    });

    it('passes valid effects', () => {
        const result = validateEffects(baseEffects(), validMetricIds, inverseMetrics);
        expect(result.pass).toBe(true);
        expect(result.issues).toHaveLength(0);
    });

    it('fails with fewer than 3 option effect sets', () => {
        const eff = baseEffects();
        eff.options = eff.options.slice(0, 2);
        const result = validateEffects(eff, validMetricIds, inverseMetrics);
        expect(result.pass).toBe(false);
        expect(result.issues).toEqual(expect.arrayContaining([expect.stringContaining('only 2')]));
    });

    it('normalizes known metric aliases', () => {
        const eff = baseEffects();
        eff.options[0].effects[0].targetMetricId = 'metric_gdp';
        const result = validateEffects(eff, validMetricIds, inverseMetrics);
        expect(eff.options[0].effects[0].targetMetricId).toBe('metric_economy');
        expect(result.fixes.some(f => f.includes('metric_gdp'))).toBe(true);
    });

    it('clamps values exceeding the cap', () => {
        const eff = baseEffects();
        eff.options[0].effects[0].value = 8.0;
        const result = validateEffects(eff, validMetricIds, inverseMetrics);
        expect(eff.options[0].effects[0].value).toBe(4.2);
        expect(result.fixes.some(f => f.includes('clamped'))).toBe(true);
    });

    it('flips positive values on inverse metrics', () => {
        const eff = baseEffects();
        eff.options[0].effects.push({ targetMetricId: 'metric_corruption', value: 2.0, duration: 3, probability: 1 });
        const result = validateEffects(eff, validMetricIds, inverseMetrics);
        const corruptionEffect = eff.options[0].effects.find(e => e.targetMetricId === 'metric_corruption');
        expect(corruptionEffect!.value).toBe(-2.0);
        expect(result.fixes.some(f => f.includes('flipped'))).toBe(true);
    });

    it('normalizes probability to 1', () => {
        const eff = baseEffects();
        eff.options[0].effects[0].probability = 0.7;
        const result = validateEffects(eff, validMetricIds, inverseMetrics);
        expect(eff.options[0].effects[0].probability).toBe(1);
        expect(result.fixes.some(f => f.includes('probability'))).toBe(true);
    });

    it('fixes invalid duration values', () => {
        const eff = baseEffects();
        eff.options[0].effects[0].duration = 0;
        const result = validateEffects(eff, validMetricIds, inverseMetrics);
        expect(eff.options[0].effects[0].duration).toBe(1);
        expect(result.fixes.some(f => f.includes('duration'))).toBe(true);
    });

    it('fails when any effects have unmappable metrics', () => {
        const eff = {
            options: [
                { id: 'opt_a', effects: [{ targetMetricId: 'metric_economy', value: 1, duration: 1, probability: 1 }, { targetMetricId: 'metric_fake_two', value: 1, duration: 1, probability: 1 }] },
                { id: 'opt_b', effects: [{ targetMetricId: 'metric_trade', value: 1, duration: 1, probability: 1 }] },
                { id: 'opt_c', effects: [{ targetMetricId: 'metric_budget', value: 1, duration: 1, probability: 1 }] },
            ],
        };
        const result = validateEffects(eff, validMetricIds, inverseMetrics);
        expect(result.pass).toBe(false);
        expect(result.issues.some(i => i.includes('unmappable metrics remain'))).toBe(true);
    });

    it('reports issues for options with no effects', () => {
        const eff = baseEffects();
        eff.options[1].effects = [];
        const result = validateEffects(eff, validMetricIds, inverseMetrics);
        expect(result.issues.some(i => i.includes('no effects'))).toBe(true);
    });

    it('uses custom cap when provided', () => {
        const eff = baseEffects();
        eff.options[0].effects[0].value = 3.0;
        const result = validateEffects(eff, validMetricIds, inverseMetrics, 2.5);
        expect(eff.options[0].effects[0].value).toBe(2.5);
        expect(result.fixes.some(f => f.includes('clamped'))).toBe(true);
    });
});

import { ALL_BUNDLE_IDS } from '../data/schemas/bundleIds';
import {
    buildArchitectPrompt,
    buildDrafterPrompt,
    getBundlePromptOverlay,
    getBundlesWithPromptOverlays,
    getCompactDrafterPromptBase,
    getOllamaEffectsPrompt,
    getOllamaSkeletonPrompt,
} from '../lib/prompt-templates';

describe('bundle prompt overlays', () => {
    test('covers every canonical bundle id', () => {
        expect([...getBundlesWithPromptOverlays()].sort()).toEqual([...ALL_BUNDLE_IDS].sort());
    });

    test.each(ALL_BUNDLE_IDS)('returns non-empty architect and drafter guidance for %s', (bundleId) => {
        const overlay = getBundlePromptOverlay(bundleId);

        expect(overlay.architect.trim().length).toBeGreaterThan(20);
        expect(overlay.drafter.trim().length).toBeGreaterThan(20);
    });

    test('omits bulky few-shot and reflection sections in low-latency mode', () => {
        const prompt = buildDrafterPrompt(
            'BASE PROMPT',
            [
                {
                    id: 'example-1',
                    title: 'Example Title',
                    description: 'Example description',
                    phase: 'mid',
                    actIndex: 1,
                    options: [],
                    metadata: {
                        bundle: 'economy',
                        severity: 'medium',
                        tags: ['budget'],
                        estimatedReadingTimeSec: 30,
                    },
                } as any,
            ],
            'REFLECTION BLOCK',
            { lowLatencyMode: true }
        );

        expect(prompt).toContain('LOW-LATENCY MODE');
        expect(prompt).not.toContain('PERFECT EXAMPLES');
        expect(prompt).not.toContain('REFLECTION BLOCK');
    });

    test('includes examples and reflection sections in normal mode', () => {
        const prompt = buildDrafterPrompt(
            'BASE PROMPT',
            [
                {
                    id: 'example-1',
                    title: 'Example Title',
                    description: 'Example description',
                    phase: 'mid',
                    actIndex: 1,
                    options: [],
                    metadata: {
                        bundle: 'economy',
                        severity: 'medium',
                        tags: ['budget'],
                        estimatedReadingTimeSec: 30,
                    },
                } as any,
            ],
            'REFLECTION BLOCK'
        );

        expect(prompt).toContain('BASE PROMPT');
        expect(prompt).toContain('# PERFECT EXAMPLES');
        expect(prompt).toContain('## Example 1: Example Title');
        expect(prompt).toContain('REFLECTION BLOCK');
        expect(prompt.indexOf('BASE PROMPT')).toBeLessThan(prompt.indexOf('# PERFECT EXAMPLES'));
        expect(prompt.indexOf('# PERFECT EXAMPLES')).toBeLessThan(prompt.indexOf('REFLECTION BLOCK'));
    });

    test('replaces architect prompt with compact low-latency instructions', () => {
        const prompt = buildArchitectPrompt('VERY LARGE BASE PROMPT WITH MANY RULES', { lowLatencyMode: true });

        expect(prompt).toContain('LOW-LATENCY MODE');
        expect(prompt).toContain('Return valid JSON only.');
        expect(prompt).not.toContain('VERY LARGE BASE PROMPT WITH MANY RULES');
    });

    test('compact drafter prompt encodes relationship-token and option-domain policy', () => {
        const prompt = getCompactDrafterPromptBase();
        expect(prompt).toContain('never as tokens');
        expect(prompt).toContain('If concept context provides optionDomains');
        expect(prompt).toContain('no special {the_*} prefix tokens');
    });

    test('compact drafter prompt encodes core token and voice rules', () => {
        const prompt = getCompactDrafterPromptBase();

        expect(prompt).toContain('second person');
        expect(prompt).toContain('third-person news style');
        expect(prompt).toContain('active voice');
    });

    test('economy overlay includes universal-scope anti-anchoring guidance', () => {
        const overlay = getBundlePromptOverlay('economy');

        expect(overlay.architect).toContain('UNIVERSAL SCOPE EXCEPTION');
        expect(overlay.drafter).toContain('Do not write Congress');
        expect(overlay.drafter).toContain('Do not use absolute money figures');
    });

    test('universal skeleton prompt explicitly bans hard-coded money and real institutions', () => {
        const prompt = getOllamaSkeletonPrompt({
            concept: 'Budget backlash after subsidy cuts',
            bundle: 'economy',
            scopeTier: 'universal',
            scopeNote: 'Scope tier: universal. Scope key: universal.',
            countryNote: '',
            countryContextBlock: '',
            bundleGuidance: 'bundle guidance',
            scopeGuidance: 'scope guidance',
            tokenContext: 'token context',
        });

        expect(prompt).toContain('Never write absolute money figures');
        expect(prompt).toContain('UNIVERSAL SCOPE: favor reusable domestic actors');
    });

    test('effects prompt bans hard-coded money and institution names in outcomes', () => {
        const prompt = getOllamaEffectsPrompt({
            skeleton: {
                title: 'Auditors Flag Budget Hole',
                description: 'A domestic budget fight is escalating.',
                options: [{ id: 'opt_a', text: 'You order a temporary spending freeze.', label: 'Freeze' }],
            },
            bundle: 'economy',
            validMetricIds: ['metric_economy', 'metric_budget'],
            inverseMetrics: ['metric_inflation'],
            scopeTier: 'universal',
        });

        expect(prompt).toContain('NEVER use absolute money figures');
        expect(prompt).toContain('NEVER hardcode country names');
    });
});

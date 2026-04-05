import { ALL_BUNDLE_IDS } from '../data/schemas/bundleIds';
import { buildArchitectPrompt, buildDrafterPrompt, getBundlePromptOverlay, getBundlesWithPromptOverlays, getCompactDrafterPromptBase } from '../lib/prompt-templates';

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
        expect(prompt).toContain('Never use relationship tokens in prose');
        expect(prompt).toContain('If concept context provides optionDomains');
    });
});

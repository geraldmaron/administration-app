import { ALL_BUNDLE_IDS } from '../data/schemas/bundleIds';
import { buildArchitectPrompt, buildDrafterPrompt, getBundlePromptOverlay, getBundlesWithPromptOverlays } from '../lib/prompt-templates';

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

    test('replaces architect prompt with compact low-latency instructions', () => {
        const prompt = buildArchitectPrompt('VERY LARGE BASE PROMPT WITH MANY RULES', { lowLatencyMode: true });

        expect(prompt).toContain('LOW-LATENCY MODE');
        expect(prompt).toContain('Return valid JSON only.');
        expect(prompt).not.toContain('VERY LARGE BASE PROMPT WITH MANY RULES');
    });
});
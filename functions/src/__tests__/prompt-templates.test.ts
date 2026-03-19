import { ALL_BUNDLE_IDS } from '../data/schemas/bundleIds';
import { getBundlePromptOverlay, getBundlesWithPromptOverlays } from '../lib/prompt-templates';

describe('bundle prompt overlays', () => {
    test('covers every canonical bundle id', () => {
        expect([...getBundlesWithPromptOverlays()].sort()).toEqual([...ALL_BUNDLE_IDS].sort());
    });

    test.each(ALL_BUNDLE_IDS)('returns non-empty architect and drafter guidance for %s', (bundleId) => {
        const overlay = getBundlePromptOverlay(bundleId);

        expect(overlay.architect.trim().length).toBeGreaterThan(20);
        expect(overlay.drafter.trim().length).toBeGreaterThan(20);
    });
});
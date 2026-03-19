"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const bundleIds_1 = require("../data/schemas/bundleIds");
const prompt_templates_1 = require("../lib/prompt-templates");
describe('bundle prompt overlays', () => {
    test('covers every canonical bundle id', () => {
        expect([...(0, prompt_templates_1.getBundlesWithPromptOverlays)()].sort()).toEqual([...bundleIds_1.ALL_BUNDLE_IDS].sort());
    });
    test.each(bundleIds_1.ALL_BUNDLE_IDS)('returns non-empty architect and drafter guidance for %s', (bundleId) => {
        const overlay = (0, prompt_templates_1.getBundlePromptOverlay)(bundleId);
        expect(overlay.architect.trim().length).toBeGreaterThan(20);
        expect(overlay.drafter.trim().length).toBeGreaterThan(20);
    });
});
//# sourceMappingURL=prompt-templates.test.js.map
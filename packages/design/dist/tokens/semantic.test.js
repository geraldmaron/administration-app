import { describe, expect, it } from "vitest";
import { semantic } from "./semantic.js";
import { layers } from "./layers.js";
import { alignment } from "./alignment.js";
import { color } from "./color.js";
import { materials } from "./materials.js";
import { contrastRatio } from "./contrast.js";
describe("semantic color roles", () => {
    it("keeps primary-action labels readable in normal, hover and pressed states", () => {
        for (const fill of [semantic.action, semantic.actionHover, semantic.actionPressed]) {
            expect(contrastRatio(color.text.primary, fill)).toBeGreaterThanOrEqual(4.5);
        }
    });
    it("keeps identity (crimson) distinct from interaction (selection)", () => {
        expect(semantic.identity).toBe(color.accent.primary);
        expect(semantic.interaction).not.toBe(semantic.identity);
        expect(semantic.interaction).not.toBe(semantic.adverse);
        expect(semantic.interaction).not.toBe(semantic.destructive);
    });
    it("keeps adverse/destructive off the interaction hue", () => {
        expect(semantic.adverse).toBe(color.stance.adverse);
        expect(semantic.destructive).not.toBe(semantic.identity);
    });
    it("keeps TOP SECRET handling off identity crimson", () => {
        expect(materials.classification.topSecret).not.toBe(semantic.identity);
        expect(materials.classification.topSecret).not.toBe(materials.classification.secret);
    });
});
describe("named layers", () => {
    it("maps GROUND/SURFACE/RAISED/INSET/DOCUMENT to distinct fills", () => {
        expect(layers.ground).toBe(color.ground.base);
        expect(layers.surface).toBe(color.ground.raised);
        expect(layers.raised).toBe(color.ground.overlay);
        expect(layers.inset).toBe(color.ground.sunken);
        expect(layers.document).toBe("#F5F8FE");
        const fills = [layers.ground, layers.surface, layers.raised, layers.inset, layers.document];
        expect(new Set(fills).size).toBe(fills.length);
    });
});
describe("alignment primitives", () => {
    it("exposes rail, row, and slot geometry", () => {
        expect(alignment.railWidth.wide).toBeGreaterThanOrEqual(alignment.railWidth.standard);
        expect(alignment.slot.face).toBeGreaterThan(alignment.slot.faceCompact);
        expect(alignment.rowHeight.standard).toBeGreaterThanOrEqual(alignment.rowHeight.compact);
    });
});

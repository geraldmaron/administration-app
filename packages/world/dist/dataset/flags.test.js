import { describe, it, expect } from "vitest";
import { FlagDesign, FlagEmblem, FlagLayout, FlagTincture } from "../schemas/flag.js";
import { FLAG_EMBLEMS, FLAG_LAYOUTS, FLAG_TINCTURES, defaultFlagDesign, flagObjections, tinctureLuminance, } from "./flags.js";
describe("world.flags vocabulary", () => {
    it("gives every schema id an authored entry", () => {
        for (const layout of FlagLayout.options)
            expect(FLAG_LAYOUTS[layout], layout).toBeDefined();
        for (const emblem of FlagEmblem.options)
            expect(FLAG_EMBLEMS[emblem], emblem).toBeDefined();
        for (const tincture of FlagTincture.options)
            expect(FLAG_TINCTURES[tincture], tincture).toBeDefined();
    });
    it("keeps every layout's emblem band inside the bands it actually draws", () => {
        for (const layout of FlagLayout.options) {
            const spec = FLAG_LAYOUTS[layout];
            expect(spec.emblemBand, `${layout} emblem band`).toBeLessThan(spec.bands);
            for (const [a, b] of spec.touching) {
                expect(a, `${layout} touching pair`).toBeLessThan(spec.bands);
                expect(b, `${layout} touching pair`).toBeLessThan(spec.bands);
                expect(a).not.toBe(b);
            }
        }
    });
    it("authors every tincture as a six-digit hex", () => {
        for (const tincture of FlagTincture.options) {
            expect(FLAG_TINCTURES[tincture].hex, tincture).toMatch(/^#[0-9A-Fa-f]{6}$/);
        }
    });
    // Bone is the palette's near-white and ink its near-black; if the derivation
    // ever inverts or flattens, this is where it shows rather than in a flag that
    // silently stops being checkable.
    it("derives luminance in the order the eye reads it", () => {
        expect(tinctureLuminance("bone")).toBeGreaterThan(tinctureLuminance("gold"));
        expect(tinctureLuminance("gold")).toBeGreaterThan(tinctureLuminance("crimson"));
        expect(tinctureLuminance("crimson")).toBeGreaterThan(tinctureLuminance("ink"));
        for (const tincture of FlagTincture.options) {
            expect(tinctureLuminance(tincture), tincture).toBeGreaterThanOrEqual(0);
            expect(tinctureLuminance(tincture), tincture).toBeLessThanOrEqual(1);
        }
    });
});
describe("world.flags legibility", () => {
    it("passes the design a founding opens on", () => {
        expect(flagObjections(defaultFlagDesign)).toEqual([]);
    });
    it("refuses two darks laid against each other", () => {
        const design = FlagDesign.parse({
            layout: "horizontal-bicolor",
            tinctures: ["ink", "pine", "bone"],
            emblem: "none",
            emblemTincture: "bone",
        });
        expect(flagObjections(design)).toHaveLength(1);
    });
    it("ignores a clash between tinctures the layout never draws", () => {
        // A bicolor draws two of the three carried tinctures. The third is held so
        // that switching construction does not lose the player's choice, and it
        // cannot be objected to while it is not on the flag.
        const design = FlagDesign.parse({
            layout: "horizontal-bicolor",
            tinctures: ["ink", "bone", "pine"],
            emblem: "none",
            emblemTincture: "bone",
        });
        expect(flagObjections(design)).toEqual([]);
    });
    it("refuses a charge that disappears into the band under it", () => {
        const design = FlagDesign.parse({
            layout: "horizontal-triband",
            // The triband's charge sits on the middle band, which is sand here.
            tinctures: ["ink", "sand", "ink"],
            emblem: "star",
            emblemTincture: "gold",
        });
        expect(flagObjections(design)).toHaveLength(1);
        expect(flagObjections(design)[0].explanation).toContain("star");
    });
    it("checks the charge against its own layout's band, not always the middle one", () => {
        // A hoist triangle carries its charge on the triangle — the third tincture
        // — so a design legible as a triband can still be refused here.
        const design = FlagDesign.parse({
            layout: "hoist-triangle",
            tinctures: ["bone", "sand", "ink"],
            emblem: "star",
            emblemTincture: "plum",
        });
        expect(flagObjections(design)).toHaveLength(1);
        expect(flagObjections(design)[0].explanation).toContain("Ink");
    });
});

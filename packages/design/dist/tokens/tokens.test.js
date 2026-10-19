import { describe, it, expect } from "vitest";
import { contrastRatio, parseHex } from "./contrast.js";
import { accent, color, gradient, typography, spacing, radius, motion, elevation, control, controlHitInset, } from "./index.js";
describe("design tokens", () => {
    it("exposes distinct primary, bright, and hover accent stops", () => {
        expect(color.accent.primary).toBe("#BE303E");
        expect(color.accent.bright).toBe("#FF929C");
        expect(color.accent.hover).toBe("#972331");
        expect(color.accent.primary).not.toBe(color.accent.bright);
    });
    it("draws the identity accent from the one institutional crimson", () => {
        expect(accent.primary).toBe("#BE303E");
        expect(color.accent.primary).toBe(accent.primary);
        expect(color.tint.accent).toBe("rgba(190,48,62,0.16)");
    });
    // The accent used to be one of seven presets a player picked in Settings,
    // and the focus ring had to be defended against being recolored into brand
    // violet by that choice. The picker is gone and the accent is fixed, so what
    // is left to hold is the lane split itself: focus is interaction (cool blue),
    // never identity (crimson).
    it("keeps the focus ring on the interaction lane, not the identity one", () => {
        expect(color.focus.ring).toBe("#9BBFF8");
        expect(color.focus.ring).not.toBe(accent.focus);
        expect(color.focus.ring).not.toBe(accent.primary);
    });
    // Presidential navy: raised surfaces stay distinct from the workspace.
    it("keeps the player ground dark, each surface a visible step lighter than the one under it", () => {
        const luminance = (hex) => {
            const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
            return 0.2126 * r + 0.7152 * g + 0.0722 * b;
        };
        expect(luminance(color.ground.base)).toBeLessThan(0.02);
        expect(luminance(color.ground.raised)).toBeGreaterThan(luminance(color.ground.base) * 1.5);
        expect(luminance(color.ground.overlay)).toBeGreaterThan(luminance(color.ground.raised));
    });
    it("define all four stance semantics", () => {
        expect(Object.keys(color.stance).sort()).toEqual(["adverse", "caution", "favorable", "neutral"]);
    });
    it("scale spacing and typography from a fixed base rather than ad-hoc numbers", () => {
        expect(spacing.sm).toBe(spacing.xs * 2);
        expect(typography.size.displayLarge).toBeGreaterThan(typography.size.body);
    });
    it("resolveMotion falls back to an instant value when reduced motion is enabled", async () => {
        const { resolveMotion } = await import("./motion.js");
        expect(resolveMotion(motion.duration.slow, true, 0)).toBe(0);
        expect(resolveMotion(motion.duration.slow, false, 0)).toBe(motion.duration.slow);
    });
    it("steps elevation from the ground up, so a surface is never deeper than the chrome over it", () => {
        expect(elevation.sheet.elevation).toBeGreaterThan(elevation.dock.elevation);
        expect(elevation.dock.elevation).toBeGreaterThan(elevation.raised.elevation);
        expect(elevation.raised.elevation).toBeGreaterThan(elevation.card.elevation);
        expect(elevation.card.elevation).toBeGreaterThan(elevation.ground.elevation);
    });
    const shadowsOf = (level) => elevation[level].boxShadow;
    it("carries a specular edge and an occlusion at every level that lifts a surface", () => {
        // `glow` is excluded from the specular half: its fill is the light end of
        // the action ramp, so the light comes off the control as a bloom rather
        // than off a highlight on its own edge. `inset` is excluded from the outer
        // half for the mirror-image reason — a well casts nothing, it receives.
        for (const level of ["inset", "card", "raised", "dock", "sheet"]) {
            expect(shadowsOf(level).some((shadow) => shadow.inset === true), `elevation.${level} has no inset edge — nothing catches the light`).toBe(true);
        }
        for (const level of ["card", "raised", "dock", "sheet"]) {
            expect(shadowsOf(level).some((shadow) => shadow.inset !== true), `elevation.${level} has no outer shadow — nothing occludes the ground under it`).toBe(true);
        }
    });
    it("uses shadow opacities that register against dark ground rather than a light-ground scale's", () => {
        const alphaOf = (rgba) => Number.parseFloat(/,\s*([\d.]+)\s*\)$/.exec(rgba)?.[1] ?? "1");
        // The scale this replaced peaked at 0.18 and typically ran 0.06. Against a
        // near-black ground those are within rounding of the ground itself.
        for (const level of ["card", "raised", "dock", "sheet"]) {
            const outer = shadowsOf(level).filter((shadow) => shadow.inset !== true);
            const strongest = Math.max(...outer.map((shadow) => alphaOf(shadow.color)));
            expect(strongest, `elevation.${level}'s cast is too faint to read on dark ground`).toBeGreaterThanOrEqual(0.4);
        }
    });
    // The check the previous scale was missing, and the reason it could be
    // "fixed" for navy and still render flat: a shadow token can be on the right
    // axis, at a plausible alpha, and still composite to within a rounding error
    // of the surface it is drawn on. Depth is not whether the value looks dark —
    // it is whether the composite is a step the eye can find.
    //
    // Only the specular is asserted. An opaque pure-black shadow over
    // `ground.base` reaches 1.10:1, so no threshold worth writing exists for the
    // occlusion or the cast on this ground; demanding one would be a gate that
    // can only be passed by leaving the navy ground.
    it("puts a specular edge on every lifted level that is actually visible on its own ground", () => {
        const composite = (rgba, over) => {
            const parts = /^rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*\)$/.exec(rgba);
            if (!parts)
                throw new Error(`"${rgba}" is not an rgba() color.`);
            const alpha = Number(parts[4]);
            const under = parseHex(over);
            const mixed = [under.r, under.g, under.b].map((channel, index) => Math.round(Number(parts[index + 1]) * alpha + channel * (1 - alpha)));
            return `#${mixed.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
        };
        // The ground each level is drawn on in the shipped app: a card is a plate
        // on the room, everything above it is chrome on the overlay step.
        const DRAWN_ON = {
            inset: color.ground.raised,
            card: color.ground.raised,
            raised: color.ground.overlay,
            dock: color.ground.overlay,
            sheet: color.ground.overlay,
        };
        // `inset` carries two inset shadows — its well's occlusion and its light —
        // so the highlight is found by color, not by the `inset` flag.
        const SPECULARS = new Set([color.shadow.specular, color.shadow.specularStrong]);
        for (const [level, ground] of Object.entries(DRAWN_ON)) {
            const highlight = shadowsOf(level).find((shadow) => SPECULARS.has(shadow.color));
            expect(highlight, `elevation.${level} draws no specular edge at all`).toBeDefined();
            const ratio = contrastRatio(composite(highlight?.color ?? "", ground), ground);
            expect(ratio, `elevation.${level}'s specular edge is ${ratio.toFixed(2)}:1 against the ground it is drawn on — invisible`).toBeGreaterThanOrEqual(1.3);
        }
    });
    it("inverts the well: a recessed surface occludes at its top edge, a raised one below it", () => {
        const well = shadowsOf("inset").find((shadow) => shadow.color === color.shadow.occlusion);
        const plate = shadowsOf("card").find((shadow) => shadow.color === color.shadow.occlusion);
        expect(well?.inset).toBe(true);
        expect(plate?.inset).toBeUndefined();
    });
    it("throws the dock's cast upward, because the room it covers is below it", () => {
        const cast = shadowsOf("dock").find((shadow) => (shadow.blurRadius ?? 0) > 8);
        expect(cast?.offsetY).toBeLessThan(0);
    });
    it("draws every shadow cue on the cool blue axis, never neutral black", () => {
        for (const [name, rgba] of Object.entries(color.shadow)) {
            const parsed = /^rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/.exec(rgba);
            expect(parsed, `shadow.${name} must be an rgba() value`).not.toBeNull();
            const [r, g, b] = [Number(parsed?.[1]), Number(parsed?.[2]), Number(parsed?.[3])];
            expect(r + g + b, `shadow.${name} is pure neutral black`).toBeGreaterThan(0);
            if (name.startsWith("specular")) {
                // The edge light is brass: a warm highlight on the top edge of every raised surface.
                expect(r, `shadow.${name} edge light is not warm brass`).toBeGreaterThanOrEqual(220);
                expect(r, `shadow.${name} edge light is not warm brass`).toBeGreaterThan(b);
            }
            else if (name === "bloom") {
                // The committing act's halo is the interaction glow.
                expect(b, `shadow.${name} is not the interaction glow`).toBeGreaterThanOrEqual(200);
            }
            else {
                // Cool blue ground: occlusion/cast lean blue-channel, not warm charcoal.
                expect(b, `shadow.${name} is not on the cool blue axis`).toBeGreaterThanOrEqual(r);
            }
        }
    });
    it("ranks radius by how much of the screen a surface claims, short of SaaS roundness", () => {
        expect(radius.chip).toBeLessThan(radius.control);
        expect(radius.control).toBeLessThan(radius.card);
        expect(radius.card).toBeLessThan(radius.sheet);
        expect(radius.sheet).toBeLessThan(24);
        expect(radius.pill).toBe(999);
    });
    // The scale is five steps and the names are the ranks. It was sixteen names
    // for fifteen values, six of which described the widget being drawn rather
    // than its rank, and two of which (`panel`, `button`) were the same number
    // twice. Asserted by exact key list because the failure mode is additive: a
    // route needing "something between card and sheet" adds a seventeenth name,
    // and nothing else in the build says no.
    it("keeps the radius scale at five ranks, with no name for a widget", () => {
        expect(Object.keys(radius)).toEqual(["chip", "control", "card", "sheet", "pill"]);
    });
    // Two names for one color is how the surface scale grew to 24 names over 9
    // values — and how `material.functional` came to equal `ground.base`, which
    // painted the inspector rail in the page's own color and left a hairline
    // doing the whole job. A duplicate is not a convenience alias; it is a rank
    // the player cannot see.
    it("gives every step of the ground ramp its own value", () => {
        const values = Object.values(color.ground);
        expect(new Set(values).size, "two ground steps share a value").toBe(values.length);
    });
    it("keeps every other surface group off the ramp's values, or a reference to one", () => {
        // `intercept` is the authored off-axis well and `map` is cartography; the
        // one place either may meet the ramp is by pointing at it (`map.sphere`),
        // never by restating a hex.
        const ramp = new Set(Object.values(color.ground));
        for (const [group, entries] of [
            ["intercept", color.intercept],
            ["map", color.map],
        ]) {
            for (const [key, value] of Object.entries(entries)) {
                if (value === color.ground.sunken)
                    continue; // map.sphere, by reference
                expect(ramp.has(value), `${group}.${key} restates a ground step`).toBe(false);
            }
        }
    });
    it("keeps institutional brass distinct from player-owned copper", () => {
        expect(color.mark.owned).not.toBe(color.mark.gold);
        const hue = (hex) => parseInt(hex.slice(1, 3), 16) - parseInt(hex.slice(5, 7), 16);
        expect(hue(color.mark.gold), "brass is warm").toBeGreaterThan(80);
        expect(hue(color.mark.owned), "copper is warm").toBeGreaterThan(80);
        expect("gold" in color).toBe(false);
    });
    it("tints the accent in the accent's own hue", () => {
        const rgb = /^rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/.exec(color.tint.accent);
        const hex = `#${[1, 2, 3].map((i) => Number(rgb?.[i]).toString(16).padStart(2, "0")).join("")}`;
        expect(hex.toUpperCase()).toBe(accent.primary);
    });
    // The chroma rule, asserted rather than remembered: the identity ramp is only
    // ever a sweep, and none of its stops may be reachable as a flat stance color.
    // Reusing stance.adverse (or any stance) as a ramp stop would confuse "this is
    // the act / the brand" with "this reading is bad."
    it("keeps the identity ramp gradient-only and off the stance palette", () => {
        const stances = Object.values(color.stance);
        for (const [name, stops] of Object.entries(gradient)) {
            expect(stops.length, `gradient.${name} must have at least two stops`).toBeGreaterThanOrEqual(2);
            for (const stop of stops) {
                expect(stances, `gradient.${name} may not reuse a stance color`).not.toContain(stop);
            }
        }
    });
    // The residue defect, made mechanical. Every ground, material, scene and
    // scrim value used to be a neutral near-black: low saturation that, composited
    // over a tinted room, pulled its chroma out so a scrim read as a gray film.
    // A ratio check cannot catch that — the luminances were fine — so the axis is
    // asserted directly, and a new "dark neutral" surface token fails here.
    describe("the ground axis", () => {
        const hueAndSaturation = (hex) => {
            const { r, g, b } = parseHex(hex);
            const [red, green, blue] = [r / 255, g / 255, b / 255];
            const max = Math.max(red, green, blue);
            const min = Math.min(red, green, blue);
            const delta = max - min;
            if (delta === 0)
                return { hue: 0, saturation: 0 };
            const lightness = (max + min) / 2;
            const raw = max === red
                ? ((green - blue) / delta) % 6
                : max === green
                    ? (blue - red) / delta + 2
                    : (red - green) / delta + 4;
            return {
                hue: (raw * 60 + 360) % 360,
                saturation: delta / (1 - Math.abs(2 * lightness - 1)),
            };
        };
        const rgbaToHex = (rgba) => {
            const match = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/.exec(rgba);
            if (!match)
                throw new Error(`"${rgba}" is not an rgb()/rgba() color.`);
            return `#${[1, 2, 3].map((index) => Number(match[index]).toString(16).padStart(2, "0")).join("")}`;
        };
        // Marks, textures, authored off-axis surfaces and the map's landmass
        // scale are deliberately off the axis; everything else is a ground.
        const OFF_AXIS = new Set([
            // A white lift, not a ground step: white at 4% reads as light falling on
            // the ground rather than as a second surface color.
            "ground.soft",
            "intercept.background",
            "intercept.border",
            "intercept.texture",
            "intercept.hover",
            "map.land",
            "map.landTracked",
            "map.graticule",
        ]);
        const SURFACES = [
            ...Object.entries(color.ground).map(([key, value]) => [`ground.${key}`, value]),
            ...Object.entries(color.intercept).map(([key, value]) => [`intercept.${key}`, value]),
            ...Object.entries(color.map).map(([key, value]) => [`map.${key}`, value]),
            ...Object.entries(color.scrim).map(([key, value]) => [`scrim.${key}`, rgbaToHex(value)]),
            ["vis.background", color.vis.background],
            ["portrait.backdrop", color.portrait.backdrop],
        ].filter(([name]) => !OFF_AXIS.has(name));
        for (const [name, hex] of SURFACES) {
            it(`${name} stays in the cool institutional blue hue family`, () => {
                const { hue, saturation } = hueAndSaturation(hex);
                // Dark institutional cool blue (~210°) — not warm charcoal, not muddy
                // near-black navy. Bounded so a teal wash or brown charcoal fails here.
                expect(hue, `${name} (${hex}) is hue ${hue.toFixed(0)}°, off the cool blue axis`).toBeGreaterThanOrEqual(200);
                expect(hue, `${name} (${hex}) is hue ${hue.toFixed(0)}°, off the cool blue axis`).toBeLessThanOrEqual(230);
                expect(saturation, `${name} (${hex}) is ${(saturation * 100).toFixed(0)}% saturated — a near-neutral that will gray out whatever it composites over`).toBeGreaterThanOrEqual(0.04);
            });
        }
    });
    it("keeps compact controls visually dense without shrinking their touch target", () => {
        expect(control.height.compact).toBeLessThan(control.height.standard);
        expect(control.height.standard).toBeLessThan(control.height.block);
        expect(control.height.block).toBe(control.height.hold);
        expect(control.height.compact + controlHitInset(control.height.compact) * 2).toBeGreaterThanOrEqual(control.touchTarget);
    });
});

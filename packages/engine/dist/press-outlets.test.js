import { describe, expect, it } from "vitest";
import { LEAN_WEIGHT, PRESS_OUTLETS, outletSpreadAt } from "./press-outlets.js";
/**
 * The roster's zero-sum property was documented in a comment and asserted
 * nowhere, which is the shape of a rule that quietly stops holding: every
 * belief axis cancels across the corps, so the mean of the outlet targets is
 * still `pressStandingTarget` and the coalitions read an aggregate no single
 * masthead moved. Adding an outlet without rebalancing would shift every
 * downstream judgment by a constant nobody would think to look for.
 */
describe("the press roster's balance", () => {
    const AXES = ["economicLeftRight", "authLibertarian", "nationalistGlobalist"];
    it.each(AXES)("cancels to zero on %s", (axis) => {
        const sum = PRESS_OUTLETS.reduce((total, outlet) => total + outlet.beliefs[axis], 0);
        expect(sum).toBeCloseTo(0, 10);
    });
    // The band the property actually holds in. `outletSpreadAt` clamps each
    // target to 0..1, so once the most hostile masthead's own offset would carry
    // it below zero the clamp - not the roster - decides the mean, and it biases
    // upward. The roster's comment claimed the property unconditionally; this is
    // the qualification, pinned so a future lean cannot widen the dead zone
    // without saying so.
    const WIDEST_HOSTILE = 0.8 * LEAN_WEIGHT;
    const WIDEST_FRIENDLY = 0.55 * LEAN_WEIGHT;
    it("leaves the spread's mean exactly where standing already was, inside the unclamped band", () => {
        for (const standing of [WIDEST_HOSTILE, 0.35, 0.5, 0.7, 1 - WIDEST_FRIENDLY]) {
            const spread = Object.values(outletSpreadAt(standing));
            const mean = spread.reduce((total, value) => total + value, 0) / spread.length;
            // `outletSpreadAt` rounds each target to three places, so the mean can
            // sit up to half of that off standing. Asserting tighter than the
            // function's own precision tests the rounding, not the balance.
            expect(mean).toBeCloseTo(standing, 3);
        }
    });
    it("records that outside that band the clamp, not the roster, moves the mean", () => {
        const spread = Object.values(outletSpreadAt(0.05));
        const mean = spread.reduce((total, value) => total + value, 0) / spread.length;
        // Not a bug to fix here: a corps this hostile has mastheads pinned at zero,
        // and a floor is the honest reading. It is documented so nobody later
        // "fixes" the mean by rebalancing beliefs that are already balanced.
        expect(mean).toBeGreaterThan(0.05);
        expect(spread.some((value) => value === 0)).toBe(true);
    });
    it("gives every outlet a distinct id and name", () => {
        expect(new Set(PRESS_OUTLETS.map((o) => o.id)).size).toBe(PRESS_OUTLETS.length);
        expect(new Set(PRESS_OUTLETS.map((o) => o.name)).size).toBe(PRESS_OUTLETS.length);
    });
    it("reads lean off beliefs rather than letting it be authored beside them", () => {
        for (const outlet of PRESS_OUTLETS)
            expect(outlet.lean).toBe(outlet.beliefs.authLibertarian);
    });
    // The spread is clamped to 0..1, and a clamp that actually bites would break
    // the mean property above without any axis having changed. This is the guard
    // on LEAN_WEIGHT rather than on the roster.
    it("keeps every outlet inside the clamp at the standings the game reaches", () => {
        const widest = Math.max(...PRESS_OUTLETS.map((o) => Math.abs(o.lean))) * LEAN_WEIGHT;
        expect(widest).toBeLessThan(0.5);
    });
});

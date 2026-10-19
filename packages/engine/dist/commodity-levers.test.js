/**
 * The fuel levers: refused where the law does not reach, priced where it does,
 * and moving a mechanism (barrels added, cents off the gallon) rather than a
 * written price.
 */
import { describe, expect, it } from "vitest";
import { foundedForBalance } from "./balance-harness.js";
import { commodityShocks, RESERVE_RELEASE_SHARE } from "./commodity-shocks.js";
import { issueFuelWaiver, projectFuelWaiver, projectReserveRelease, releaseStrategicReserve, RELEASE_DRAW } from "./commodity-levers.js";
import { openConflict } from "./conflicts.js";
import { apply } from "./effects.js";
import { selectPumpPrice } from "./household-prices.js";
const { campaign: CALM } = foundedForBalance("commodity-levers", "democrat", {}, { carriedWorld: false });
const war = { ...openConflict("IRN", "SAU", CALM.turn, "A test war."), intensity: 0.8 };
const SHOCKED = { ...CALM, conflicts: { [war.id]: war } };
describe("the Strategic Petroleum Reserve", () => {
    it("is refused with crude where buyers expect it", () => {
        const projection = projectReserveRelease(CALM);
        expect(projection.ok).toBe(false);
        expect(releaseStrategicReserve(CALM).ok).toBe(false);
    });
    it("releases into a supply interruption, adds barrels as a shock, and cannot flow twice", () => {
        expect(projectReserveRelease(SHOCKED).ok).toBe(true);
        const result = releaseStrategicReserve(SHOCKED);
        if (!result.ok)
            throw new Error(result.reason);
        const released = apply(SHOCKED, result.packet);
        expect(released.markets?.reserve?.fill).toBeCloseTo(1 - RELEASE_DRAW, 9);
        const release = commodityShocks(released, "crude").find((shock) => shock.kind === "release");
        expect(release?.loss).toBe(-RESERVE_RELEASE_SHARE);
        expect(projectReserveRelease(released).ok).toBe(false);
    });
});
describe("the emergency fuel waiver", () => {
    it("is refused with the pump near the oath's price and no interruption", () => {
        expect(projectFuelWaiver(CALM).ok).toBe(false);
    });
    it("takes cents off the gallon while it stands", () => {
        const result = issueFuelWaiver(SHOCKED);
        if (!result.ok)
            throw new Error(result.reason);
        const waived = apply(SHOCKED, result.packet);
        expect(selectPumpPrice(waived)).toBeLessThan(selectPumpPrice(SHOCKED));
        expect(projectFuelWaiver(waived).ok).toBe(false);
    });
});

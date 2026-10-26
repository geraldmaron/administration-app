/**
 * The fuel levers: refused where the law does not reach, priced where it does,
 * and moving a mechanism (barrels added, cents off the gallon) rather than a
 * written price.
 */
import { describe, expect, it } from "vitest";
import type { NationId } from "@admin/world";
import { foundedForBalance } from "./balance-harness.js";
import { commodityShocks, RESERVE_RELEASE_SHARE, reserveReleasing } from "./commodity-shocks.js";
import { issueFuelWaiver, LIMITED_DRAWDOWN, LIMITED_RELEASE_SHARE, projectFuelWaiver, projectLimitedRelease, projectReserveRelease, releaseLimitedReserve, releaseStrategicReserve, RELEASE_DRAW, SPR_OPENING_BARRELS } from "./commodity-levers.js";
import { emptyMarkets } from "./markets.js";
import { withWeeksElapsed } from "./__fixtures__/campaign.js";
import { openConflict } from "./conflicts.js";
import { apply } from "./effects.js";
import { selectPumpPrice } from "./household-prices.js";
import type { Campaign } from "./state.js";

const { campaign: CALM } = foundedForBalance("commodity-levers", "democrat", {}, { carriedWorld: false });
const war = { ...openConflict("IRN" as NationId, "SAU" as NationId, CALM.turn, "A test war."), intensity: 0.8 };
const SHOCKED: Campaign = { ...CALM, conflicts: { [war.id]: war } };

describe("the Strategic Petroleum Reserve", () => {
  it("is refused with crude where buyers expect it", () => {
    const projection = projectReserveRelease(CALM);
    expect(projection.ok).toBe(false);
    expect(releaseStrategicReserve(CALM).ok).toBe(false);
  });

  it("releases into a supply interruption, adds barrels as a shock, and cannot flow twice", () => {
    expect(projectReserveRelease(SHOCKED).ok).toBe(true);
    const result = releaseStrategicReserve(SHOCKED);
    if (!result.ok) throw new Error(result.reason);
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
    if (!result.ok) throw new Error(result.reason);
    const waived = apply(SHOCKED, result.packet);
    expect(selectPumpPrice(waived)).toBeLessThan(selectPumpPrice(SHOCKED));
    expect(projectFuelWaiver(waived).ok).toBe(false);
  });
});

describe("the limited drawdown (42 U.S.C. §6241(h))", () => {
  const withFill = (campaign: Campaign, fill: number): Campaign => ({ ...campaign, markets: { ...campaign.markets!, reserve: { fill } } });
  const marketsOn = (campaign: Campaign): Campaign => ({ ...campaign, markets: campaign.markets ?? emptyMarkets() });
  const shocked = marketsOn(SHOCKED);

  it("is refused where no supply is being lost", () => {
    expect(projectLimitedRelease(marketsOn(CALM)).ok).toBe(false);
  });

  it("adds 30 million barrels over 60 days as a smaller release than a full drawdown", () => {
    const result = releaseLimitedReserve(shocked);
    if (!result.ok) throw new Error(result.reason);
    const released = apply(shocked, result.packet);
    const release = commodityShocks(released, "crude").find((shock) => shock.kind === "release");
    expect(release?.loss).toBeCloseTo(-LIMITED_RELEASE_SHARE, 12);
    expect(LIMITED_RELEASE_SHARE).toBeLessThan(RESERVE_RELEASE_SHARE);
    expect(released.markets!.reserve!.fill * SPR_OPENING_BARRELS).toBeCloseTo(SPR_OPENING_BARRELS - LIMITED_DRAWDOWN.barrels, -6);
    expect(projectLimitedRelease(released).ok).toBe(false);
  });

  it("allows one limited drawdown for each shortage, however the weeks pass", () => {
    const result = releaseLimitedReserve(shocked);
    if (!result.ok) throw new Error(result.reason);
    const later = withWeeksElapsed(apply(shocked, result.packet), 10);
    expect(reserveReleasing(later)).toBe(false);
    expect(projectLimitedRelease(later).ok).toBe(false);
  });

  it("never takes the reserve below 252.4 million barrels", () => {
    const low = withFill(shocked, (LIMITED_DRAWDOWN.floor + LIMITED_DRAWDOWN.barrels - 1) / SPR_OPENING_BARRELS);
    expect(projectLimitedRelease(low).ok).toBe(false);
  });

  it("earns nothing on a war, a drawdown and a peace: no receipts, and the reserve stays drawn", () => {
    const result = releaseLimitedReserve(shocked);
    if (!result.ok) throw new Error(result.reason);
    expect(result.packet.effects.some((effect) => effect.kind === "metric")).toBe(false);
    const peace = withWeeksElapsed({ ...apply(shocked, result.packet), conflicts: {} }, 10);
    expect(peace.player.metrics.treasury).toBe(shocked.player.metrics.treasury);
    expect(peace.markets!.reserve!.fill).toBeLessThan(1);
    expect(projectLimitedRelease(peace).ok).toBe(false);
  });
});

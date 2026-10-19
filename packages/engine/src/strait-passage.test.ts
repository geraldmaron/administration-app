/**
 * A strait a war closes is closed flag by flag: the government on its shore
 * lets its own, its co-belligerents' and its friends' cargo through and stops
 * the rest, so the price is fed the share of the strait's cargo it stops and
 * the countries that lose supply are the ones it will not pass.
 */
import { describe, expect, it } from "vitest";
import { CHOKEPOINT_CARGO, CHOKEPOINT_FLOWS, type NationId } from "@admin/world";
import { foundedForBalance } from "./balance-harness.js";
import { commodityShocks, ROUTE_CLOSURE } from "./commodity-shocks.js";
import { openConflict } from "./conflicts.js";
import { letsThrough, straitPassage } from "./strait-passage.js";
import type { Campaign, Conflict } from "./state.js";

const USA = "USA" as NationId;
const IRN = "IRN" as NationId;
const CHN = "CHN" as NationId;
const OMN = "OMN" as NationId;

const { campaign: BARE } = foundedForBalance("passage-proof", "democrat", {}, { carriedWorld: false });

function atWar(aggressor: NationId, defender: NationId, joined: readonly NationId[] = []): { readonly campaign: Campaign; readonly war: Conflict } {
  const opened = openConflict(aggressor, defender, BARE.turn, "A test war.");
  const war = { ...opened, intensity: 1, joined: { aggressor: [...joined], defender: [] } };
  return { campaign: { ...BARE, conflicts: { [war.id]: war } }, war };
}

const HORMUZ_LITTORAL = CHOKEPOINT_FLOWS.find((row) => row.chokepoint === "CP-HORMUZ" && row.commodity === "crude")!.littoral as readonly NationId[];
const hormuzCargo = CHOKEPOINT_CARGO.filter((row) => row.chokepoint === "CP-HORMUZ" && row.commodity === "crude");
const total = hormuzCargo.reduce((sum, row) => sum + row.mbd, 0);

describe("who passes", () => {
  it("stops an enemy in the war however it is aligned, and passes a co-belligerent", () => {
    const { campaign, war } = atWar(CHN, IRN, [USA]);
    expect(letsThrough(campaign, war, IRN, CHN)).toBe(false);
    expect(letsThrough(campaign, war, CHN, USA)).toBe(true);
    expect(letsThrough(campaign, war, IRN, IRN)).toBe(true);
  });

  it("passes a government the closing state is aligned with, outside the war", () => {
    const { campaign, war } = atWar(USA, IRN);
    expect(letsThrough(campaign, war, IRN, CHN)).toBe(true);
    expect(letsThrough(campaign, war, IRN, USA)).toBe(false);
  });
});

describe("the share stopped", () => {
  it("stops the cargo of every flag the government closing Hormuz will not pass, and every bucket", () => {
    const { campaign, war } = atWar(USA, IRN);
    const passage = straitPassage(campaign, war, "CP-HORMUZ", "crude", HORMUZ_LITTORAL);
    expect(passage.deniers).toEqual([IRN]);
    expect(passage.passing).toContain(CHN);
    expect(passage.stopped).toEqual(expect.arrayContaining(["USA", "europe", "other-asia-oceania", "other"]));
    const stopped = hormuzCargo.filter((row) => passage.stopped.includes(row.destination)).reduce((sum, row) => sum + row.mbd, 0);
    expect(passage.stoppedShare).toBeCloseTo(stopped / total, 9);
    expect(passage.stoppedShare).toBeLessThan(1);
  });

  it("feeds the price only the stopped share, and names who is let through", () => {
    const { campaign } = atWar(USA, IRN);
    const hormuz = CHOKEPOINT_FLOWS.find((row) => row.chokepoint === "CP-HORMUZ" && row.commodity === "crude")!;
    const route = commodityShocks(campaign, "crude").find((shock) => shock.kind === "route")!;
    expect(route.passage?.stoppedShare).toBeLessThan(1);
    expect(route.loss).toBeCloseTo(hormuz.share * (1 - hormuz.bypass) * route.passage!.stoppedShare * ROUTE_CLOSURE, 9);
    expect(route.cause).toMatch(/ships bound for .*China.* are let through/);
  });

  it("closes a strait with no cargo split on file to every flag alike", () => {
    const { campaign, war } = atWar(OMN, IRN);
    const lng = straitPassage(campaign, war, "CP-HORMUZ", "lng", HORMUZ_LITTORAL);
    expect(lng.stoppedShare).toBe(1);
    expect(lng.passing).toEqual([]);
  });
});

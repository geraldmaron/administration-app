/**
 * A strait a war closes is closed flag by flag: the government on its shore
 * lets its own, its co-belligerents' and its friends' cargo through and stops
 * the rest, so the price is fed the share of the strait's cargo it stops and
 * the countries that lose supply are the ones it will not pass.
 */
import { describe, expect, it } from "vitest";
import { CHOKEPOINT_CARGO, CHOKEPOINT_FLOWS, type NationId } from "@admin/world";
import { foundedForBalance } from "./balance-harness.js";
import { commodityShocks, contestedRoutes, ROUTE_CLOSURE, warLossFraction } from "./commodity-shocks.js";
import { supplierShare } from "./commodity-registry.js";
import { blockadesInForce } from "./blockades.js";
import { apply } from "./effects.js";
import { resolveAction } from "./resolution.js";
import { createRngStreams, makeCampaignSeed } from "./rng.js";
import { openConflict } from "./conflicts.js";
import { blockaderLetsThrough, letsThrough, straitPassage } from "./strait-passage.js";
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
    // Net of the barrels Iran's own war already keeps off the market at origin (`upstreamLost`).
    const [contested] = contestedRoutes(campaign, "crude");
    expect(route.loss).toBeCloseTo(hormuz.share * (1 - hormuz.bypass) * route.passage!.stoppedShare * ROUTE_CLOSURE * (1 - contested!.upstreamLost), 9);
    expect(route.cause).toMatch(/ships bound for .*China.* are let through/);
  });

  it("closes a strait with no cargo split on file to every flag alike", () => {
    const { campaign, war } = atWar(OMN, IRN);
    const lng = straitPassage(campaign, war, "CP-HORMUZ", "lng", HORMUZ_LITTORAL);
    expect(lng.stoppedShare).toBe(1);
    expect(lng.passing).toEqual([]);
  });
});

describe("a navy that does not hold the shore", () => {
  // DECISIONS 6.10, owner ruling 2026-10-25: a government with no coast on a
  // strait denies only cargo bound to or from the government it blockades,
  // only while its forces reach, and no third country's ships unless at war.
  const landed = [...Array(30).keys()]
    .map((k) => resolveAction(BARE, { actor: USA, target: IRN, instrument: "military", rung: 3 }, createRngStreams(makeCampaignSeed(`blockade-${k}`)), "action"))
    .find((result) => result.ok && result.packet.commitment?.landed);
  if (!landed || !landed.ok) throw new Error("the blockade of Iran did not land");
  const blockaded = apply(BARE, landed.packet);
  const blockade = blockadesInForce(blockaded)[0]!;
  const unblockaded: Campaign = { ...blockaded, blockades: {} };
  const crudeLoss = (campaign: Campaign) => commodityShocks(campaign, "crude").reduce((sum, shock) => sum + shock.loss, 0);
  const [route] = contestedRoutes(blockaded, "crude");

  it("stops cargo bound for Iran and lets China's ships through", () => {
    expect(route!.passage.blockaders).toEqual([USA]);
    expect(blockaderLetsThrough(blockaded, blockade, IRN)).toBe(false);
    expect(blockaderLetsThrough(blockaded, blockade, CHN)).toBe(true);
    expect(route!.passage.passing).toContain(CHN);
  });

  it("stops Iran's own loadings, and moves the world's supply by that flow and no more", () => {
    const iranLoadings = supplierShare("crude", IRN) * (1 - warLossFraction(IRN, Object.values(blockaded.conflicts))) * blockade.cut;
    const added = crudeLoss(blockaded) - crudeLoss(unblockaded);
    expect(added).toBeGreaterThan(0);
    expect(added).toBeLessThanOrEqual(iranLoadings + 1e-9);
  });

  it("stops nothing where its navy cannot reach the strait", () => {
    const usa = blockaded.nations[USA]!;
    const beached: Campaign = { ...blockaded, nations: { ...blockaded.nations, [USA]: { ...usa, stats: { ...usa.stats, military: { ...usa.stats.military, branchStrength: { ...usa.stats.military.branchStrength, naval: 0.1 } } } } } };
    expect(blockadesInForce(beached)).toEqual([]);
    expect(contestedRoutes(beached, "crude")[0]?.passage.blockaders ?? []).toEqual([]);
    expect(crudeLoss(beached)).toBeCloseTo(crudeLoss(unblockaded), 12);
  });

  it("never takes the whole strait off the market with one act", () => {
    const hormuz = CHOKEPOINT_FLOWS.find((row) => row.chokepoint === "CP-HORMUZ" && row.commodity === "crude")!;
    expect(route!.passage.stoppedShare).toBeLessThan(1);
    expect(crudeLoss(blockaded)).toBeLessThan(hormuz.share * (1 - hormuz.bypass));
  });
});

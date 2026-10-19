/**
 * The President's hulls can be lost in a war, by name and class: only hulls
 * sent toward the enemy are exposed, only to an enemy that can fire on ships;
 * a lost hull leaves the deployment and the order of battle, its dead go
 * through the war's casualty count, and no name is lost twice.
 */
import { describe, expect, it } from "vitest";
import { US_HULLS, type NationId } from "@admin/world";
import { foundedForBalance } from "./balance-harness.js";
import { openConflict } from "./conflicts.js";
import { apply } from "./effects.js";
import { HULL_LOSS_PER_WEEK, LOST_CREW_KILLED, hullDisplayName, hullLossThisWeek, selectHullLosses, withHullDeaths, type HullWeek } from "./hull-losses.js";
import { createRngStreams } from "./rng.js";
import type { Campaign, Commitment, Conflict } from "./state.js";

const USA = "USA" as NationId;
const IRN = "IRN" as NationId;
const DJI = "DJI" as NationId;

const { campaign: BARE } = foundedForBalance("hull-proof", "democrat", {}, { carriedWorld: false });

const DEPLOYMENT = "commitment:deployment:USA:IRN:hulls";

function atSea(enemy: NationId, hulls: number): { readonly campaign: Campaign; readonly war: Conflict } {
  const war = { ...openConflict(USA, enemy, BARE.turn, "A test war."), intensity: 1 };
  const commitment: Commitment = {
    id: DEPLOYMENT,
    kind: "deployment",
    actor: USA,
    target: { kind: "nation", id: enemy as string },
    resource: { spec: { kind: "currency", scale: 6, suffix: "USD" }, amountPerTurn: 10 },
    source: { kind: "orderOfBattle", branch: "navy", unitType: "navy.surface-combatant", count: hulls },
    startedTurn: BARE.turn,
    review: "standing",
    status: "active",
    rationale: "Hulls on station.",
  };
  return { campaign: { ...BARE, conflicts: { [war.id]: war }, commitments: { ...BARE.commitments, [DEPLOYMENT]: commitment } }, war };
}

/** The first week from `from` on which the war costs a hull, searched deterministically. */
function firstLoss(campaign: Campaign, war: Conflict, from = 0): { readonly at: Campaign; readonly week: HullWeek } {
  for (let turn = from; turn < from + 2000; turn += 1) {
    const at = { ...campaign, turn };
    const week = hullLossThisWeek(at, war, createRngStreams(campaign.seed));
    if (week.effects.length > 0) return { at, week };
  }
  throw new Error("no loss in 2000 weeks");
}

const surfaceCount = (campaign: Campaign) =>
  campaign.nations[USA]!.stats.military.orderOfBattle!.navy!.units!.find((unit) => unit.type === "navy.surface-combatant")!.count;

describe("exposure", () => {
  it("loses nothing with no hulls sent toward the enemy", () => {
    const war = { ...openConflict(USA, IRN, BARE.turn, "A test war."), intensity: 1 };
    const campaign = { ...BARE, conflicts: { [war.id]: war } };
    for (let turn = 0; turn < 200; turn += 1) expect(hullLossThisWeek({ ...campaign, turn }, war, createRngStreams(campaign.seed)).effects).toEqual([]);
  });

  it("loses nothing to an enemy with nothing to fire on ships", () => {
    const { campaign, war } = atSea(DJI, 8);
    for (let turn = 0; turn < 200; turn += 1) expect(hullLossThisWeek({ ...campaign, turn }, war, createRngStreams(campaign.seed)).effects).toEqual([]);
  });

  it("loses hulls at about the Desert Storm rate per exposed hull at full intensity", () => {
    const { campaign, war } = atSea(IRN, 8);
    const weeks = 1500;
    let losses = 0;
    for (let turn = 0; turn < weeks; turn += 1) if (hullLossThisWeek({ ...campaign, turn }, war, createRngStreams(campaign.seed)).effects.length > 0) losses += 1;
    const expected = weeks * (1 - (1 - HULL_LOSS_PER_WEEK) ** 8);
    expect(losses).toBeGreaterThan(expected * 0.6);
    expect(losses).toBeLessThan(expected * 1.4);
  });
});

describe("a lost hull", () => {
  const { campaign, war } = atSea(IRN, 8);
  const { at, week } = firstLoss(campaign, war);
  const after = apply(at, { source: "simulate", actor: "world", turn: at.turn, narration: { summary: "A week at sea." }, effects: week.effects });
  const loss = selectHullLosses(after)[0]!;

  it("is lost by a name and hull number from the register, in the class that was sent", () => {
    expect(loss.unitType).toBe("navy.surface-combatant");
    expect(US_HULLS.some((row) => row.hull === loss.hull && row.name === loss.name && row.unitType === loss.unitType)).toBe(true);
  });

  it("leaves the deployment and the order of battle", () => {
    const source = after.commitments[DEPLOYMENT]!.source;
    expect(source.kind === "orderOfBattle" && source.count).toBe(7);
    expect(surfaceCount(after)).toBe(surfaceCount(at) - 1);
  });

  it("kills a share of a crew the catalog's size, filed against the population and the war's count", () => {
    expect(loss.killed).toBe(Math.round(300 * LOST_CREW_KILLED));
    expect(week.effects.some((effect) => effect.kind === "populationToll" && effect.nation === USA && effect.deaths === loss.killed)).toBe(true);
    const band = { killed: { low: 10, high: 12 }, wounded: { low: 50, high: 60 }, confidence: "high" as const };
    const bands = withHullDeaths({ aggressor: band, defender: band }, week);
    expect(bands.aggressor?.killed).toEqual({ low: 10 + loss.killed, high: 12 + loss.killed });
    expect(bands.defender).toEqual(band);
  });

  it("is reported by name, and the crew is never named", () => {
    const feed = week.effects.find((effect) => effect.kind === "feed");
    const headline = feed?.kind === "feed" ? feed.items[0]!.headline : "";
    expect(headline).toContain(`USS ${hullDisplayName(loss.name!)} (${loss.hull})`);
    expect(headline).toMatch(/of the crew are killed/);
  });

  it("is decided the same way on every replay", () => {
    expect(hullLossThisWeek(at, war, createRngStreams(campaign.seed))).toEqual(week);
  });

  it("never loses the same name twice", () => {
    const next = firstLoss(after, war, at.turn + 1);
    const again = apply(next.at, { source: "simulate", actor: "world", turn: next.at.turn, narration: { summary: "Another week." }, effects: next.week.effects });
    const names = selectHullLosses(again).map((entry) => entry.hull);
    expect(new Set(names).size).toBe(names.length);
  });
});

describe("a register name in a sentence", () => {
  it("reads initials, suffixes and Mc names the way they are written", () => {
    expect(hullDisplayName("JOHN S MCCAIN")).toBe("John S. McCain");
    expect(hullDisplayName("FRANK E PETERSEN JR")).toBe("Frank E. Petersen Jr.");
    expect(hullDisplayName("CAPE ST GEORGE")).toBe("Cape St. George");
  });
});

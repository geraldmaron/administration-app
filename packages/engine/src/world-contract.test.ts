import { describe, expect, it } from "vitest";
import type { NationId, OrgId } from "@admin/world";
import { buildCampaign, nationB } from "./__fixtures__/campaign.js";
import { foundedForBalance } from "./balance-harness.js";
import { COMMODITY_IDS, selectCommodities } from "./commodities.js";
import { referenceIndex } from "./commodity-registry.js";
import { commodityPhase } from "./commodity-phase.js";
import { apply } from "./effects.js";
import { declaredWarheads } from "./forces.js";
import { succeedAfterDefeat } from "./foreign-politics.js";
import { selectEquityLevel } from "./markets.js";
import { selectMunitions } from "./munitions.js";
import { openingBoard, openingWorld, presetWorld2026 } from "./opening-world.js";
import { createRngStreams } from "./rng.js";
import { createSave, loadSave } from "./save.js";
import { weighDefault } from "./sovereign-default.js";
import { successionOf } from "./succession.js";
import { casualtyBand } from "./war-attrition.js";
import { settlementEffects } from "./war-outcomes.js";
import { willDraw } from "./willingness.js";
import { selectBases } from "./basing.js";
import { openConflict } from "./conflicts.js";
import type { Campaign } from "./state.js";

// What the world contract still promises now that every workstream has filled
// its stub: the board is laid at the seal, a sealed world survives the save,
// a campaign that never wrote a world field reads today's behavior, and the
// four effect kinds replace or seat exactly what they name.

const ALP = nationB.id as NationId;

function packet(campaign: Campaign, effects: Parameters<typeof apply>[1]["effects"]) {
  return apply(campaign, { source: "simulate", actor: "world", turn: campaign.turn, narration: { summary: "The world moves." }, effects });
}

describe("the opening board", () => {
  it("draws the seeded board the seed draws, and the 2026 world as a named preset", () => {
    const { campaign } = foundedForBalance("contract-board");
    for (const seed of ["a", "b", "c", "contract-board"]) {
      expect(openingWorld(campaign.nations, campaign.calendar, seed).conflicts).toEqual(openingBoard(seed, campaign.nations, campaign.calendar));
    }
    const preset = openingWorld(campaign.nations, campaign.calendar, "a", "world-2026");
    expect(preset.conflicts).toEqual(presetWorld2026(campaign.calendar));
  });

  it("is laid onto the seal, and the harness can seal without it", () => {
    const seeded = foundedForBalance("contract-board").campaign;
    expect(Object.keys(seeded.conflicts)).toEqual(openingBoard(seeded.seed, seeded.nations, seeded.calendar).map((war) => war.id));
    const bare = foundedForBalance("contract-board", "democrat", {}, { carriedWorld: false }).campaign;
    expect(bare.conflicts).toEqual({});
    const preset = foundedForBalance("contract-board", "democrat", {}, { openingPreset: "world-2026" }).campaign;
    expect(Object.keys(preset.conflicts)).toEqual(presetWorld2026(preset.calendar).map((war) => war.id));
  });
});

describe("a sealed world through the save", () => {
  it("keeps what the seal wrote: the board, the seats abroad, the inherited commitments and operators", () => {
    const sealed = foundedForBalance("contract-save", "democrat", {}, { openingPreset: "world-2026" }).campaign;
    const restored = loadSave(JSON.parse(JSON.stringify(createSave(sealed))));
    expect(restored.conflicts).toEqual(sealed.conflicts);
    expect(restored.foreignPolitics).toEqual(sealed.foreignPolitics);
    expect(restored.commitments).toEqual(sealed.commitments);
    expect(restored.operators).toEqual(sealed.operators);
  });
});

describe("a campaign that never wrote a world field", () => {
  const campaign = buildCampaign();
  const war = openConflict(ALP, campaign.founding.nation, 1, "A test war.");

  it("reads every market at its founding level", () => {
    expect(selectCommodities(campaign).map((reading) => reading.id)).toEqual([...COMMODITY_IDS]);
    expect(COMMODITY_IDS).toHaveLength(11);
    expect(selectCommodities(campaign).every((reading) => reading.index === referenceIndex(reading.id))).toBe(true);
    expect(selectEquityLevel(campaign)).toBe(1);
  });

  it("carries no settlement and no counted casualties on a running war", () => {
    expect(settlementEffects(campaign, war)).toEqual([]);
    expect(casualtyBand(campaign, war, "defender")).toBeUndefined();
  });

  it("reads munitions at the planning levels, and stores no bases, successor or munitions record", () => {
    expect(campaign.munitions).toBeUndefined();
    expect(selectMunitions(campaign).provenance).toBe("planning value");
    expect(selectBases(campaign)).toEqual([]);
    expect(successionOf(campaign)).toBeUndefined();
  });

  it("changes nothing after a defeat where the government's charter seats nobody", () => {
    expect(succeedAfterDefeat(campaign, ALP)).toBe(campaign);
  });

  it("credits every declared arsenal with its count and an undeclared one with none", () => {
    expect(declaredWarheads(campaign, ALP)).toBe(campaign.nations[ALP]!.stats.military.arsenal.warheads);
    const runtime = campaign.nations[ALP]!;
    const hidden: Campaign = {
      ...campaign,
      nations: {
        ...campaign.nations,
        [ALP]: { ...runtime, stats: { ...runtime.stats, military: { ...runtime.stats.military, arsenal: { ...runtime.stats.military.arsenal, declared: false } } } },
      },
    };
    expect(declaredWarheads(hidden, ALP)).toBeUndefined();
  });

  it("draws a weighed decision's noise from the same stream it always did", () => {
    const expected = createRngStreams(campaign.seed).stream("will", "governor-consent", "CA", "federal").next();
    expect(willDraw(createRngStreams(campaign.seed), "governor-consent", "CA", "federal")).toBe(expected);
  });
});

// Every phase the contract registered is filled now, so none is a no-op; what
// still holds by construction is the shape of the markets week and that the
// President's own government is never weighed for a default.
describe("the world's phases", () => {
  const campaign = buildCampaign();

  it("move the markets a week in one background packet", () => {
    const packets = commodityPhase(campaign);
    expect(packets).toHaveLength(1);
    expect(packets[0]!.background).toBe(true);
    expect(packets[0]!.effects[0]!.kind).toBe("markets");
  });

  it("never weigh the President's own government for a default", () => {
    expect(weighDefault(campaign, campaign.nations[campaign.founding.nation]!)).toBeUndefined();
  });
});

describe("the four new effect kinds", () => {
  const campaign = buildCampaign();

  it("replace the markets and munitions records whole", () => {
    const markets = { commodities: { crude: { index: 1.1, anchorUsd: 69 } }, equity: { level: 1, series: [1] } };
    expect(packet(campaign, [{ kind: "markets", set: markets }]).markets).toEqual(markets);
    const munitions = { us: {}, index: { [ALP]: 0.9 } };
    expect(packet(campaign, [{ kind: "munitions", set: munitions }]).munitions).toEqual(munitions);
  });

  it("seat a leader and file the change, keeping the recent list bounded", () => {
    const seat = { since: campaign.calendar, offset: { aggression: 0.1 }, provenance: "played" as const };
    const change = { nation: ALP, date: campaign.calendar, kind: "election" as const };
    const next = packet(campaign, [{ kind: "leadership", nation: ALP, seat, change }]);
    expect(next.foreignPolitics).toEqual({ seats: { [ALP]: seat }, recent: [change] });
  });

  it("override a nation's authored memberships at runtime, and leave them alone when nothing changes", () => {
    const org = "ORG-TEST" as OrgId;
    const joined = packet(campaign, [{ kind: "membership", nation: ALP, org, change: "accede" }]);
    expect(joined.nations[ALP]!.memberships).toEqual([...campaign.nations[ALP]!.base.memberships, org]);
    const left = packet(joined, [{ kind: "membership", nation: ALP, org, change: "withdraw" }]);
    expect(left.nations[ALP]!.memberships).toEqual(campaign.nations[ALP]!.base.memberships);
  });
});

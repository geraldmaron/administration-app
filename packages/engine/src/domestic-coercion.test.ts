import { describe, expect, it } from "vitest";
import type { StateId } from "@admin/world";
import { foundedForBalance } from "./balance-harness.js";
import { committeeInquiryPhase } from "./committee-inquiry.js";
import {
  COERCION_TEMPO_WEEKS,
  MAX_INCIDENT_ODDS,
  coercedFlag,
  coercionOutcome,
  coercionOutlook,
  recentCoercion,
  surveillanceFlag,
} from "./domestic-coercion.js";
import { apply } from "./effects.js";
import { flagMarker } from "./marked-flags.js";
import { homeActAvailability, localeAct, localeAvailability, takeHomeAct, takeLocaleAct } from "./locale-acts.js";
import type { Campaign } from "./state.js";

const { campaign: base } = foundedForBalance("coercion");
const MN = "MN" as StateId;
const agents = localeAct("agents")!.coercion!;
const troops = localeAct("troops")!.coercion!;

/** A run of earlier acts on the record, each stamped `weeksAgo` before now. */
function withRun(campaign: Campaign, weeksAgo: readonly number[]): Campaign {
  const deeds = weeksAgo.flatMap((ago, index) => {
    const flag = coercedFlag("agents", MN, index);
    return [[flag, true], [flagMarker(flag, campaign.turn - ago), true]] as const;
  });
  return { ...campaign, player: { ...campaign.player, flags: { ...campaign.player.flags, ...Object.fromEntries(deeds) } } };
}

/** The first week from now on whose draw finds an incident, so a test can read what one does. */
function firstIncident(campaign: Campaign, risk = troops): { readonly at: Campaign; readonly outcome: ReturnType<typeof coercionOutcome> } {
  for (let ahead = 0; ahead < 200; ahead++) {
    const at = { ...campaign, turn: campaign.turn + ahead };
    const outcome = coercionOutcome(at, MN, "Minnesota", risk);
    if (outcome.incident) return { at, outcome };
  }
  throw new Error("no incident in 200 weeks; the odds are wrong");
}

describe("force and collection aimed at Americans", () => {
  it("requires an unmodeled federal mission even when unrest is present", () => {
    const act = localeAct("agents")!;
    expect(localeAvailability(base, MN, act, "flood").ok).toBe(false);
    expect(localeAvailability(base, MN, act, "unrest").ok).toBe(false);
  });

  it("leaves a stamped deed on the record that tempo counts back", () => {
    const outcome = coercionOutcome(base, MN, "Minnesota", agents);
    const after = apply(base, { source: "action", actor: "player", turn: base.turn, narration: { summary: "Historical coercive action." }, effects: outcome.effects });
    expect(after.player.flags[coercedFlag("agents", MN, 0)]).toBe(true);
    expect(recentCoercion(after)).toBe(1);
  });

  it("counts the same act taken twice in one week as two, with two draws", () => {
    const historical = (campaign: Campaign) => ({ source: "action" as const, actor: "player" as const, turn: campaign.turn, narration: { summary: "Historical coercive action." }, effects: coercionOutcome(campaign, MN, "Minnesota", agents).effects });
    const once = apply(base, historical(base));
    const twice = apply(once, historical(once));
    expect(recentCoercion(twice)).toBe(2);
    expect(coercionOutlook(twice, agents).odds).toBeGreaterThan(coercionOutlook(once, agents).odds);
  });

  it("forgets an act once it is older than the tempo window", () => {
    expect(recentCoercion(withRun(base, [1, 3]))).toBe(2);
    expect(recentCoercion(withRun(base, [COERCION_TEMPO_WEEKS + 1]))).toBe(0);
  });

  it("raises the odds and the weight with every recent act, up to a cap", () => {
    const calm = coercionOutlook(base, agents);
    const run = coercionOutlook(withRun(base, [1, 2, 3]), agents);
    expect(run.odds).toBeGreaterThan(calm.odds);
    expect(run.severity).toBeGreaterThan(calm.severity);
    expect(coercionOutlook(withRun(base, [1, 2, 3, 4, 5, 6, 7]), troops).odds).toBe(MAX_INCIDENT_ODDS);
  });

  it("charges a run as a pattern from the second act on, before anything goes wrong", () => {
    const first = coercionOutcome(base, MN, "Minnesota", { ...agents, odds: 0 });
    const second = coercionOutcome(withRun(base, [1]), MN, "Minnesota", { ...agents, odds: 0 });
    expect(first.effects.some((effect) => effect.kind === "opinion")).toBe(false);
    expect(second.effects.some((effect) => effect.kind === "opinion" && (effect.deltas.competence ?? 0) < 0)).toBe(true);
  });

  it("draws the same incident for the same week, so the preview's packet is the one committed", () => {
    expect(coercionOutcome(base, MN, "Minnesota", troops)).toEqual(coercionOutcome(base, MN, "Minnesota", troops));
  });

  it("lands an incident as lost trust, a hotter country and less stability", () => {
    const { at, outcome } = firstIncident(base);
    const after = apply(at, { source: "action", actor: "player", turn: at.turn, narration: { summary: outcome.incident! }, effects: outcome.effects });
    const nation = at.founding.nation;
    expect(after.nations[nation]!.stats.politics.protestPressure).toBeGreaterThan(at.nations[nation]!.stats.politics.protestPressure);
    expect(after.player.metrics.stability).toBeLessThan(at.player.metrics.stability);
  });

  it("turns a killing into a story the scandal phase opens", () => {
    for (let ahead = 0; ahead < 400; ahead++) {
      const at = { ...base, turn: base.turn + ahead };
      const outcome = coercionOutcome(at, MN, "Minnesota", troops);
      if (!outcome.incident?.includes("dead")) continue;
      const flags = outcome.effects.flatMap((effect) => (effect.kind === "flag" ? (effect.set ?? []) : []));
      expect(flags.some((flag) => flag.startsWith("scandal:"))).toBe(true);
      return;
    }
    throw new Error("no killing in 400 weeks; the grave share is wrong");
  });

  it("puts surveillance of a state's residents before a hostile intelligence committee, and only a hostile one", () => {
    const watched = (disposition: number): Campaign => ({
      ...base,
      congress: { ...base.congress, disposition },
      player: { ...base.player, flags: { ...base.player.flags, [surveillanceFlag(MN)]: true } },
    });
    const opened = (campaign: Campaign) =>
      committeeInquiryPhase(campaign)
        .flatMap((packet) => packet.effects)
        .flatMap((effect) => (effect.kind === "oversight" ? (effect.matters ?? []) : []));
    expect(opened(watched(0.1))[0]?.origin).toMatchObject({ kind: "committee", committee: "CMTE-INTEL" });
    expect(opened(watched(0.95)).some((matter) => matter.origin.kind === "committee" && matter.origin.committee === "CMTE-INTEL")).toBe(false);
  });

  it("cannot bypass the authority boundary through an unprompted entry point", () => {
    for (const id of ["agents", "troops"] as const) {
      const result = takeHomeAct(base, MN, id);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toContain("doesn't include");
    }
    expect(coercionOutlook(base, agents, false).odds).toBeGreaterThan(coercionOutlook(base, agents).odds);
  });

  it("keeps unsupported troop action unavailable without manufacturing authority", () => {
    expect(homeActAvailability(base, MN, localeAct("troops")!).ok).toBe(false);
    expect(homeActAvailability(base, MN, localeAct("relief")!).ok).toBe(false);
  });

  it("refuses resident surveillance with and without unrest before obligating funds or filing a report", () => {
    for (const result of [takeLocaleAct(base, MN, "surveil", "unrest"), takeHomeAct(base, MN, "surveil")]) {
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toContain("Attorney General");
    }
    expect(homeActAvailability(base, MN, localeAct("surveil")!).ok).toBe(false);
  });
});

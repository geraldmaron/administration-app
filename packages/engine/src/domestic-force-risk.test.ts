import { describe, expect, it } from "vitest";
import type { StateId } from "@admin/world";
import { foundedForBalance } from "./balance-harness.js";
import { apply, type EffectPacket } from "./effects.js";
import { createRngStreams, makeCampaignSeed } from "./rng.js";
import type { Campaign, NationCondition } from "./state.js";
import type { CourtProceeding } from "./state-judiciary.js";
import { localeAct, localeActCost, localeAvailability, playerCharter, priorityDirectiveId } from "./locale-acts.js";
import { takeLocaleAct } from "./locale-act-effects.js";
import { federalServiceGround, insurrectionGrounds, LOCALE_REFUSALS, liveLocaleMissions } from "./locale-missions.js";
import { commitmentPhase, MISSION_MINIMUM_WEEKS, setCommitmentStatus } from "./commitments.js";
import { rescindOrder } from "./order-lifecycle.js";
import { domesticBrigadeWeek, domesticGuardWeek } from "./force-costs.js";
import { missionInterimRelief } from "./mission-interim-relief.js";
import { courtApplicationOutcome, courtApplications, courtOrderStatus, type CourtOrderOutcome } from "./court-order-records.js";
import { courtOrderProjection, courtOrderRulingEffects, requestCourtOrder } from "./court-orders.js";

// The risks the domestic-force acts were planned against: stacked missions,
// unreachable or always-open predicates, prices that bias one path, a court's
// answer read early, and the bills a lapse or a quick rescission leaves.

const { campaign: founded } = foundedForBalance("domestic-force-risk");
const base: Campaign = { ...founded, turn: 5 };
const MN = "MN" as StateId;
const WI = "WI" as StateId;

const at = (campaign: Campaign, turn: number): Campaign => ({ ...campaign, turn });
const run = (campaign: Campaign, packets: readonly EffectPacket[]): Campaign => packets.reduce((state, packet) => apply(state, packet), campaign);

function withGovernor(campaign: Campaign, state: StateId, disposition: number): Campaign {
  const runtime = campaign.states[state]!;
  return { ...campaign, states: { ...campaign.states, [state]: { ...runtime, governor: { ...runtime.governor!, disposition } } } };
}

/** Unrest placed in Minnesota, or national with no state, and Minnesota's governor at the given disposition. */
function withUnrest(campaign: Campaign, severity: number, disposition = 0.3, placed = true): Campaign {
  const unrest = { id: `condition:unrest:USA:${placed ? "mn" : "nation"}`, nation: campaign.founding.nation, kind: "unrest", scope: "nation",
    ...(placed ? { state: MN } : {}), severity, startedTurn: campaign.turn, status: "active", beats: [] } as unknown as NationCondition;
  return withGovernor({ ...campaign, conditions: { ...campaign.conditions, [unrest.id]: unrest } }, MN, disposition);
}

function withInsurgency(campaign: Campaign, pressure: number): Campaign {
  const us = campaign.nations[campaign.founding.nation]!;
  return { ...campaign, nations: { ...campaign.nations, [campaign.founding.nation]: { ...us,
    stats: { ...us.stats, security: { ...us.stats.security, insurgencyPressure: pressure } } } } };
}

function take(campaign: Campaign, state: StateId, act: Parameters<typeof takeLocaleAct>[2]): Campaign {
  const result = takeLocaleAct(campaign, state, act, "unrest");
  if (!result.ok) throw new Error(`${act}: ${result.reason}`);
  return apply(campaign, result.packet);
}

function refusal(campaign: Campaign, state: StateId, act: Parameters<typeof takeLocaleAct>[2]): string {
  const result = takeLocaleAct(campaign, state, act, "unrest");
  return result.ok ? "" : result.reason;
}

const missionCommitment = (campaign: Campaign) => Object.values(campaign.commitments).find((entry) => entry.authorizedBy)!;
const phaseTreasury = (campaign: Campaign) => commitmentPhase(campaign).flatMap((packet) => packet.effects)
  .reduce((sum, effect) => sum + (effect.kind === "metric" ? effect.deltas.treasury ?? 0 : 0), 0);
const phaseStanding = (campaign: Campaign) => commitmentPhase(campaign).flatMap((packet) => packet.effects)
  .reduce((sum, effect) => sum + (effect.kind === "metric" ? effect.deltas.standing ?? 0 : 0), 0);

describe("what domestic force costs", () => {
  it("bills the Guard at CBO's rate and active-duty troops at the border deployment's", () => {
    expect(domesticGuardWeek()).toBeCloseTo(13.45, 1);
    expect(domesticBrigadeWeek()).toBeCloseTo(14.53, 1);
    expect(localeAct("federalize")!.commitment!.amountPerTurn).toBe(domesticGuardWeek());
    expect(localeAct("troops")!.commitment!.amountPerTurn).toBe(domesticBrigadeWeek());
  });

  it("prices asking a governor for the Guard as the same call-up for the same eight weeks", () => {
    const asked = localeActCost(base, localeAct("request-deployment")!);
    expect(Math.abs(asked - 8 * domesticGuardWeek()) / (8 * domesticGuardWeek())).toBeLessThan(0.02);
  });
});

describe("which Insurrection Act occasions national unrest can open", () => {
  it("reads §252 and §253 only off unrest placed in the state, and §251 off any that reaches it", () => {
    const national = insurrectionGrounds(withUnrest(base, 0.7, 0.3, false), MN);
    expect(national["253"]).toBe(false);
    expect(national["252"]).toBe(false);
    expect(insurrectionGrounds(withUnrest(base, 0.7, 0.7, false), MN)["251"]).toBe(true);
    expect(insurrectionGrounds(withUnrest(base, 0.7, 0.3), MN)["253"]).toBe(true);
  });
});

describe("an immigration operation is a mission a court can enforce", () => {
  it("runs eight weeks as a live mission and supplies the federal law an injunction enforces", () => {
    const unrest = withUnrest(base, 0.6);
    const taken = take(unrest, MN, "immigration-operation");
    expect(liveLocaleMissions(taken, MN).some((mission) => mission.act === "immigration-operation")).toBe(true);
    expect(liveLocaleMissions(at(taken, base.turn + 7), MN).some((mission) => mission.act === "immigration-operation")).toBe(true);
    expect(liveLocaleMissions(at(taken, base.turn + 8), MN).some((mission) => mission.act === "immigration-operation")).toBe(false);
    expect(courtOrderProjection(taken, MN, "injunction-enforcement").availability.ok).toBe(true);
  });
});

describe("the Guard follows the regular forces, never beside them", () => {
  /** A §253 proclamation one week, troops the next. */
  function troopsSent(campaign: Campaign): Campaign {
    const proclaimed = take(campaign, MN, "proclaim");
    return take(at(proclaimed, campaign.turn + 1), MN, "troops");
  }

  it("opens §12406(3) only after troops have been on the mission two weeks with the unrest unbroken", () => {
    const unrest = withUnrest(base, 0.65);
    expect(federalServiceGround(unrest, MN)).toBeUndefined();
    const sent = troopsSent(unrest);
    expect(federalServiceGround(sent, MN)).toBeUndefined();
    expect(refusal(at(sent, base.turn + 2), MN, "federalize")).toContain("§12406(3)");
    const twoWeeks = at(sent, base.turn + 3);
    expect(federalServiceGround(twoWeeks, MN)).toBe("regular-forces");
    expect(takeLocaleAct(twoWeeks, MN, "federalize", "unrest").ok).toBe(true);
    const calmer = { ...twoWeeks, conditions: { ...twoWeeks.conditions,
      "condition:unrest:USA:mn": { ...twoWeeks.conditions["condition:unrest:USA:mn"]!, severity: 0.45 } } };
    expect(federalServiceGround(calmer, MN)).toBeUndefined();
  });

  it("refuses a second troop mission, a second federalization, and both in one week", () => {
    const rebellion = withInsurgency(withUnrest(base, 0.65), 0.25);
    const sent = troopsSent(rebellion);
    expect(refusal(sent, MN, "federalize")).toContain(LOCALE_REFUSALS.stacked);
    expect(refusal(at(sent, base.turn + 2), MN, "troops")).toContain(LOCALE_REFUSALS.stacked);
    const guard = take(rebellion, MN, "federalize");
    expect(refusal(at(guard, base.turn + 1), MN, "federalize")).toContain(LOCALE_REFUSALS.stacked);
  });
});

describe("an investigative priority is kept per state", () => {
  it("carries two states in one week, refuses the same state twice, and is not blocked by a court application", () => {
    const unrest = withUnrest(base, 0.6, 0.3, false);
    const first = take(unrest, MN, "priority");
    const second = take(first, WI, "priority");
    expect(second.directives?.[priorityDirectiveId(base.turn, MN)]?.status).toBe("carried");
    expect(second.directives?.[priorityDirectiveId(base.turn, WI)]?.status).toBe("carried");
    expect(refusal(second, MN, "priority")).toContain("for this state");
    const applied = requestCourtOrder(withUnrest(base, 0.6), MN, "search-warrant");
    if (!applied.ok) throw new Error(applied.reason);
    const filed = apply(withUnrest(base, 0.6), applied.packet);
    expect(takeLocaleAct(filed, MN, "priority", "unrest").ok).toBe(true);
  });
});

describe("a mission's bill", () => {
  const guarded = take(withInsurgency(withUnrest(base, 0.6), 0.25), MN, "federalize");
  const commitment = missionCommitment(guarded);
  const recordId = commitment.authorizedBy!;
  const amount = commitment.resource.amountPerTurn;

  function rescinded(campaign: Campaign): Campaign {
    const result = rescindOrder(campaign, recordId);
    if (!result.ok) throw new Error(result.reason);
    return apply(campaign, result.packet);
  }

  it("charges the two-week minimum when the President rescinds inside it, and nothing past it", () => {
    expect(MISSION_MINIMUM_WEEKS).toBe(2);
    const kept = phaseTreasury(guarded);
    expect(Math.abs(phaseTreasury(rescinded(guarded)) - kept + amount)).toBeLessThanOrEqual(1);
    const second = at(guarded, base.turn + 1);
    expect(Math.abs(phaseTreasury(rescinded(second)) - phaseTreasury(second))).toBeLessThanOrEqual(1);
    const third = at(guarded, base.turn + 2);
    expect(Math.abs(phaseTreasury(rescinded(third)) - phaseTreasury(third) - amount)).toBeLessThanOrEqual(1);
  });

  it("owes nothing past the stop when a court enjoins the order", () => {
    const record = guarded.orders.find((entry) => entry.id === recordId)!;
    const enjoined: CourtProceeding = { id: `case:${recordId}`, subject: { kind: "executive-order", recordId, orderId: record.order },
      filedTurn: guarded.turn, stage: "lower-merits", nextTurn: guarded.turn + 20, interim: "order-enjoined", history: [] };
    const suspended = { ...guarded, judiciary: { ...guarded.judiciary, proceedings: [...(guarded.judiciary.proceedings ?? [])
      .filter((entry) => entry.id !== enjoined.id), enjoined] } };
    expect(Math.abs(phaseTreasury(suspended) - phaseTreasury(guarded) - amount)).toBeLessThanOrEqual(1);
    expect(run(suspended, commitmentPhase(suspended)).commitments[commitment.id]!.status).toBe("wound-down");
  });

  it("refuses to wind the forces down by hand", () => {
    const result = setCommitmentStatus(guarded, commitment.id, "wound-down", "Done.");
    expect(result.ok ? "" : result.reason).toBe("Rescind the order that sent them.");
  });

  it("buys no kept-promise standing for forces sent into a state", () => {
    const before = withInsurgency(withUnrest(base, 0.6), 0.25);
    expect(phaseStanding(guarded)).toBe(phaseStanding(before));
  });
});

describe("a lapse in appropriations", () => {
  it("does not stop force sent to protect life and property, nor its weekly bill", () => {
    const unrest = withInsurgency(withUnrest(base, 0.6, 0.7), 0.25);
    const lapsed = { ...unrest, congress: { ...unrest.congress, appropriation: { ...unrest.congress.appropriation, throughTurn: unrest.turn - 3 } } };
    for (const act of ["federalize", "immigration-operation", "task-force", "property-surge"] as const) {
      expect(takeLocaleAct(lapsed, MN, act, "unrest").ok, act).toBe(true);
    }
    expect(localeAvailability(lapsed, MN, localeAct("waiver")!, "unrest").ok).toBe(false);
  });
});

describe("a court's answer is not on the record before the court gives it", () => {
  const unrest = withUnrest(base, 0.6);

  it("leaves no outcome in any flag until the ruling week, then stamps it", () => {
    const result = requestCourtOrder(unrest, MN, "search-warrant");
    if (!result.ok) throw new Error(result.reason);
    const filed = apply(unrest, result.packet);
    const pending = courtOrderStatus(filed, MN, "search-warrant")!;
    const leaked = (campaign: Campaign) => Object.keys(campaign.player.flags).some((key) => /granted|narrowed|denied/.test(key));
    expect(leaked(filed)).toBe(false);
    expect(courtOrderStatus(at(filed, pending.decideTurn), MN, "search-warrant")!.status).toBe("pending");
    const eve = at(filed, pending.decideTurn - 1);
    const ruled = at(apply(eve, { source: "simulate", actor: "world", turn: pending.decideTurn,
      narration: { summary: "The court rules." }, effects: courtOrderRulingEffects(eve) }), pending.decideTurn);
    expect(leaked(ruled)).toBe(true);
    expect(["granted", "narrowed", "denied"]).toContain(courtOrderStatus(ruled, MN, "search-warrant")!.status);
  });

  it("draws the same answers as a draw against the unrounded odds, within two points over 40 seeds", () => {
    const counts = { stored: { granted: 0, narrowed: 0, denied: 0 }, exact: { granted: 0, narrowed: 0, denied: 0 } };
    for (let index = 0; index < 40; index++) {
      const seeded = { ...unrest, seed: makeCampaignSeed(`court-draw-${index}`) };
      const result = requestCourtOrder(seeded, MN, "title-iii-order");
      if (!result.ok || !result.filed) throw new Error("the application was not filed");
      const application = courtApplications(apply(seeded, result.packet), MN)[0]!;
      counts.stored[courtApplicationOutcome(seeded, application)] += 1;
      const odds = courtOrderProjection(seeded, MN, "title-iii-order").odds;
      const draw = createRngStreams(seeded.seed).stream("court-order", "title-iii-order", MN, seeded.turn).next();
      const exact: CourtOrderOutcome = draw < odds.granted ? "granted" : draw < odds.granted + odds.narrowed ? "narrowed" : "denied";
      counts.exact[exact] += 1;
    }
    for (const outcome of ["granted", "narrowed", "denied"] as const) {
      expect(Math.abs(counts.stored[outcome] - counts.exact[outcome]) / 40).toBeLessThanOrEqual(0.02);
    }
  });
});

describe("interim relief against a mission", () => {
  it("adds the state's own injury only where the governor withheld assent", () => {
    const charter = playerCharter(base)!;
    const subject = { kind: "locale-mission" as const, state: MN, act: "task-force" as const };
    const record = { id: "order-joint-task-force:MN", order: "order-joint-task-force", subject };
    const opposed = missionInterimRelief(withGovernor(base, MN, 0.3), charter, record, undefined, true)!;
    const assenting = missionInterimRelief(withGovernor(base, MN, 0.7), charter, record, undefined, true)!;
    expect(opposed.statePlaintiff).toBe(true);
    expect(assenting.statePlaintiff).toBe(false);
    expect(assenting.chance).toBeLessThan(opposed.chance);
    expect(assenting.chance).toBeLessThanOrEqual(0.15);
  });
});

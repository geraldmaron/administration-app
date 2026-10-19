import { describe, expect, it } from "vitest";
import { buildCampaign } from "./__fixtures__/campaign.js";
import { apply } from "./effects.js";
import { deriveImplementationQuality, institutionDef, institutionPhase, institutionTick } from "./institutions.js";
import { projectPassage } from "./bill-stages.js";
import { legislationPhase, signBill } from "./legislation.js";
import { billsOnTheAgenda } from "./legislation.js";
import { CONTINUING_RESOLUTION_TURNS, legislativeAct } from "./legislative-acts.js";
import {
  FUNDED_BUDGET_ADEQUACY,
  LAPSE_BUDGET_FLOOR,
  SHUTDOWN_GRACE_TURNS,
  inShutdown,
  lapsedBudgetAdequacy,
  openLapse,
  unfundedTurns,
} from "./funding.js";
import { LAPSE_STABILITY_COST, selectShutdown, shutdownPhase } from "./shutdown.js";
import { congressPhase } from "./congress.js";
import type { Bill, Campaign } from "./state.js";

/** A campaign whose appropriation ran out `weeks` ago and was never replaced. */
function unfunded(campaign: Campaign, weeks: number): Campaign {
  return {
    ...campaign,
    congress: {
      ...campaign.congress,
      appropriation: {
        enactedTurn: campaign.turn - 52,
        throughTurn: campaign.turn - weeks,
        onPriorYear: true, priorYear: [],
      },
    },
  };
}

/** Run the phase and fold whatever it produced, the way the turn loop does. */
function run(campaign: Campaign): Campaign {
  return shutdownPhase(campaign).reduce((acc, packet) => apply(acc, packet), campaign);
}

describe("whether the government is funded", () => {
  it("counts nothing while the appropriation still runs", () => {
    const campaign = buildCampaign();
    expect(unfundedTurns(campaign)).toBe(0);
    expect(inShutdown(campaign)).toBe(false);
  });

  it("gives Congress the grace weeks before anything closes", () => {
    const campaign = unfunded(buildCampaign(), SHUTDOWN_GRACE_TURNS);
    expect(unfundedTurns(campaign)).toBe(SHUTDOWN_GRACE_TURNS);
    expect(inShutdown(campaign)).toBe(false);
    expect(selectShutdown(campaign)).toBeUndefined();
  });

  it("closes the government the week after the grace runs out", () => {
    const campaign = unfunded(buildCampaign(), SHUTDOWN_GRACE_TURNS + 1);
    expect(inShutdown(campaign)).toBe(true);
  });
});

describe("the lapse", () => {
  it("opens a record, charges an order of magnitude above the prior-year friction, and names what closed", () => {
    const campaign = unfunded(buildCampaign(), SHUTDOWN_GRACE_TURNS + 1);
    const [packet] = shutdownPhase(campaign);
    expect(packet).toBeDefined();
    const metric = packet!.effects.find((effect) => effect.kind === "metric");
    expect(metric).toEqual({ kind: "metric", deltas: { stability: -LAPSE_STABILITY_COST } });
    // The prior-year friction congressPhase charges is 0.004 a week; a closed
    // government is ten times it, which is the whole point of the distinction.
    expect(LAPSE_STABILITY_COST).toBeCloseTo(0.004 * 10, 6);
    const feed = packet!.effects.find((effect) => effect.kind === "feed");
    expect(feed).toBeDefined();
    expect(JSON.stringify(feed)).toMatch(/Defense/);

    const next = apply(campaign, packet!);
    expect(openLapse(next)?.begunTurn).toBe(campaign.turn);
  });

  it("keeps charging while it runs and does not open a second record", () => {
    let state = unfunded(buildCampaign(), SHUTDOWN_GRACE_TURNS + 1);
    state = run(state);
    const opened = state.lapses.length;
    state = run({ ...state, turn: state.turn + 1 });
    expect(state.lapses.length).toBe(opened);
    expect(selectShutdown(state)?.weeks).toBe(2);
    expect(selectShutdown(state)?.days).toBe(14);
  });

  it("ends the moment the appropriation reaches past the turn, and says who ended it", () => {
    let state = run(unfunded(buildCampaign(), SHUTDOWN_GRACE_TURNS + 1));
    expect(inShutdown(state)).toBe(true);
    // A stopgap: the date moves, the prior-year footing does not.
    state = {
      ...state,
      congress: {
        ...state.congress,
        appropriation: { ...state.congress.appropriation, throughTurn: state.turn + CONTINUING_RESOLUTION_TURNS },
      },
    };
    expect(inShutdown(state)).toBe(false);
    expect(selectShutdown(state)).toBeUndefined();

    state = run(state);
    expect(openLapse(state)).toBeUndefined();
    expect(state.lapses[0]?.endedBy).toBe("continuing-resolution");
    expect(state.lapses[0]?.endedTurn).toBeDefined();
  });

  it("records a full appropriation as the other way out", () => {
    let state = run(unfunded(buildCampaign(), SHUTDOWN_GRACE_TURNS + 1));
    state = {
      ...state,
      congress: {
        ...state.congress,
        appropriation: { enactedTurn: state.turn, throughTurn: state.turn + 52, onPriorYear: false, priorYear: [] },
      },
    };
    state = run(state);
    expect(state.lapses[0]?.endedBy).toBe("appropriation");
  });

  it("does nothing at all in a funded week", () => {
    expect(shutdownPhase(buildCampaign())).toEqual([]);
  });
});

describe("what the lapse does to the executive branch", () => {
  it("drives an agency's money down toward the floor and gives it back when funded", () => {
    const lapsedOnce = lapsedBudgetAdequacy(FUNDED_BUDGET_ADEQUACY, false, true);
    expect(lapsedOnce).toBeLessThan(FUNDED_BUDGET_ADEQUACY);
    let value = FUNDED_BUDGET_ADEQUACY;
    for (let week = 0; week < 20; week += 1) value = lapsedBudgetAdequacy(value, false, true);
    expect(value).toBe(LAPSE_BUDGET_FLOOR);
    expect(lapsedBudgetAdequacy(value, false, false)).toBeGreaterThan(value);
  });

  it("lets an insulated body ride it at half", () => {
    let executive = FUNDED_BUDGET_ADEQUACY;
    let insulated = FUNDED_BUDGET_ADEQUACY;
    for (let week = 0; week < 20; week += 1) {
      executive = lapsedBudgetAdequacy(executive, false, true);
      insulated = lapsedBudgetAdequacy(insulated, true, true);
    }
    expect(insulated).toBeGreaterThan(executive);
    // Half the fall, not none of it: independence buys a body a share of the
    // shutdown, never an exemption from it.
    expect(FUNDED_BUDGET_ADEQUACY - insulated).toBeCloseTo((FUNDED_BUDGET_ADEQUACY - executive) / 2, 6);
  });

  it("never lowers a body that was already funded above the settled level", () => {
    expect(lapsedBudgetAdequacy(0.95, false, false)).toBe(0.95);
  });

  it("collapses what a department can actually deliver", () => {
    const campaign = buildCampaign();
    const def = institutionDef("INST-DOD")!;
    const runtime = campaign.institutions[def.id]!;
    const funded = institutionTick(runtime, def, 7, false);
    const lapsed = institutionTick(runtime, def, 7, true);
    expect(lapsed.changes.implementationQuality!).toBeLessThan(funded.changes.implementationQuality!);
    expect(lapsed.changes.budgetAdequacy!).toBeLessThan(runtime.budgetAdequacy);
  });

  it("tells the branch's own week apart from an ordinary one", () => {
    const closed = unfunded(buildCampaign(), SHUTDOWN_GRACE_TURNS + 1);
    const [packet] = institutionPhase(closed);
    expect(packet!.narration.summary).toMatch(/without an appropriation/);
  });
});

describe("the continuing resolution as a bill somebody has to pass", () => {
  it("stays off the agenda while the money is not running out", () => {
    const campaign = buildCampaign();
    expect(billsOnTheAgenda(campaign).map((act) => act.id)).not.toContain("act-continuing-resolution");
  });

  it("arises the moment the government is on the prior year and the date is close", () => {
    const campaign = unfunded(buildCampaign(), 1);
    expect(billsOnTheAgenda(campaign).map((act) => act.id)).toContain("act-continuing-resolution");
  });

  it("jumps the origination cadence, because a stopgap does not wait for a session", () => {
    const campaign = {
      ...unfunded(buildCampaign(), 1),
      congress: { ...unfunded(buildCampaign(), 1).congress, disposition: 0.75 },
    };
    const packets = legislationPhase(campaign);
    const bills = packets
      .flatMap((packet) => packet.effects)
      .flatMap((effect) => (effect.kind === "bill" ? [effect.set] : []));
    expect(bills.map((bill) => bill.act)).toContain("act-continuing-resolution");
  });

  it("funds six more weeks when it is signed, without pretending a budget passed", () => {
    const base = unfunded(buildCampaign(), 1);
    const act = legislativeAct("act-continuing-resolution")!;
    const bill: Bill = {
      id: "bill:cr:1",
      act: act.id,
      title: act.title,
      sponsor: act.sponsor,
      introducedTurn: base.turn,
      status: "on-the-desk",
      passage: projectPassage(base, act),
    };
    const campaign: Campaign = { ...base, bills: { ...base.bills, [bill.id]: bill } };
    const signed = signBill(campaign, bill.id);
    expect(signed.ok).toBe(true);
    const next = apply(campaign, signed.ok ? signed.packet : ({} as never));
    expect(next.congress.appropriation.throughTurn).toBe(campaign.turn + CONTINUING_RESOLUTION_TURNS);
    // Six weeks of government at last year's numbers is still last year's
    // numbers: the friction continues and the appropriation is still nobody's.
    expect(next.congress.appropriation.onPriorYear).toBe(true);
    const friction = congressPhase(next)
      .flatMap((packet) => packet.effects)
      .find((effect) => effect.kind === "metric");
    expect(friction).toEqual({ kind: "metric", deltas: { stability: -0.004 } });
  });

  it("charges the treasury nothing, because a stopgap appropriates nothing new", () => {
    const act = legislativeAct("act-continuing-resolution")!;
    expect(act.treasuryOfGdp).toBeUndefined();
    expect(act.raisesCap).toBeUndefined();
    expect(act.cost).toEqual({});
  });
});

describe("delivery under a lapse", () => {
  it("is the same derivation as any other week, with the money missing", () => {
    const campaign = buildCampaign();
    const def = institutionDef("INST-DOD")!;
    const runtime = campaign.institutions[def.id]!;
    const starved = deriveImplementationQuality({ ...runtime, budgetAdequacy: LAPSE_BUDGET_FLOOR }, def);
    expect(starved).toBeLessThan(deriveImplementationQuality(runtime, def));
  });
});

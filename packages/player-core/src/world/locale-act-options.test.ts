import { describe, expect, it } from "vitest";
import {
  GOVERNOR_ASSENT_FLOOR,
  LOCALE_ACTS,
  LOCALE_REFUSALS,
  apply,
  courtOrderDecideTurn,
  flagMarker,
  courtRulingFlag,
  localeActPrice,
  localeActProjection,
  makeCampaignSeed,
  type Campaign,
  type EffectPacket,
  type NationCondition,
} from "@admin/engine";
import type { StateId } from "@admin/world";
import { buildModelingAct } from "../modeling/acts";
import { openingCampaign } from "../__fixtures__/opening";
import {
  formatWeeklyBill,
  homeActOptions,
  localeActOptions,
  localeMatters,
  localeMissions,
  localeWaiting,
  openLocaleActCount,
} from "./locale-act-options";

const base = openingCampaign();
const CO = "CO" as StateId;
const claim = { signature: "relief:wildfire", openedTurn: base.turn, expiresTurn: base.turn + 5, weight: 0.5, reason: "Colorado asked Washington for help with the fire." };

function colorado(patch: Partial<Campaign["states"]["CO"] & object> = {}): Campaign {
  return { ...base, states: { ...base.states, CO: { ...base.states.CO!, claims: [claim], ...patch } } };
}

function withGovernor(campaign: Campaign, disposition: number): Campaign {
  const co = campaign.states.CO!;
  return { ...campaign, states: { ...campaign.states, CO: { ...co, governor: { ...co.governor!, disposition } } } };
}

/** Unrest at home, placed in one state or, with no state, national. */
function withUnrest(campaign: Campaign, severity: number, state?: StateId): Campaign {
  const unrest = { id: `condition:unrest:USA:${state ?? "nation"}`, nation: campaign.founding.nation, kind: "unrest", scope: "nation",
    ...(state ? { state } : {}), severity, startedTurn: campaign.turn, status: "active", beats: [] } as unknown as NationCondition;
  return { ...campaign, conditions: { ...campaign.conditions, [unrest.id]: unrest } };
}

const packetStanding = (packet: EffectPacket): number =>
  packet.effects.reduce((sum, effect) => (effect.kind === "metric" ? sum + (effect.deltas.standing ?? 0) : sum), 0);

describe("localeMatters", () => {
  it("lists a governor's open request as a matter, with its clock", () => {
    const matters = localeMatters(colorado(), CO);
    expect(matters).toHaveLength(1);
    expect(matters[0]).toMatchObject({ cause: "wildfire", request: { weeksLeft: 5, weight: 0.5 } });
  });

  it("has nothing to answer in a state that is quiet", () => {
    expect(localeMatters(base, CO)).toEqual([]);
  });

  it("lists national unrest in every state it reaches, with no claim open", () => {
    const national = withUnrest(base, 0.45);
    for (const state of ["CO", "TX", "ME"] as StateId[]) {
      expect(localeMatters(national, state)).toEqual([expect.objectContaining({ cause: "unrest", severity: 0.45 })]);
    }
  });

  it("reads the unrest placed in the state over the national one", () => {
    const both = withUnrest(withUnrest(base, 0.3), 0.6, CO);
    expect(localeMatters(both, CO).filter((matter) => matter.cause === "unrest")).toEqual([expect.objectContaining({ severity: 0.6 })]);
  });
});

describe("localeActOptions", () => {
  const campaign = colorado();
  const options = localeActOptions(campaign, CO, "wildfire");
  const unrestCampaign = withGovernor(withUnrest(campaign, 0.55, CO), 0.3);
  const unrest = localeActOptions(unrestCampaign, CO, "unrest");

  it("offers a disaster only the relief acts and the governor's own Guard, in the engine's order", () => {
    expect(options.map((option) => option.id)).toEqual(
      LOCALE_ACTS.filter((act) => act.group === "relief" || act.id === "request-deployment").map((act) => act.id));
  });

  it("offers force and collection against unrest, but never the immigration operation", () => {
    expect(unrest.map((option) => option.id)).toEqual(LOCALE_ACTS.filter((act) => act.id !== "immigration-operation").map((act) => act.id));
    expect(unrest.find((option) => option.id === "property-surge")!.risk?.odds).toBeGreaterThan(0);
    expect(options.some((option) => option.risk)).toBe(false);
  });

  it("locks each force act on its statute's own refusal, with no packet to commit", () => {
    const refusals = { federalize: LOCALE_REFUSALS.federalize, proclaim: LOCALE_REFUSALS.proclaim, troops: LOCALE_REFUSALS.troops } as const;
    for (const [id, missing] of Object.entries(refusals)) {
      const option = unrest.find((entry) => entry.id === id)!;
      expect(option.locked).toBe(`This needs ${missing}.`);
      expect(option.packet).toBeUndefined();
      expect(buildModelingAct(unrestCampaign, { act: "locale", state: CO, cause: "unrest", option: id }).ok).toBe(false);
    }
  });

  it("says why surveillance cannot be ordered, with the law and the lawful act beside it", () => {
    const surveil = unrest.find((option) => option.id === "surveil")!;
    expect(surveil.packet).toBeUndefined();
    expect(surveil.refusedByLaw).toEqual({ reason: `This needs ${LOCALE_REFUSALS.surveil}.`, neighbor: "priority" });
    expect(surveil.refusedByLaw!.reason).toContain("50 U.S.C. §1812");
    expect(unrest.find((option) => option.id === "surveil-under-order")!.locked).toBe(`This needs ${LOCALE_REFUSALS["surveil-under-order"]}.`);
  });

  it("prices every act at the engine's own price for it, open or locked", () => {
    for (const [campaignAt, list] of [[campaign, options], [unrestCampaign, unrest]] as const) {
      for (const option of list) {
        const price = localeActPrice(campaignAt, CO, LOCALE_ACTS.find((act) => act.id === option.id)!);
        expect(option.cost).toBe(Math.abs(price.treasury ?? 0));
        expect(option.standing).toBe(Math.abs(price.standing ?? 0));
      }
    }
  });

  it("shows the act's own standing whatever the suit's draw does to the packet", () => {
    let contested = 0;
    for (let index = 0; index < 40; index += 1) {
      const seeded = { ...unrestCampaign, seed: makeCampaignSeed(`locale-litigation-${index}`) };
      const surge = localeActOptions(seeded, CO, "unrest").find((option) => option.id === "property-surge")!;
      const price = localeActPrice(seeded, CO, LOCALE_ACTS.find((act) => act.id === "property-surge")!);
      expect(surge.standing).toBe(Math.abs(price.standing ?? 0));
      if (surge.packet && Math.abs(packetStanding(surge.packet)) > surge.standing + 1e-9) contested += 1;
    }
    expect(contested).toBeGreaterThan(0);
  });

  it("shows the suit as the odds the signature is drawn against", () => {
    const surge = unrest.find((option) => option.id === "property-surge")!;
    const projection = localeActProjection(unrestCampaign, CO, "property-surge", "unrest");
    expect(surge.litigation).toMatchObject({
      filingChance: projection.order!.projection.challengeChance,
      meritsChance: projection.order!.projection.meritsChance,
      reasoning: projection.order!.projection.reasoning,
      interimRelief: projection.interimRelief!.chance,
    });
    expect(surge.authority).toMatchObject({ cite: "40 U.S.C. §1315", recordId: "federal-property-protection" });
    expect(surge.eases).toMatchObject({ attention: 0.5, weeks: 6 });
    expect(surge.eases!.protest).toBeLessThan(0);
    expect(surge.gates).toEqual(projection.gates);
  });

  it("states the Guard's weekly bill to the tenth of a million and the troops' step after the proclamation", () => {
    const federalize = unrest.find((option) => option.id === "federalize")!;
    expect(federalize.commitment).toMatchObject({ weeklyText: "$13.5M", weeks: 8 });
    const troops = unrest.find((option) => option.id === "troops")!;
    expect(troops.commitment).toMatchObject({ forcesText: "1 brigade combat team", weeklyText: "$14.5M" });
    expect(troops.step?.after).toBe("proclaim");
    expect(troops.authority?.recordId).toBe("insurrection-act");
  });

  it("answers the request through the federalized Guard only where the governor assents", () => {
    const asked = (disposition: number) => withGovernor({ ...unrestCampaign, states: { ...unrestCampaign.states,
      CO: { ...unrestCampaign.states.CO!, claims: [{ ...claim, signature: "relief:unrest" }] } } }, disposition);
    const federalize = (c: Campaign) => localeActOptions(c, CO, "unrest").find((option) => option.id === "federalize")!;
    expect(federalize(asked(GOVERNOR_ASSENT_FLOOR - 0.1)).answers).toBe(false);
    expect(federalize(asked(0.9)).answers).toBe(true);
  });

  it("charges exactly the cost it showed once the packet is applied", () => {
    const relief = options.find((option) => option.id === "relief")!;
    const after = apply(campaign, relief.packet!);
    expect(campaign.player.metrics.treasury - after.player.metrics.treasury).toBeCloseTo(relief.cost, 6);
    expect(after.states.CO!.claims.some((entry) => entry.signature === "relief:wildfire")).toBe(false);
  });

  it("says relief answers the request, and a review defers it", () => {
    expect(options.find((option) => option.id === "relief")).toMatchObject({ answers: true, unrequested: false });
    expect(options.find((option) => option.id === "review")).toMatchObject({ answers: false, defers: true });
    expect(options.find((option) => option.id === "waiver")).toMatchObject({ answers: false, defers: false });
  });

  it("locks asking the governor to deploy when the governor withholds assent", () => {
    const cold = withGovernor(colorado(), GOVERNOR_ASSENT_FLOOR - 0.1);
    const ask = localeActOptions(cold, CO, "wildfire").find((option) => option.id === "request-deployment")!;
    expect(ask.assent).toBe("The governor won't agree to it.");
    expect(ask.locked).toMatch(/assent/);
    const warm = withGovernor(colorado(), 0.9);
    expect(localeActOptions(warm, CO, "wildfire").find((option) => option.id === "request-deployment")).toMatchObject({ assent: "The governor agrees to it." });
  });

  it("charges standing for relief nobody asked for", () => {
    const unasked = localeActOptions(colorado({ claims: [] }), CO, "wildfire").find((option) => option.id === "relief")!;
    expect(unasked.unrequested).toBe(true);
    expect(unasked.standing).toBeGreaterThan(0);
  });

  it("counts the open acts off the engine's gate, the same ones the options leave unlocked", () => {
    expect(openLocaleActCount(campaign, CO, "wildfire")).toBe(options.filter((option) => !option.locked).length);
  });
});

describe("surveillance under a court's order", () => {
  it("opens collection, and points the refused order at it, only while a granted order runs", () => {
    const unrest = withUnrest(colorado(), 0.55, CO);
    const kind = "title-iii-order";
    const applied = `court-application:${kind}:CO:g100:n0`;
    const decided = courtOrderDecideTurn(unrest, kind, CO, unrest.turn);
    const ruling = courtRulingFlag(kind, CO, "granted");
    const granted: Campaign = { ...unrest, turn: decided, player: { ...unrest.player, flags: { ...unrest.player.flags,
      [applied]: true, [flagMarker(applied, unrest.turn)]: true, [ruling]: true, [flagMarker(ruling, decided)]: true } } };
    const options = localeActOptions(granted, CO, "unrest");
    expect(options.find((option) => option.id === "surveil")!.refusedByLaw?.neighbor).toBe("surveil-under-order");
    const under = options.find((option) => option.id === "surveil-under-order")!;
    expect(under.gates).toEqual([expect.objectContaining({ met: true, cite: "50 U.S.C. §1812" })]);
    expect(under.locked ?? "").not.toContain("Seek one from the court first");
  });
});

describe("localeWaiting", () => {
  it("says when the request runs out", () => {
    expect(localeWaiting(colorado(), CO, "wildfire")).toEqual({
      line: "Colorado's request runs out in 5 weeks. If you don't answer it, the state will hold it against you.",
      weeksLeft: 5,
    });
  });

  it("says nothing when nothing was asked, since no clock runs", () => {
    expect(localeWaiting(base, CO, "wildfire")).toBeUndefined();
  });
});

describe("homeActOptions", () => {
  const home = homeActOptions(base, CO);

  it("offers the coercive acts the home path takes, and only routine enforcement goes with nothing to answer", () => {
    expect(home.map((option) => option.id)).toEqual(LOCALE_ACTS.filter((act) => act.coercion && act.occasion !== "any").map((act) => act.id));
    for (const option of home.filter((entry) => entry.id !== "immigration-operation")) {
      expect(option.locked).toBe(`This needs ${LOCALE_REFUSALS.disorder}.`);
      expect(option.packet).toBeUndefined();
      expect(option.unprovoked).toBe(true);
    }
    expect(home.find((option) => option.id === "immigration-operation")!.unprovoked).toBeUndefined();
  });

  it("prices the home path at the engine's unprovoked price", () => {
    for (const option of home) {
      const price = localeActPrice(base, CO, LOCALE_ACTS.find((act) => act.id === option.id)!, true);
      expect(option.standing).toBe(Math.abs(price.standing ?? 0));
      expect(option.cost).toBe(Math.abs(price.treasury ?? 0));
    }
  });
});

describe("localeMissions", () => {
  it("lists nothing in a state no mission has reached", () => {
    expect(localeMissions(base, CO)).toEqual([]);
  });
});

describe("formatWeeklyBill", () => {
  it("keeps a tenth of a million under $100M and rounds whole bills as money does", () => {
    expect(formatWeeklyBill(13.45)).toBe("$13.5M");
    expect(formatWeeklyBill(14.53)).toBe("$14.5M");
    expect(formatWeeklyBill(20)).toBe("$20M");
    expect(formatWeeklyBill(19.98)).toBe("$20M");
    expect(formatWeeklyBill(1250)).toBe("$1.25B");
  });
});

import { imposeTestTariff } from "./__fixtures__/tariff.js";
import { describe, expect, it } from "vitest";
import {
  CHARTER_USA_CONSTITUTION,
  US_ID,
  plankById,
  platformPlanks,
  worldDataset,
  type IdeologyVector,
  type PlankId,
} from "@admin/world";
import { addDays } from "./clock.js";
import { COHORT_MOTIVATION } from "./demos.js";
import { apply } from "./effects.js";
import type { EffectPacket } from "./effect-types.js";
import { defaultLeaderDraft } from "./leader.js";
import { executiveOrder, signOrder } from "./orders.js";
import type { OffshoreLeaseSale } from "./offshore-leasing.js";

import { enactPolicy } from "./policy-draft.js";
import { inheritedStance, legislableDomains, policyStance } from "./policy.js";
import {
  plankAlignment,
  plankDeliverable,
  plankFitsFirstHundredDays,
  plankTerms,
  type PlankDeliverable,
} from "./platform-deliverables.js";
import { pledgeVerdict, type Pledge } from "./pledges.js";
import { createRngStreams, makeCampaignSeed } from "./rng.js";
import { draftCabinetCandidates, generateFoundingPool, sealFounding } from "./founding.js";
import type { Campaign } from "./state.js";

const SEED = makeCampaignSeed("platform-deliverables");
const pool = generateFoundingPool(SEED, worldDataset);
const cabinet = Object.fromEntries(
  Object.entries(draftCabinetCandidates(CHARTER_USA_CONSTITUTION, US_ID, pool)).map(([role, list]) => [role, list[0]!.id]),
);
const leader = { ...defaultLeaderDraft(), name: "Platform Test" };

function sealedOn(plank: PlankId): Campaign {
  return sealFounding(SEED, worldDataset, { cabinet, leader, platform: [plank] });
}

function onlyPledge(campaign: Campaign): Pledge {
  const [pledge] = campaign.pledges ?? [];
  if (!pledge) throw new Error("the seal made no pledge");
  return pledge;
}

// The week the pledge falls due in: three days short of the due date, so the
// week that opens here closes after it.
function inDueWeek(campaign: Campaign, pledge: Pledge): Campaign {
  return { ...campaign, calendar: addDays(pledge.dueDate, -3) };
}

/** Brings about what a held program was for: the law that closes the deficit, funds the building or raises the take, the tariff, or the imports cut. */
function withOutcome(campaign: Campaign, stance: string): Campaign {
  const law = (act: string): Campaign => {
    const bill = { id: `bill:${act}:${campaign.turn}`, act, title: act, sponsor: "administration" as const, introducedTurn: campaign.turn, status: "law" as const, enactedBy: "signed" as const, passage: [] };
    return { ...campaign, bills: { ...campaign.bills, [bill.id]: bill } };
  };
  if (stance === "fiscal-austerity") return law("act-fiscal-responsibility");
  if (stance === "fiscal-investment") return law("act-infrastructure-investment");
  if (stance === "fiscal-redistribution") return law("act-tax-fairness-and-revenue");
  if (stance === "trade-protective") {
    const result = imposeTestTariff(campaign, "CHN" as Campaign["founding"]["nation"], "consumer-electronics", 0.25);
    if (!result.ok) throw new Error(result.reason);
    return apply(campaign, result.packet);
  }
  const us = campaign.nations[US_ID]!;
  const energy = { ...us.stats.energy, importDependence: 0 };
  const cut = { ...campaign, nations: { ...campaign.nations, [US_ID]: { ...us, stats: { ...us.stats, energy } } } };
  return energyDelivery(cut, stance);
}

function energyDelivery(campaign: Campaign, stance: string): Campaign {
  if (stance === "industry-extraction") {
    const sale: OffshoreLeaseSale = { id: "sale:delivered", areaId: "gulf-2029", planningRuleId: "order:planning",
      saleNumber: "modeled-sale", tract: { id: "tract:a", name: "Modeled tract", modeled: true },
      stage: "awarded", openedTurn: campaign.turn, stageTurn: campaign.turn,
      reviewObligationUsdMillions: 10, interiorCapacityAtStart: 1,
      bids: [{ id: "bid:a", bidder: "Bidder A", qualified: true, amountUsdMillions: 150 }],
      modeledFairValueUsdMillions: 120, acceptedBidId: "bid:a", awardedTurn: campaign.turn,
      exploration: { status: "permitted", submittedTurn: campaign.turn, resolvedTurn: campaign.turn } };
    return { ...campaign, offshoreLeaseSales: [sale] };
  }
  const order = { id: "order:clean-power", order: "order-clean-energy", turn: campaign.turn,
    contested: false, challengeChance: 0 };
  return { ...campaign, orders: [...campaign.orders, order], cleanPowerPurchases: [{ id: "purchase:delivered",
    orderRecordId: order.id, buyer: "federal-property-portfolio", amountUsdMillions: 94, quantityMwh: 700_000,
    contractedTurn: campaign.turn, deliveredTurn: campaign.turn + 104, deliveredMwh: 700_000, status: "delivered" }] };
}

function packetOf(effects: EffectPacket["effects"]): EffectPacket {
  return { source: "action", actor: "player", turn: 1, narration: { summary: "A test move." }, effects };
}

/** Does the thing the plank promised, the way a President would. */
function deliver(campaign: Campaign, deliverable: PlankDeliverable): Campaign {
  if (deliverable.kind === "sign-order") {
    const signed = signOrder(campaign, CHARTER_USA_CONSTITUTION, deliverable.order, createRngStreams(campaign.seed));
    if (!signed.ok) throw new Error(signed.reason);
    return apply(campaign, signed.packet);
  }
  const enacted = enactPolicy(campaign, deliverable.stance);
  if (!enacted.ok) throw new Error(enacted.reason);
  return apply(campaign, enacted.packet);
}

function beliefAffinity(push: ReturnType<typeof plankAlignment>, beliefs: IdeologyVector): number {
  return (["economicLeftRight", "authLibertarian", "nationalistGlobalist"] as const).reduce(
    (sum, axis) => sum + (push[axis] ?? 0) * beliefs[axis],
    0,
  );
}

describe("what each plank commits the administration to", () => {
  it("names a deliverable for every plank in the catalog", () => {
    for (const plank of platformPlanks) expect(plankDeliverable(plank.id), plank.id).toBeDefined();
  });

  it("rests every deliverable on a program or an order the engine already has", () => {
    for (const plank of platformPlanks) {
      const deliverable = plankDeliverable(plank.id)!;
      if (deliverable.kind === "sign-order") {
        expect(executiveOrder(deliverable.order), plank.id).toBeDefined();
        continue;
      }
      const stance = policyStance(deliverable.stance);
      expect(stance?.domain, plank.id).toBe(deliverable.domain);
      expect(stance?.inherited, plank.id).toBeUndefined();
    }
  });

  // Courting a cohort is a claim that the plank is for them; a plank whose own
  // program pushes against a cohort's politics cannot honestly make it.
  it("courts only cohorts whose politics lean the way its program pushes", () => {
    for (const plank of platformPlanks) {
      const push = plankAlignment(plankDeliverable(plank.id)!);
      for (const cohort of plank.courts) {
        expect(beliefAffinity(push, COHORT_MOTIVATION[cohort].beliefs), `${plank.id} courts ${cohort}`).toBeGreaterThan(0);
      }
    }
  });

  it("writes the terms a player reads for every plank", () => {
    for (const plank of platformPlanks) {
      const terms = plankTerms(plank.id)!;
      const opens = plankDeliverable(plank.id)!.kind === "hold-program";
      expect(terms.keptWhen, plank.id).toMatch(/^Kept .*\.$/);
      expect(terms.brokenWhen, plank.id).toMatch(/^Broken .*\.$/);
      expect(terms.opensOn !== undefined, plank.id).toBe(opens);
    }
  });

  it("lets only a plank the President still has to act on be promised for the first hundred days", () => {
    for (const plank of platformPlanks) {
      expect(plankFitsFirstHundredDays(plank.id), plank.id).toBe(plankDeliverable(plank.id)!.kind !== "hold-program");
    }
    expect(platformPlanks.filter((plank) => plankFitsFirstHundredDays(plank.id)).length).toBeGreaterThanOrEqual(3);
  });

  it("knows nothing about a plank the catalog does not have", () => {
    expect(plankDeliverable("plank-nobody-drafted")).toBeUndefined();
    expect(plankTerms("plank-nobody-drafted")).toBeUndefined();
    expect(plankFitsFirstHundredDays("plank-nobody-drafted")).toBe(false);
  });
});

describe("a promise is the President's to keep", () => {
  it("is not kept by a law the President let become law unsigned, or that Congress passed over a veto", () => {
    const plank = platformPlanks.find((entry) => {
      const deliverable = plankDeliverable(entry.id);
      return deliverable?.kind === "hold-program" && deliverable.stance === "fiscal-redistribution";
    });
    if (!plank) throw new Error("no plank holds the redistribution program");
    const sealed = sealedOn(plank.id);
    const pledge = onlyPledge(sealed);
    const lawBy = (enactedBy: "signed" | "unsigned" | "veto-overridden"): Campaign => {
      const act = "act-tax-fairness-and-revenue";
      const bill = { id: `bill:${act}:${sealed.turn}`, act, title: act, sponsor: "opposition" as const, introducedTurn: sealed.turn, status: "law" as const, enactedBy, passage: [] };
      return inDueWeek({ ...sealed, bills: { ...sealed.bills, [bill.id]: bill } }, pledge);
    };
    expect(pledgeVerdict(lawBy("signed"), pledge).status).toBe("kept");
    expect(pledgeVerdict(lawBy("unsigned"), pledge).status).toBe("broken");
    expect(pledgeVerdict(lawBy("veto-overridden"), pledge).status).toBe("broken");
  });
});

describe("an energy promise requires delivery and a measured result", () => {
  for (const plankStance of ["industry-extraction", "industry-transition"] as const) {
    it(`is not kept by ${plankStance} cutting imports on its own, and is kept after delivery plus result`, () => {
      const plank = platformPlanks.find((entry) => {
        const deliverable = plankDeliverable(entry.id);
        return deliverable?.kind === "hold-program" && deliverable.stance === plankStance;
      });
      if (!plank) throw new Error(`no plank holds ${plankStance}`);
      const sealed = sealedOn(plank.id);
      const pledge = onlyPledge(sealed);
      const us = sealed.nations[US_ID]!;
      const imports = { ...sealed, nations: { ...sealed.nations, [US_ID]: { ...us, stats: { ...us.stats, energy: { ...us.stats.energy, importDependence: 0 } } } } };
      expect(pledgeVerdict(inDueWeek(imports, pledge), pledge).status).toBe("broken");
      expect(pledgeVerdict(inDueWeek(energyDelivery(sealed, plankStance), pledge), pledge).status).toBe("broken");
      expect(pledgeVerdict(inDueWeek(energyDelivery(imports, plankStance), pledge), pledge).status).toBe("kept");
    });
  }
});

describe("every plank has a settleable deliverable", () => {
  for (const { id } of platformPlanks) {
    it(`${id} opens open, can be kept, and can be broken`, () => {
      const deliverable = plankDeliverable(id)!;
      const sealed = sealedOn(id);
      const pledge = onlyPledge(sealed);
      expect(plankById.get(id)).toBeDefined();
      expect(pledgeVerdict(sealed, pledge)).toEqual({ status: "open" });

      if (deliverable.kind === "hold-program") {
        expect(sealed.player.policies[deliverable.domain]).toBe(deliverable.stance);
        expect(pledgeVerdict(inDueWeek(sealed, pledge), pledge)).toEqual({ status: "broken", settledDate: pledge.dueDate, byDeadline: true });
        const delivered = inDueWeek(withOutcome(sealed, deliverable.stance), pledge);
        expect(pledgeVerdict(delivered, pledge)).toEqual({ status: "kept", settledDate: pledge.dueDate, byDeadline: true });
        const dropped = apply(sealed, packetOf([{ kind: "policy", domain: deliverable.domain, stance: inheritedStance(deliverable.domain).id }]));
        expect(pledgeVerdict(dropped, pledge)).toEqual({ status: "broken", settledDate: sealed.calendar, byDeadline: false });
        return;
      }

      if (deliverable.kind === "adopt-program") expect(legislableDomains(sealed)).toContain(deliverable.domain);
      const delivered = deliver(sealed, deliverable);
      expect(pledgeVerdict(delivered, pledge)).toEqual({ status: "kept", settledDate: sealed.calendar, byDeadline: false });
      expect(pledgeVerdict(inDueWeek(sealed, pledge), pledge)).toEqual({ status: "broken", settledDate: pledge.dueDate, byDeadline: true });
    });
  }
});

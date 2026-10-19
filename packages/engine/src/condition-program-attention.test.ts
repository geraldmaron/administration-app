// Whether a program answers the condition it is supposed to answer.
//
// The reading used to be "has the President chosen a program in the department
// that answers this", which counted austerity and stimulus as equally good
// answers to a recession, and counted borrowing harder as an answer to a market
// that had stopped lending. The reading now weights the stance by the sign of
// what it does to the condition's own cause.
import { describe, expect, it } from "vitest";
import { conditionAttention, conditionRecoveryRate } from "./conditions.js";
import { foundedForBalance } from "./balance-harness.js";
import { POLICY_STANCES, policyRestingOffset, selectPolicyStance, type PolicyDomain } from "./policy.js";
import type { Campaign, ConditionKind, NationCondition } from "./state.js";

const { campaign: FOUNDED } = foundedForBalance("condition-program-attention");
const HOME = FOUNDED.founding.nation;

function conditionOf(kind: ConditionKind): NationCondition {
  return {
    id: `condition:${kind}:${HOME}:1`,
    nation: HOME,
    kind,
    scope: "nation",
    severity: 0.6,
    startedTurn: 1,
    status: "active",
    beats: [{ turn: 1, description: "Staged." }],
  };
}

/** The campaign with one department's stance replaced, and nothing else moved. */
function running(campaign: Campaign, stances: Partial<Record<PolicyDomain, string>>): Campaign {
  return {
    ...campaign,
    player: {
      ...campaign.player,
      policies: { ...campaign.player.policies, ...stances },
    },
  };
}

/** Which fiscal stances move the growth resting point up, and which move it down. */
function fiscalStancesBySign() {
  const offsets = POLICY_STANCES.filter((stance) => stance.domain === "fiscal").map((stance) => ({
    id: stance.id,
    growth: policyRestingOffset([{ stance, quality: 1 }])["economy.growth"],
  }));
  return {
    raises: offsets.filter((entry) => entry.growth > 0).map((entry) => entry.id),
    lowers: offsets.filter((entry) => entry.growth < 0).map((entry) => entry.id),
  };
}

describe("a stance answers a condition only if it pushes its cause the right way", () => {
  const { raises, lowers } = fiscalStancesBySign();

  it("has at least one fiscal stance on each side of the growth axis to compare", () => {
    expect(raises.length).toBeGreaterThan(0);
    expect(lowers.length).toBeGreaterThan(0);
  });

  it("gives a recession more attention under a growth-raising program than a growth-lowering one", () => {
    const recession = conditionOf("recession");
    const stimulus = conditionAttention(running(FOUNDED, { fiscal: raises[0]! }), recession);
    const austerity = conditionAttention(running(FOUNDED, { fiscal: lowers[0]! }), recession);
    expect(stimulus).toBeGreaterThan(austerity);
  });

  it("reverses the sign for a debt crisis: borrowing harder is not an answer", () => {
    const crisis = conditionOf("fiscal-crisis");
    const stimulus = conditionAttention(running(FOUNDED, { fiscal: raises[0]! }), crisis);
    const austerity = conditionAttention(running(FOUNDED, { fiscal: lowers[0]! }), crisis);
    expect(austerity).toBeGreaterThan(stimulus);
  });

  it("reports the recovery rates the change moves, so the size of it is on the record", () => {
    const recession = conditionOf("recession");
    const stimulus = conditionRecoveryRate(conditionAttention(running(FOUNDED, { fiscal: raises[0]! }), recession));
    const austerity = conditionRecoveryRate(conditionAttention(running(FOUNDED, { fiscal: lowers[0]! }), recession));
    const inherited = conditionRecoveryRate(conditionAttention(FOUNDED, recession));
    console.log(
      `recession recovery per week — growth-raising program ${stimulus}, growth-lowering ${austerity}, inherited ${inherited}`,
    );
    expect(stimulus).toBeGreaterThan(inherited);
    // A program pushing the wrong way is credited with no more attention than
    // never having chosen one, and never with less.
    expect(austerity).toBeGreaterThanOrEqual(inherited);
  });
});

describe("a hazard has no axis, so its reading is unchanged", () => {
  it("reads a weather kind on whether the answering departments are being run at all", () => {
    const wildfire = conditionOf("wildfire");
    const { raises, lowers } = fiscalStancesBySign();
    // No program makes the fire smaller, so the two directions read the same.
    expect(conditionAttention(running(FOUNDED, { fiscal: raises[0]! }), wildfire)).toBe(
      conditionAttention(running(FOUNDED, { fiscal: lowers[0]! }), wildfire),
    );
  });

  it("still credits an inherited department with nothing", () => {
    const wildfire = conditionOf("wildfire");
    expect(selectPolicyStance(FOUNDED, "fiscal").inherited).toBe(true);
    expect(conditionAttention(FOUNDED, wildfire)).toBeLessThan(1);
  });
});

describe("a foreign country's conditions are not read this way at all", () => {
  it("presumes every other capital is working its own emergencies", () => {
    const abroad = { ...conditionOf("recession"), nation: "ARG" as typeof HOME };
    expect(conditionAttention(FOUNDED, abroad)).toBe(1);
  });
});

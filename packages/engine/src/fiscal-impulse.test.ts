import type { NationId } from "@admin/world";
import { describe, expect, it } from "vitest";
import { foundedForBalance } from "./balance-harness.js";
import { apply } from "./effects.js";
import { fiscalPhase, selectFiscalStatement } from "./fiscal.js";
import {
  fiscalImpulse,
  FISCAL_PROGRAM_SHIFTS,
  impulseOf,
  INVESTMENT_SPENDOUT,
  mixOfShift,
  nextImpulse,
  programShiftOf,
  projectFiscalImpulse,
  unrestOutlayShare,
  warOutlayShare,
  weekOfImpulse,
} from "./fiscal-impulse.js";
import { usPosition, usStructuralBalance } from "./national-books.js";
import type { Campaign, Commitment, Conflict, NationCondition } from "./state.js";

const { campaign: FOUNDED } = foundedForBalance("fiscal-impulse");
const US = FOUNDED.founding.nation;

function withProgram(campaign: Campaign, stance: string): Campaign {
  return { ...campaign, player: { ...campaign.player, policies: { ...campaign.player.policies, fiscal: stance } } };
}

function atWar(campaign: Campaign, role: "aggressor" | "defender", intensity: number): Campaign {
  const other = "MEX" as NationId;
  const conflict: Conflict = {
    id: `war:test:${role}`,
    aggressor: role === "aggressor" ? US : other,
    defender: role === "aggressor" ? other : US,
    joined: { aggressor: [], defender: [] },
    startedTurn: campaign.turn,
    cause: "a test",
    intensity,
    warSupport: { aggressor: 0.5, defender: 0.5 },
    exhaustion: { aggressor: 0, defender: 0 },
    status: "active",
    beats: [],
  };
  return { ...campaign, conflicts: { ...campaign.conflicts, [conflict.id]: conflict } };
}

describe("the push a budget gives", () => {
  it("weighs a program's change by how much of each kind reaches demand", () => {
    // Investment cuts the take 0.6 at once and authorizes 1.2 points of
    // purchases, of which only the first week's spending reaches demand.
    expect(projectFiscalImpulse(FOUNDED, { fiscal: "fiscal-investment" })).toBeCloseTo(0.6 * 0.006 + 0.8 * 0.012 * INVESTMENT_SPENDOUT, 7);
    // Consolidation raises the take 1.2 and cuts 0.8 of purchases and 1.4 of transfers.
    expect(projectFiscalImpulse(FOUNDED, { fiscal: "fiscal-austerity" })).toBeCloseTo(-0.6 * 0.012 - 0.8 * 0.008 - 0.5 * 0.014, 9);
    expect(projectFiscalImpulse(FOUNDED, {})).toBe(0);
  });

  it("books the push the preview promised the week the program is adopted, then fades it", () => {
    const investing = withProgram(FOUNDED, "fiscal-investment");
    const week = fiscalPhase(investing).reduce(apply, investing);
    expect(fiscalImpulse(week, US)).toBeCloseTo(projectFiscalImpulse(FOUNDED, { fiscal: "fiscal-investment" }), 4);
    let impulse = 0.0132;
    for (let turn = 0; turn < 18; turn += 1) impulse = nextImpulse(impulse, mixOfShift(programShiftOf({})), mixOfShift(programShiftOf({})));
    expect(impulse / 0.0132).toBeGreaterThan(0.45);
    expect(impulse / 0.0132).toBeLessThan(0.55);
  });

  it("spends investment out a quarter in its first year and well under two thirds by its third", () => {
    const mix = mixOfShift(programShiftOf({}));
    const spentBy = (weeks: number) => {
      let history = { impulse: 0, structural: mix, investmentSpent: 0 };
      for (let week = 0; week < weeks; week += 1) history = weekOfImpulse(history, mix, 0.012);
      return history.investmentSpent / 0.012;
    };
    expect(spentBy(52)).toBeCloseTo(0.25, 3);
    expect(spentBy(156)).toBeGreaterThan(0.5);
    expect(spentBy(156)).toBeLessThan(2 / 3);
  });

  it("pushes demand only by what is spent, so the first year's push is a fraction of the authority's", () => {
    const mix = mixOfShift(programShiftOf({}));
    const authorized = { ...mix, purchases: mix.purchases + 0.012 };
    let spending = { impulse: 0, structural: mix, investmentSpent: 0 };
    let lump = { impulse: 0, structural: mix };
    let pushed = 0;
    let wouldHave = 0;
    for (let week = 0; week < 52; week += 1) {
      spending = weekOfImpulse(spending, authorized, 0.012);
      lump = { impulse: nextImpulse(lump.impulse, lump.structural, authorized), structural: authorized };
      pushed += spending.impulse;
      wouldHave += lump.impulse;
    }
    expect(pushed / wouldHave).toBeGreaterThan(0.1);
    expect(pushed / wouldHave).toBeLessThan(0.3);
  });

  it("reads a record kept before investment spent out as all of it spent, so opening it pushes nothing", () => {
    const mix = mixOfShift(programShiftOf({ fiscal: "fiscal-investment" }));
    const week = weekOfImpulse({ impulse: 0, structural: mix }, mix, 0.012);
    expect(week.impulse).toBe(0);
    expect(week.investmentSpent).toBe(0.012);
  });

  it("reads a foreign government's program the same way", () => {
    const shift = programShiftOf({ fiscal: "fiscal-redistribution" });
    expect(impulseOf(mixOfShift(programShiftOf({})), mixOfShift(shift))).toBeCloseTo(-0.6 * 0.022 + 0.5 * 0.018, 9);
    expect(FISCAL_PROGRAM_SHIFTS["defense-drawdown"]!.outlays).toBeLessThan(0);
  });
});

describe("what a war and a street cost", () => {
  it("adds one to two points of output a year to the outlays of a US war at 0.7, and no push", () => {
    const warring = atWar(FOUNDED, "aggressor", 0.7);
    const added = selectFiscalStatement(FOUNDED).balance - selectFiscalStatement(warring).balance;
    const share = added / selectFiscalStatement(FOUNDED).gdp;
    expect(share).toBeGreaterThanOrEqual(0.01);
    expect(share).toBeLessThanOrEqual(0.018);
    expect(usStructuralBalance(warring, usPosition(warring)!)).toBeCloseTo(usStructuralBalance(FOUNDED, usPosition(FOUNDED)!), 9);
    const week = fiscalPhase(warring).reduce(apply, warring);
    expect(fiscalImpulse(week, US)).toBeCloseTo(0, 9);
  });

  it("charges a defender on its own soil most and a joiner least", () => {
    expect(warOutlayShare(atWar(FOUNDED, "defender", 1), US)).toBeCloseTo(0.03, 9);
    expect(warOutlayShare(atWar(FOUNDED, "aggressor", 1), US)).toBeCloseTo(0.02, 9);
    const joined = atWar(FOUNDED, "aggressor", 1);
    const [id] = Object.keys(joined.conflicts).filter((key) => key.startsWith("war:test"));
    const conflict = joined.conflicts[id!]!;
    const asJoiner = { ...joined, conflicts: { ...joined.conflicts, [id!]: { ...conflict, aggressor: "CHN" as NationId, joined: { aggressor: [US], defender: [] } } } };
    expect(warOutlayShare(asJoiner, US)).toBeCloseTo(0.005, 9);
  });

  // The deployment is priced from the units sent and drawn on the authority
  // inside the discretionary line, so a war it pays for is not billed again as
  // a share of output; another government's commitments are never billed.
  it("bills a war the President pays for by deployment once, through the deployment", () => {
    const warring = atWar(FOUNDED, "aggressor", 1);
    const deployment: Commitment = {
      id: "commitment:deployment:USA:MEX:test",
      kind: "deployment",
      actor: US,
      target: { kind: "nation", id: "MEX" },
      resource: { spec: { kind: "currency", scale: 6, suffix: "USD" }, amountPerTurn: 1_500 },
      source: { kind: "orderOfBattle", branch: "army", unitType: "army.brigade-combat-team", count: 8 },
      startedTurn: warring.turn,
      review: "standing",
      status: "active",
      rationale: "A corps in the field.",
    };
    const paid = { ...warring, commitments: { ...warring.commitments, [deployment.id]: deployment } };
    expect(warOutlayShare(paid, US)).toBe(0);
    const wound = { ...paid, commitments: { ...paid.commitments, [deployment.id]: { ...deployment, status: "wound-down" as const } } };
    expect(warOutlayShare(wound, US)).toBeCloseTo(0.02, 9);
    const mexico = { ...paid, commitments: { ...paid.commitments, [deployment.id]: { ...deployment, actor: "MEX" as NationId, target: { kind: "nation" as const, id: US as string } } } };
    expect(warOutlayShare(mexico, "MEX" as NationId)).toBeCloseTo(0.03, 9);
  });

  it("charges unrest a fifth of a point per unit of severity", () => {
    const unrest: NationCondition = { id: "condition:unrest:USA:0", nation: US, kind: "unrest", scope: "nation", severity: 0.5, startedTurn: 0, status: "active", beats: [] };
    const restive = { ...FOUNDED, conditions: { ...FOUNDED.conditions, [unrest.id]: unrest } };
    expect(unrestOutlayShare(restive, US)).toBeCloseTo(0.001, 9);
  });
});

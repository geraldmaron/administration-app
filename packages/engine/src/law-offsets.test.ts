import { describe, expect, it } from "vitest";
import { foundedForBalance } from "./balance-harness.js";
import { discretionaryAppropriation, selectFiscalStatement } from "./fiscal.js";
import { LAW_OFFSETS, lawShift, lawShiftOverTenYears } from "./law-offsets.js";
import { LEGISLATIVE_ACTS } from "./legislative-acts.js";
import type { Bill, Campaign } from "./state.js";
import { signBill } from "./legislation.js";
import { apply } from "./effects.js";

// A law's price is paid over its span, through the statement, and stops when
// the law does. No act that carries an offset also writes a lump onto the debt.

const { campaign: FOUNDED } = foundedForBalance("law-offsets");

function enacted(campaign: Campaign, act: string, turn: number): Campaign {
  const bill: Bill = { id: `bill:${act}:${turn}`, act, title: act, sponsor: "administration", introducedTurn: turn, status: "law", passage: [] };
  return { ...campaign, bills: { ...campaign.bills, [bill.id]: bill } };
}

describe("a law's price over its span", () => {
  it("never books more than enacted recovery dollars across 104 weeks when GDP grows", () => {
    const bill: Bill = { id: "bill:fixed-recovery", act: "act-disaster-recovery", title: "Recovery",
      sponsor: "administration", introducedTurn: FOUNDED.turn, status: "on-the-desk", passage: [] };
    const pending = { ...FOUNDED, bills: { ...FOUNDED.bills, [bill.id]: bill } };
    const signed = signBill(pending, bill.id);
    if (!signed.ok) throw new Error(signed.reason);
    const law = apply(pending, signed.packet);
    const fixed = law.bills[bill.id]!.recoveryAuthority!.appropriated;
    const originalGdp = law.nations[law.founding.nation]!.stats.economy.gdp;
    let paid = 0;
    for (let week = 0; week < 104; week += 1) {
      const gdp = week < 52 ? originalGdp : originalGdp * 2;
      const player = law.nations[law.founding.nation]!;
      const state = { ...law, turn: law.turn + week, nations: { ...law.nations,
        [law.founding.nation]: { ...player, stats: { ...player.stats, economy: { ...player.stats.economy, gdp } } } } };
      paid += lawShift(state).outlays * gdp / 52;
      if (week === 52) expect(lawShiftOverTenYears(state).outlays * gdp * 10).toBeCloseTo(fixed / 2, 5);
    }
    expect(paid).toBeCloseTo(fixed, 5);
    expect(lawShift({ ...law, turn: law.turn + 104 }).outlays).toBe(0);
    expect(lawShiftOverTenYears({ ...law, turn: law.turn + 104 }).outlays).toBe(0);
  });

  it("forgoes a tax cut's receipts every year it is law and none after", () => {
    const cut = enacted(FOUNDED, "act-tax-relief-and-growth", FOUNDED.turn);
    const output = selectFiscalStatement(FOUNDED).gdp;
    const forgone = selectFiscalStatement(FOUNDED).revenueTotal - selectFiscalStatement(cut).revenueTotal;
    expect(forgone / output).toBeCloseTo(0.008, 3);
    const expired = { ...cut, turn: cut.turn + 4 * 52 };
    expect(lawShift(expired).take).toBe(0);
    expect(lawShift({ ...cut, turn: cut.turn + 4 * 52 - 1 }).take).toBeCloseTo(-0.008, 9);
  });

  it("caps the discretionary line, and the President's appropriation with it, while the caps bind", () => {
    const capped = enacted(FOUNDED, "act-fiscal-responsibility", FOUNDED.turn);
    const output = selectFiscalStatement(FOUNDED).gdp;
    const saved = selectFiscalStatement(FOUNDED).outlay.discretionary - selectFiscalStatement(capped).outlay.discretionary;
    expect(saved / output).toBeCloseTo(0.005, 3);
    expect(discretionaryAppropriation(capped)).toBeLessThan(discretionaryAppropriation(FOUNDED));
    expect(lawShift({ ...capped, turn: capped.turn + 104 }).outlays).toBe(0);
  });

  it("leaves no act that carries an offset writing a lump onto the debt or the rates", () => {
    for (const act of LEGISLATIVE_ACTS.filter((entry) => LAW_OFFSETS[entry.id])) {
      expect(act.nationEffects["economy.debt"], act.id).toBeUndefined();
      expect(act.nationEffects["economy.growth"], act.id).toBeUndefined();
      expect(act.nationEffects["economy.unemployment"], act.id).toBeUndefined();
    }
    expect(Object.keys(LAW_OFFSETS).every((id) => LEGISLATIVE_ACTS.some((act) => act.id === id))).toBe(true);
  });
});

describe("a law as the ten-year projection reads it", () => {
  it("counts a four-year law for the years it has left, and nothing once it has lapsed", () => {
    const cut = enacted(FOUNDED, "act-tax-relief-and-growth", FOUNDED.turn);
    expect(lawShiftOverTenYears(cut).take).toBeCloseTo(-0.008 * 0.4, 9);
    expect(lawShiftOverTenYears({ ...cut, turn: cut.turn + 104 }).take).toBeCloseTo(-0.008 * 0.2, 9);
    expect(lawShiftOverTenYears({ ...cut, turn: cut.turn + 4 * 52 }).take).toBe(0);
    expect(lawShift(cut).take).toBeCloseTo(-0.008, 9);
  });

  it("counts both halves of a law's span alike, the caps' outlays and their discretionary share", () => {
    const capped = enacted(FOUNDED, "act-fiscal-responsibility", FOUNDED.turn);
    const ahead = lawShiftOverTenYears(capped);
    expect(ahead.outlays).toBeCloseTo(-0.005 * 0.2, 9);
    expect(ahead.discretionary).toBeCloseTo(-0.005 * 0.2, 9);
  });

  it("reads nothing where no law carries an offset", () => {
    expect(lawShiftOverTenYears(FOUNDED)).toEqual({ take: 0, outlays: 0, discretionary: 0, transfers: 0, investment: 0, cap: 0 });
  });
});

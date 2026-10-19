import { imposeTestTariff } from "./__fixtures__/tariff.js";
import { describe, expect, it } from "vitest";
import { apply } from "./effects.js";
import { foundedForBalance } from "./balance-harness.js";
import { LAPSE_DELAYED_SHARE } from "./discretionary-line.js";
import { authorityCeiling, discretionaryAppropriation, fiscalPhase, selectFiscalStatement, selectOutlay, selectRevenue } from "./fiscal.js";
import { SHUTDOWN_GRACE_TURNS } from "./funding.js";
import { programRestingOffset } from "./governance.js";
import { INVESTMENT_SPENDOUT } from "./fiscal-impulse.js";
import { lawRestingOffset } from "./law-offsets.js";
import { bookUsDebt, usPosition, usRevenueTotal } from "./national-books.js";
import { liftMeasure, selectCustomsReceipts } from "./trade.js";
import type { Bill, Campaign } from "./state.js";

// What a law, an appropriation, a lapse, a cap and a tariff do to the national
// books, each through the one path the books have for it.

const { campaign: FOUNDED } = foundedForBalance("law-books");
const US = FOUNDED.founding.nation;

function enacted(campaign: Campaign, act: string, turn = campaign.turn): Campaign {
  const bill: Bill = { id: `bill:${act}:${turn}`, act, title: act, sponsor: "administration", introducedTurn: turn, status: "law", passage: [] };
  return { ...campaign, bills: { ...campaign.bills, [bill.id]: bill } };
}

function withChoiceDebt(campaign: Campaign, choiceDebt: number): Campaign {
  return { ...campaign, books: { ...campaign.books, [US]: { ...campaign.books![US]!, choiceDebt } } };
}

/** The government past its deadline and its grace, so the week is a lapse week. */
function closed(campaign: Campaign): Campaign {
  const appropriation = { ...campaign.congress.appropriation, throughTurn: campaign.turn - SHUTDOWN_GRACE_TURNS - 1 };
  return { ...campaign, congress: { ...campaign.congress, appropriation } };
}

function reopened(campaign: Campaign): Campaign {
  const appropriation = { ...campaign.congress.appropriation, throughTurn: campaign.turn + 52 };
  return { ...campaign, congress: { ...campaign.congress, appropriation } };
}

const week = (campaign: Campaign): Campaign => ({ ...fiscalPhase(campaign).reduce(apply, campaign), turn: campaign.turn + 1 });
const debtOf = (campaign: Campaign) => campaign.nations[US]!.stats.economy.debt;

describe("a law's effect on the economy rests for its span", () => {
  it("moves the growth rate's resting point for as long as the law is written for, and not after", () => {
    const law = enacted(FOUNDED, "act-immigration-reform");
    expect(lawRestingOffset(law)["economy.growth"]).toBeCloseTo(0.003, 9);
    expect(lawRestingOffset({ ...law, turn: law.turn + 9 * 52 })["economy.growth"]).toBeCloseTo(0.003, 9);
    expect(lawRestingOffset({ ...law, turn: law.turn + 10 * 52 })["economy.growth"]).toBe(0);
    expect(lawRestingOffset(FOUNDED)["economy.growth"]).toBe(0);
  });

  it("reaches the rates through the program's own resting offset, which macro.ts already reads", () => {
    const law = enacted(FOUNDED, "act-infrastructure-investment");
    const moved = programRestingOffset(law, US)["economy.growth"] - programRestingOffset(FOUNDED, US)["economy.growth"];
    expect(moved).toBeCloseTo(0.0002, 9);
  });
});

describe("an appropriation reaches the deficit", () => {
  it("adds its outlays to the discretionary line and the deficit, and not to the President's authority", () => {
    const law = enacted(FOUNDED, "act-infrastructure-investment");
    const potential = usPosition(FOUNDED)!.potential;
    expect(selectOutlay(law).discretionary - selectOutlay(FOUNDED).discretionary).toBeCloseTo(0.004 * potential, -1);
    expect(selectFiscalStatement(FOUNDED).balance - selectFiscalStatement(law).balance).toBeCloseTo(0.004 * potential, -1);
    expect(authorityCeiling(law)).toBe(authorityCeiling(FOUNDED));
    expect(selectOutlay({ ...law, turn: law.turn + 5 * 52 }).discretionary).toBeLessThan(selectOutlay(law).discretionary);
  });

  // The act builds roads, grid and rail, so its money reaches demand as it is
  // spent out rather than the week it is signed: the push starts at a week's
  // spending and builds, still well under what the whole authority would push.
  it("pushes demand through the impulse as a purchase as its money is spent out", () => {
    const law = enacted(FOUNDED, "act-infrastructure-investment");
    const impulse = (campaign: Campaign) => campaign.books![US]!.impulse;
    const first = impulse(week(law)) - impulse(week(FOUNDED));
    expect(first).toBeCloseTo(0.8 * 0.004 * INVESTMENT_SPENDOUT, 6);
    let withLaw = week(law);
    let without = week(FOUNDED);
    for (let turn = 0; turn < 26; turn += 1) {
      withLaw = week(withLaw);
      without = week(without);
    }
    const built = impulse(withLaw) - impulse(without);
    expect(built).toBeGreaterThan(first * 5);
    expect(built).toBeLessThan(0.8 * 0.004 * 0.2);
  });
});

describe("a lapse in the books", () => {
  it("leaves part of the discretionary line unpaid while the government is closed", () => {
    const open = selectOutlay(FOUNDED).discretionary;
    expect(selectOutlay(closed(FOUNDED)).discretionary / open).toBeCloseTo(1 - LAPSE_DELAYED_SHARE, 2);
  });

  it("owes what it withheld and pays it through the booking step the week the government reopens", () => {
    const shut = week(week(closed(FOUNDED)));
    const owed = shut.books![US]!.lapseArrears!;
    const withheld = (selectOutlay(FOUNDED).discretionary * LAPSE_DELAYED_SHARE) / 52;
    expect(owed / withheld).toBeGreaterThan(1.9);
    expect(owed / withheld).toBeLessThan(2.1);
    const open = reopened(shut);
    const after = week(open);
    expect(after.books![US]!.lapseArrears).toBeUndefined();
    expect(debtOf(after)).toBe(bookUsDebt(debtOf(open), selectFiscalStatement(open).balance, owed));
  });
});

describe("a debt-limit deal's cap", () => {
  const deal = enacted(FOUNDED, "act-debt-limit-deal");
  const potential = usPosition(FOUNDED)!.potential;

  it("holds the discretionary line and the President's appropriation down together while it binds", () => {
    expect(selectOutlay(FOUNDED).discretionary - selectOutlay(deal).discretionary).toBeCloseTo(0.005 * potential, -1);
    expect(discretionaryAppropriation(deal)).toBeLessThan(discretionaryAppropriation(FOUNDED));
    expect(authorityCeiling(deal)).toBeLessThan(authorityCeiling(FOUNDED));
  });

  it("charges the larger of the cap and the crowding, never both", () => {
    const rate = FOUNDED.books![US]!.rates.effective;
    const small = (0.002 * potential) / rate;
    const large = (0.01 * potential) / rate;
    const line = (campaign: Campaign) => selectOutlay(campaign).discretionary;
    expect(line(FOUNDED) - line(withChoiceDebt(deal, small))).toBeCloseTo(0.005 * potential, -1);
    expect(line(FOUNDED) - line(withChoiceDebt(deal, large))).toBeCloseTo(0.01 * potential, -1);
    expect(line(withChoiceDebt(deal, large))).toBe(line(withChoiceDebt(FOUNDED, large)));
  });
});

describe("customs are revenue", () => {
  const target = "CHN" as Campaign["founding"]["nation"];
  const tariffed = () => {
    const result = imposeTestTariff(FOUNDED, target, "consumer-electronics", 0.25);
    if (!result.ok) throw new Error(result.reason);
    return apply(FOUNDED, result.packet);
  };

  it("raises the tariff line by the duty every week a tariff stands, and stops when it is lifted", () => {
    const signed = tariffed();
    const duty = selectCustomsReceipts(signed) * 52;
    expect(duty).toBeGreaterThan(0);
    expect(selectRevenue(signed).tariff - selectRevenue(FOUNDED).tariff).toBeCloseTo(duty, -1);
    expect(selectFiscalStatement(signed).revenueTotal - selectFiscalStatement(FOUNDED).revenueTotal).toBeCloseTo(duty, -1);
    const lifted = liftMeasure(signed, Object.keys(signed.trade.measures).find((id) => !(id in FOUNDED.trade.measures))!);
    if (!lifted.ok) throw new Error(lifted.reason);
    expect(selectRevenue(apply(signed, lifted.packet)).tariff).toBe(selectRevenue(FOUNDED).tariff);
  });
});

describe("receipts follow the cycle", () => {
  it("collects more than a point less for every point output falls below its potential", () => {
    const position = usPosition(FOUNDED)!;
    const slump = { ...FOUNDED, nations: { ...FOUNDED.nations, [US]: { ...FOUNDED.nations[US]!, stats: { ...FOUNDED.nations[US]!.stats, economy: { ...FOUNDED.nations[US]!.stats.economy, gdp: FOUNDED.nations[US]!.stats.economy.gdp * 0.97 } } } } };
    const fell = 1 - usRevenueTotal(slump, usPosition(slump)!) / usRevenueTotal(FOUNDED, position);
    expect(fell).toBeGreaterThan(0.03 * 1.2);
    expect(fell).toBeLessThan(0.03 * 1.4);
  });
});

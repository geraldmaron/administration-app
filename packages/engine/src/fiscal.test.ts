import { debtToGdp } from "@admin/world";
import { describe, expect, it } from "vitest";
import { apply } from "./effects.js";
import { policyStance } from "./policy.js";
import {
  SOLVENCY_HORIZON_TURNS,
  apportionmentPhase,
  authorityCeiling,
  discretionaryAppropriation,
  fiscalPhase,
  selectDebtTrajectory,
  selectFiscalStatement,
  selectOutlay,
  selectRevenue,
  selectFiscalOutlook,
  selectSolvency,
} from "./fiscal.js";
import { BUDGET_ACCOUNTS, type BudgetAllocation } from "./budget.js";
import { macroDriftPhase } from "./macro.js";
import { foundedForBalance } from "./balance-harness.js";
import { openCommitment } from "./commitments.js";
import { US_FORCE_PRICES } from "./force-costs.js";
import { DOMESTIC_SUSTAIN_AT_FULL, FUNDED_BUDGET_ADEQUACY } from "./funding.js";
import { buildCampaign } from "./__fixtures__/campaign.js";
import type { Campaign } from "./state.js";

// The standing program written directly rather than legislated: what is under
// test is what a program *means* for the accounts, not whether the fixture's
// charter seats somebody who could pass one.
function withStance(campaign: Campaign, stanceId: string): Campaign {
  const domain = policyStance(stanceId)!.domain;
  return { ...campaign, player: { ...campaign.player, policies: { ...campaign.player.policies, [domain]: stanceId } } };
}

describe("the fiscal statement", () => {
  it("adds up: every source counted once, every function counted once", () => {
    const statement = selectFiscalStatement(buildCampaign());
    expect(statement.revenueTotal).toBe(
      Object.values(statement.revenue).reduce((total, value) => total + value, 0),
    );
    expect(statement.outlayTotal).toBe(
      Object.values(statement.outlay).reduce((total, value) => total + value, 0),
    );
    expect(statement.balance).toBe(statement.revenueTotal - statement.outlayTotal);
  });

  it("moves the revenue line when the program that sets it moves", () => {
    const base = buildCampaign();
    const before = selectRevenue(base);
    const after = selectRevenue(withStance(base, "fiscal-austerity"));
    // Consolidation closes reliefs, which is a larger take out of the same
    // national income.
    expect(after.income).toBeGreaterThan(before.income);
  });

  it("collects the tariff line from the duties in force, not from the trade program's name", () => {
    const base = buildCampaign();
    expect(selectRevenue(withStance(base, "trade-protective"))).toEqual(selectRevenue(withStance(base, "trade-open")));
    const revenue = selectRevenue(base);
    const total = Object.values(revenue).reduce((sum, value) => sum + value, 0);
    // The duties in force at the oath: FY2025's $195 billion of $5,235 billion.
    expect(revenue.tariff / total).toBeCloseTo(0.0372, 3);
  });

  it("counts the defense budget the dataset already states rather than a second one", () => {
    const campaign = buildCampaign();
    const stated = campaign.nations[campaign.founding.nation]!.stats.military.budget;
    expect(selectOutlay(campaign).defense).toBe(stated);
  });

  it("counts a standing commitment inside the line it draws on, where the President's authority already paid for it", () => {
    const base = buildCampaign();
    const opened = openCommitment(base, {
      kind: "aid",
      actor: base.founding.nation,
      target: { kind: "nation", id: "ALP" },
      // Sized to what the fixture nation could actually promise: a year of it
      // has to fit inside the budget authority a 50,000 economy founds on, the
      // same guard `openCommitment` now applies to every money promise.
      resource: { spec: { kind: "currency", scale: 6, suffix: "USD" }, amountPerTurn: 5 },
      source: { kind: "budgetLine", line: "foreignAffairs" },
      review: "standing",
      rationale: "A country the administration decided to keep standing.",
    });
    expect(opened.ok).toBe(true);
    if (!opened.ok) return;
    const after = apply(base, opened.packet);
    // The commitment is a claim on the discretionary appropriation, which the
    // outlay line already carries: counting it again would borrow for it twice.
    expect(selectOutlay(after).foreignAffairs).toBe(selectOutlay(base).foreignAffairs);
    expect(selectFiscalStatement(after).balance).toBe(selectFiscalStatement(base).balance);
    expect(selectFiscalStatement(after).commitmentCost).toBeGreaterThan(0);
  });

  it("says where the debt is going, which one reading of it cannot", () => {
    const campaign = buildCampaign();
    const trajectory = selectDebtTrajectory(campaign, 5);
    expect(trajectory).toHaveLength(5);
    // A government running a deficit is borrowing, and the series has to say so
    // — two governments at the same debt ratio with opposite balances are in
    // completely different situations and one figure shows them as identical.
    const balance = selectFiscalStatement(campaign).balance;
    if (balance < 0) expect(trajectory.at(-1)!.debt).toBeGreaterThan(trajectory[0]!.debt);
  });
});

// The warning existed for a state the first term did not reach. It read half a
// year against the *capability appropriation alone*, and the appropriation
// alone is not the standing bill: maxing every buildable account to its cap
// from a real founding still left thirty-seven weeks of funding, and a
// commitment — the sustainment of a war, a basing arrangement, a standing
// program — cost nothing at all as far as the reading was concerned.
describe("whether the administration can pay for what it has voted", () => {
  // A draft that funds the named accounts hard and zeroes the rest of
  // statecraft. The domestic line is deliberately held at its own sustainment
  // rather than zeroed: abolishing the entire domestic program is a real
  // decision the budget now permits, but it is not the "aggressive but
  // plausible" draft these readings are about, and its peace dividend would pay
  // for most of the buildup being measured.
  const allocate = (share: number, accounts: readonly string[]): BudgetAllocation =>
    Object.fromEntries(
      BUDGET_ACCOUNTS.map((account) => [
        account,
        account === "domestic"
          ? DOMESTIC_SUSTAIN_AT_FULL * FUNDED_BUDGET_ADEQUACY
          : accounts.includes(account)
            ? share
            : 0,
      ]),
    ) as BudgetAllocation;

  it("counts the standing commitments, not only the appropriation", () => {
    const campaign = buildCampaign();
    const withAid = apply(
      campaign,
      (() => {
        const opened = openCommitment(campaign, {
          kind: "aid",
          actor: campaign.founding.nation,
          target: { kind: "nation", id: "ALP" },
          resource: { spec: { kind: "currency", scale: 6, suffix: "USD" }, amountPerTurn: 5 },
          source: { kind: "budgetLine", line: "foreignAffairs" },
          review: "standing",
          rationale: "test",
        });
        if (!opened.ok) throw new Error(opened.reason);
        return opened.packet;
      })(),
    );
    expect(selectSolvency(campaign).commitmentCost).toBe(0);
    expect(selectSolvency(withAid).commitmentCost).toBe(5);
    expect(selectSolvency(withAid).weeklyDraw).toBe(selectSolvency(withAid).appropriationCost + 5);
  });

  it("says nothing is at risk where the government is not drawing on the treasury", () => {
    // The inherited appropriation runs below the sustainment line, so it is a
    // net saving rather than a draw: a government holding that line can hold it
    // forever, which is exactly the point of holding it.
    const reading = selectSolvency(buildCampaign());
    expect(reading.weeklyDraw).toBeLessThanOrEqual(0);
    expect(reading.turnsFunded).toBe(Infinity);
    expect(reading.underfunded).toBe(false);
  });

  // The reachability claim, taken against the board a real founding produces
  // rather than against the fixture's toy economy.
  it("is reachable from a fresh founding by an aggressive but plausible draft", () => {
    const { campaign } = foundedForBalance("opening");
    const cap = 0.04;

    // One account built hard is a decision, not a solvency problem.
    expect(selectSolvency(campaign, allocate(cap, ["military"])).underfunded).toBe(false);

    // Three of the four accounts at their cap plus the sustainment of one war
    // does not reach the next appropriation, and the reading says so.
    const heavy = allocate(cap, ["military", "covert", "economic"]);
    const atWar = apply(
      campaign,
      (() => {
        const opened = openCommitment(campaign, {
          kind: "sustainment",
          actor: campaign.founding.nation,
          target: { kind: "nation", id: "MEX" },
          resource: {
            spec: { kind: "currency", scale: 6, suffix: "USD" },
            // A full expeditionary corps, eight brigades, at the rung's own weekly price.
            amountPerTurn: Math.round(US_FORCE_PRICES[5].weekly * 8),
          },
          source: { kind: "budgetLine", line: "defense" },
          review: "standing",
          rationale: "A corps in the field has to be fed for as long as it is there.",
        });
        if (!opened.ok) throw new Error(opened.reason);
        return opened.packet;
      })(),
    );
    const reading = selectSolvency(atWar, heavy);
    expect(reading.commitmentCost).toBeGreaterThan(0);
    expect(reading.turnsFunded).toBeLessThan(SOLVENCY_HORIZON_TURNS);
    expect(reading.underfunded).toBe(true);
    expect(reading.summary).toContain("before the budget year ends");
  });

  // --- The seam between the two books --------------------------------------
  //
  // The country's balance and this administration's treasury are not the same
  // money and are not reconciled into one figure, for the reason fiscal.ts
  // states at length. What the forward view has to do is make the relationship
  // legible without pretending it is an identity.
  describe("the fiscal forward view", () => {
    it("states this administration's claim inside the discretionary line it is written in", () => {
      const { campaign } = foundedForBalance("opening");
      const outlook = selectFiscalOutlook(campaign, allocate(0.03, ["military", "covert"]));
      const statement = selectFiscalStatement(campaign);

      expect(outlook.discretionary).toBe(statement.outlay.discretionary);
      expect(outlook.annualDraw).toBeGreaterThan(0);
      expect(outlook.shareOfDiscretionary).toBeCloseTo(outlook.annualDraw / outlook.discretionary, 3);
      // The claim is a slice of what the country spends, not the whole of it.
      expect(outlook.shareOfDiscretionary).toBeLessThan(1);
    });

    it("does not fold the national deficit into the treasury", () => {
      const { campaign } = foundedForBalance("opening");
      const statement = selectFiscalStatement(campaign);
      const outlook = selectFiscalOutlook(campaign);

      // The country runs a deficit and the administration still opens solvent.
      // If the two books were one, the treasury would be gone inside a quarter
      // for decisions no player made.
      expect(statement.balance).toBeLessThan(0);
      expect(outlook.survivesTheYear).toBe(true);
      expect(outlook.balanceWithDraw).toBe(statement.balance - outlook.annualDraw);
    });

    it("agrees with the solvency reading about whether the year survives", () => {
      const { campaign } = foundedForBalance("opening");
      const heavy = allocate(0.04, ["military", "covert", "economic"]);
      const outlook = selectFiscalOutlook(campaign, heavy);
      expect(outlook.survivesTheYear).toBe(!selectSolvency(campaign, heavy).underfunded);
      expect(outlook.turnsFunded).toBe(selectSolvency(campaign, heavy).turnsFunded);
    });
  });
});

describe("every economy on earth has a size that moves", () => {
  const { campaign: FOUNDED } = foundedForBalance("fiscal-world-output");

  it("compounds every nation's output by its own growth each week, the smallest included", () => {
    const after = fiscalPhase(FOUNDED).reduce(apply, FOUNDED);
    for (const [id, runtime] of Object.entries(FOUNDED.nations)) {
      const { growth, gdp } = runtime.stats.economy;
      if (growth === 0) continue;
      const moved = after.nations[id as keyof typeof after.nations]!.stats.economy.gdp;
      expect(moved === gdp, id).toBe(false);
      expect(Math.sign(moved - gdp), id).toBe(Math.sign(growth));
    }
    const tuvalu = after.nations["TUV" as keyof typeof after.nations]!;
    expect(tuvalu.stats.economy.gdp).toBeCloseTo(FOUNDED.nations["TUV" as keyof typeof FOUNDED.nations]!.stats.economy.gdp * (1 + tuvalu.stats.economy.growth / 52), 3);
  });

  it("keeps a foreign government's books rather than growing its debt with its output", () => {
    // Prices move first in the week, as they do in the loop: the books deflate by them.
    const priced = macroDriftPhase(FOUNDED).reduce(apply, FOUNDED);
    const after = fiscalPhase(priced).reduce(apply, priced);
    for (const id of ["DEU", "JPN", "ARG"] as const) {
      const books = after.books![id as keyof typeof after.books]!;
      expect(books.anchor, id).toBeDefined();
      const before = FOUNDED.nations[id as keyof typeof FOUNDED.nations]!.stats;
      const now = after.nations[id as keyof typeof after.nations]!.stats;
      // A week of the identity moves a ratio by a sliver of itself, not by a week of its output's growth.
      expect(Math.abs(debtToGdp(now) / debtToGdp(before) - 1), id).toBeLessThan(0.001);
    }
  });
});

// The President's own borrowing is paid for in the President's own currency:
// a program's added spending is earmarked for the program, and the interest on
// the stock the President's choices added comes out of the discretionary line.
describe("the President's price", () => {
  const { campaign: FOUNDED } = foundedForBalance("fiscal-authority-price");
  const US = FOUNDED.founding.nation;

  function withChoiceDebt(campaign: Campaign, choiceDebt: number): Campaign {
    const books = campaign.books![US]!;
    return { ...campaign, books: { ...campaign.books, [US]: { ...books, choiceDebt } } };
  }

  it("does not enlarge the President's authority with a program's added spending", () => {
    expect(authorityCeiling(withStance(FOUNDED, "fiscal-investment"))).toBe(authorityCeiling(FOUNDED));
    expect(selectOutlay(withStance(FOUNDED, "fiscal-investment")).discretionary).toBeGreaterThan(selectOutlay(FOUNDED).discretionary);
  });

  it("shrinks the authority with a program's cut", () => {
    const idle = discretionaryAppropriation(FOUNDED);
    expect(discretionaryAppropriation(withStance(FOUNDED, "fiscal-austerity"))).toBe(Math.round((idle * (0.052 - 0.008)) / 0.052));
  });

  it("takes the interest on the President's own added stock out of the line, program or no program", () => {
    const added = 1_000_000;
    const rate = FOUNDED.books![US]!.rates.effective;
    const crowding = (added * rate) / FOUNDED.nations[US]!.stats.economy.costOfLiving;
    for (const stance of ["fiscal-investment", "fiscal-austerity"]) {
      const clean = withStance(FOUNDED, stance);
      const crowded = withChoiceDebt(clean, added);
      expect(discretionaryAppropriation(clean) - discretionaryAppropriation(crowded), stance).toBeCloseTo(crowding, -1);
      expect(authorityCeiling(crowded), stance).toBe(Math.round(discretionaryAppropriation(crowded) * 0.25));
      // The outlay line and the authority fall together, so the books agree.
      expect(selectOutlay(clean).discretionary - selectOutlay(crowded).discretionary, stance).toBeCloseTo(added * rate, -1);
    }
  });

  it("accrues the stock a program adds, and returns room to a President paying it down", () => {
    const investing = fiscalPhase(withStance(FOUNDED, "fiscal-investment")).reduce(apply, withStance(FOUNDED, "fiscal-investment"));
    expect(investing.books![US]!.choiceDebt!).toBeGreaterThan(0);
    const consolidating = fiscalPhase(withStance(FOUNDED, "fiscal-austerity")).reduce(apply, withStance(FOUNDED, "fiscal-austerity"));
    expect(consolidating.books![US]!.choiceDebt!).toBeLessThan(0);
    expect(discretionaryAppropriation(withChoiceDebt(FOUNDED, -1_000_000))).toBeGreaterThan(discretionaryAppropriation(FOUNDED));
  });
});

describe("the mark", () => {
  const { campaign: FOUNDED } = foundedForBalance("fiscal-mark");

  it("keeps the week's apportionment and accrual off the Record", () => {
    const spent = { ...FOUNDED, player: { ...FOUNDED.player, metrics: { ...FOUNDED.player.metrics, treasury: 1_000 } } };
    const apportioned = apportionmentPhase(spent);
    expect(apportioned).toHaveLength(1);
    expect(apportioned[0]!.background).toBe(true);
    const [accrual] = fiscalPhase(FOUNDED);
    expect(accrual!.background).toBe(true);
    expect(accrual!.narration.summary).toMatch(/^The week adds [\d,]+ million to the federal debt\.$/);
  });
});

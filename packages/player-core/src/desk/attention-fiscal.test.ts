import { describe, expect, it } from "vitest";
import { openingDebtLimit, selectBooksOpening, selectDateOfTurn, selectFiscalStatement, type Campaign, type DebtLimitState, type NationBooks } from "@admin/engine";
import { openingCampaign } from "../__fixtures__/opening";
import { fiscalAttentionItems } from "./attention-fiscal";

const base = openingCampaign();
const US = base.founding.nation;

// selectDebtLimit reads campaign.debtLimit (falling back to openingDebtLimit),
// so a scenario sets the record's own headroomWeeks and bindingSince rather
// than a stats.economy.debt figure the limit no longer derives its ceiling
// from directly: the ceiling is the laws on the books, not a flat share of
// GDP.
function withLimit(campaign: Campaign, patch: Partial<DebtLimitState>): Campaign {
  return { ...campaign, debtLimit: { ...openingDebtLimit(campaign), ...patch } };
}

function withBooks(campaign: Campaign, patch: (books: NationBooks) => Partial<NationBooks>): Campaign {
  const books = campaign.books![US]!;
  return { ...campaign, books: { ...campaign.books, [US]: { ...books, ...patch(books) } } };
}

const interestShare = (campaign: Campaign) => {
  const statement = selectFiscalStatement(campaign);
  return statement.outlay.debtService / statement.revenueTotal;
};

describe("the Desk's fiscal rows", () => {
  it("arms nothing at the oath: neither a negative outlook nor a binding limit is true on Day One", () => {
    expect(fiscalAttentionItems(base)).toEqual([]);
  });

  it("raises the outlook row once the stored rating turns negative", () => {
    const books = base.books![US]!;
    const negative = {
      ...base,
      books: { ...base.books, [US]: { ...books, rating: { ...books.rating, outlook: "negative" as const } } },
    };
    const rows = fiscalAttentionItems(negative);
    expect(rows.map((row) => row.id)).toContain("fiscal:outlook-negative");
    // A notice: the room it opens holds no act that answers a rating agency.
    expect(rows.find((row) => row.id === "fiscal:outlook-negative")?.urgency).toBe("ambient");
    // The door opens the room's fiscal tab, where the rating is read.
    expect(rows.find((row) => row.id === "fiscal:outlook-negative")?.href).toBe("/nation/budget?view=books#books-position");
  });

  it("puts the ceiling's approach and its crossing on the calendar as notices, each with its date", () => {
    // Comfortably outside the warning window: no row at all.
    const clear = fiscalAttentionItems(withLimit(base, { headroomWeeks: 40 })).find((row) => row.id.startsWith("fiscal:debt-limit"));
    expect(clear).toBeUndefined();

    // Inside the warning window, not yet binding: the approach, dated the week the room runs out.
    const approaching = fiscalAttentionItems(withLimit(base, { headroomWeeks: 6 })).find((row) => row.id === "fiscal:debt-limit-approaching");
    expect(approaching?.urgency).toBe("ambient");
    expect(approaching?.dueDate).toEqual(selectDateOfTurn(base, base.turn + 6));

    // Binding: the crossing, regardless of the headroom the record still carries.
    const crossed = fiscalAttentionItems(withLimit(base, { headroomWeeks: 0, bindingSince: base.turn, measuresLeft: 1_000 })).find(
      (row) => row.id === "fiscal:debt-limit",
    );
    expect(crossed?.urgency).toBe("ambient");
  });

  it("reads a rating cut against the notch the books opened on", () => {
    const opening = selectBooksOpening(base)!;
    expect(fiscalAttentionItems(withBooks(base, (books) => ({ rating: { ...books.rating, score: opening.score } })))).toEqual([]);
    const cut = fiscalAttentionItems(withBooks(base, (books) => ({ rating: { ...books.rating, score: opening.score - 1 } }))).find((row) => row.id === "fiscal:rating-cut");
    expect(cut?.urgency).toBe("ambient");
    expect(cut?.reason).toMatch(/down from AA\+?/);
  });

  it("raises the coupon row on a quarter point inside thirteen weeks, and not on less or on a trail too short to tell", () => {
    const trail = (rise: number, weeks: number) =>
      withBooks(base, () => ({
        trail: {
          readings: Array.from({ length: weeks + 1 }, (_, i) => ({ turn: base.turn - weeks + i, market: 0.045 + (rise * i) / weeks, debtToGdp: 1 })),
        },
      }));
    expect(fiscalAttentionItems(trail(0.0024, 13)).some((row) => row.id === "fiscal:coupon-jump")).toBe(false);
    expect(fiscalAttentionItems(trail(0.01, 12)).some((row) => row.id === "fiscal:coupon-jump")).toBe(false);
    const jump = fiscalAttentionItems(trail(0.003, 13)).find((row) => row.id === "fiscal:coupon-jump");
    expect(jump?.figure).toBe("+30 bp");
  });

  it("raises the interest row when interest passes a quarter of revenue, having opened under it", () => {
    const opened = (share: number, effective: number) =>
      withBooks(base, (books) => ({ rates: { ...books.rates, effective }, trail: { readings: [], openingInterestShare: share } }));
    const heavy = opened(0.2, 0.09);
    expect(interestShare(heavy)).toBeGreaterThan(0.25);
    expect(fiscalAttentionItems(heavy).find((row) => row.id === "fiscal:interest-share")?.urgency).toBe("ambient");
    // Already past the line at the oath: a fact the President inherited, not news.
    expect(fiscalAttentionItems(opened(0.3, 0.09)).some((row) => row.id === "fiscal:interest-share")).toBe(false);
    // Opened under it and still under it.
    expect(fiscalAttentionItems(opened(0.2, base.books![US]!.rates.effective)).some((row) => row.id === "fiscal:interest-share")).toBe(false);
  });
});

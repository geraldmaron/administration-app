import { debtToGdp } from "@admin/world";
import { describe, expect, it } from "vitest";
import { foundedForBalance } from "./balance-harness.js";
import { BOOKS_TRAIL_LENGTH, extendTrail, selectBooksChange, selectBooksOpening } from "./books-trail.js";
import { campaignTurnPhases } from "./turn-phases.js";
import { advanceTurn } from "./turn-loop.js";
import { selectFiscalStatement } from "./fiscal.js";
import type { Campaign } from "./state.js";

// What the books remember of themselves: nothing they never kept, the oath
// they opened on, and a year of weeks behind the one they are in.

const { campaign: FOUNDED, charter } = foundedForBalance("books-trail");
const US = FOUNDED.founding.nation;
const PHASES = campaignTurnPhases(charter);

function weeks(from: Campaign, count: number): Campaign[] {
  const states: Campaign[] = [];
  let state = from;
  for (let week = 0; week < count; week += 1) {
    state = advanceTurn(state, PHASES);
    states.push(state);
  }
  return states;
}

const RUN = weeks(FOUNDED, 60);

describe("the books' trail", () => {
  it("reports no change on books that have kept no trail", () => {
    expect(FOUNDED.books?.[US]?.trail).toBeUndefined();
    expect(selectBooksChange(FOUNDED, 13)).toBeUndefined();
    expect(selectBooksChange(FOUNDED, 52)).toBeUndefined();
  });

  it("opens on the oath's notch and the country's own ratio", () => {
    const anchor = FOUNDED.books![US]!.anchor!;
    const opening = selectBooksOpening(FOUNDED);
    expect(opening).toEqual({ turn: anchor.openedTurn, score: anchor.score, debtToGdp: debtToGdp(FOUNDED.nations[US]!.base.stats) });
  });

  it("has no opening before the books are anchored", () => {
    const { books: _books, ...unopened } = FOUNDED;
    expect(selectBooksOpening(unopened)).toBeUndefined();
  });

  it("keeps one reading a week of the coupon market rate and the debt ratio, newest last", () => {
    const first = RUN[0]!.books![US]!.trail!;
    expect(first.readings).toHaveLength(1);
    const books = RUN[0]!.books![US]!;
    expect(first.readings[0]).toEqual({ turn: RUN[0]!.turn, market: books.rates.market, debtToGdp: expect.closeTo(debtToGdp(RUN[0]!.nations[US]!.stats), 5) });
    expect(RUN[9]!.books![US]!.trail!.readings.map((reading) => reading.turn)).toEqual(RUN.slice(0, 10).map((state) => state.turn));
  });

  it("keeps a year and no more", () => {
    const trail = RUN.at(-1)!.books![US]!.trail!;
    expect(trail.readings).toHaveLength(BOOKS_TRAIL_LENGTH);
    expect(trail.readings[0]!.turn).toBe(RUN.at(-1)!.turn - 52);
  });

  it("records the share of revenue interest took on the week the books were opened", () => {
    const statement = selectFiscalStatement(FOUNDED);
    const opening = RUN.at(-1)!.books![US]!.trail!.openingInterestShare!;
    // Read off the statement the first week was booked on, which the week's
    // earlier phases have already moved a hair from the founding's.
    expect(opening).toBeCloseTo(statement.outlay.debtService / statement.revenueTotal, 3);
    expect(selectBooksOpening(RUN.at(-1)!)!.interestShare).toBe(opening);
  });

  it("reports a year's change only once the trail reaches back a year", () => {
    expect(selectBooksChange(RUN[50]!, 52)).toBeUndefined();
    const year = selectBooksChange(RUN[52]!, 52)!;
    expect(year.toTurn - year.fromTurn).toBe(52);
    expect(year.debtToGdp.from).toBe(RUN[0]!.books![US]!.trail!.readings[0]!.debtToGdp);
    expect(year.market.to).toBe(RUN[52]!.books![US]!.rates.market);
    expect(selectBooksChange(RUN[20]!, 13)!.fromTurn).toBe(RUN[20]!.turn - 13);
  });

  it("starts the trail on a save that kept none without forgiving it an opening", () => {
    const loaded = RUN[29]!;
    const { trail: _trail, ...untrailed } = loaded.books![US]!;
    const [next] = weeks({ ...loaded, books: { ...loaded.books, [US]: untrailed } }, 1);
    const trail = next!.books![US]!.trail!;
    expect(trail.readings).toHaveLength(1);
    expect(trail.openingInterestShare).toBeUndefined();
    expect(selectBooksOpening(next!)!.interestShare).toBeUndefined();
    expect(selectBooksChange(next!, 1)).toBeUndefined();
  });

  it("drops the oldest reading once it holds a year", () => {
    const full = { readings: Array.from({ length: BOOKS_TRAIL_LENGTH }, (_, turn) => ({ turn, market: 0.05, debtToGdp: 1 })), openingInterestShare: 0.2 };
    const next = extendTrail(full, { turn: BOOKS_TRAIL_LENGTH, market: 0.051, debtToGdp: 1.01 }, 0.3);
    expect(next.readings).toHaveLength(BOOKS_TRAIL_LENGTH);
    expect(next.readings[0]!.turn).toBe(1);
    expect(next.openingInterestShare).toBe(0.2);
  });
});

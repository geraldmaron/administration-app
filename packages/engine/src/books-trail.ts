import { debtToGdp } from "@admin/world";
import { selectNation, type Campaign } from "./state.js";
import type { NationBooks } from "./national-books.js";

// The United States' books keep a short memory of themselves, so a screen can
// say how far the coupon rate and the debt ratio have moved and what the oath
// opened on, instead of only where they are going. It lives beside the books
// rather than in them because the weekly step never reads it back.

/** One week's reading of the books, as the trail keeps it. */
export type BooksTrailReading = {
  readonly turn: number;
  /** What new coupon borrowing cost that week, as a fraction a year. */
  readonly market: number;
  readonly debtToGdp: number;
};

/**
 * The last weeks of the books, newest last. A record without one was kept
 * before the trail existed: the trail starts the week it is next written, and
 * no reading it never took is forgiven into it.
 */
export type BooksTrail = {
  /** At most 53 weekly readings, enough to reach back a full year. */
  readonly readings: readonly BooksTrailReading[];
  /** Interest as a share of revenue on the week the books were opened. */
  readonly openingInterestShare?: number;
};

/** The books' move between two kept weeks. */
export type BooksChange = {
  readonly fromTurn: number;
  readonly toTurn: number;
  readonly debtToGdp: { readonly from: number; readonly to: number };
  readonly market: { readonly from: number; readonly to: number };
};

/** What the books opened on at the oath. */
export type BooksOpening = {
  readonly turn: number;
  /** The rating's notch at the oath. */
  readonly score: number;
  readonly debtToGdp: number;
  /** Interest as a share of revenue at the oath; absent where the trail never kept it. */
  readonly interestShare?: number;
};

/** The most readings a trail keeps: this week and the 52 before it. */
export const BOOKS_TRAIL_LENGTH = 53;

/**
 * The trail a week of the books leaves, the new reading last and the oldest
 * dropped past a year. The opening share is written only on the week the books
 * were opened, so a trail begun on a save that predates it never claims to
 * know what the oath opened on.
 */
export function extendTrail(trail: BooksTrail | undefined, reading: BooksTrailReading, openingInterestShare?: number): BooksTrail {
  const readings = [...(trail?.readings ?? []), reading].slice(-BOOKS_TRAIL_LENGTH);
  const opening = trail ? trail.openingInterestShare : openingInterestShare;
  return { readings, ...(opening !== undefined ? { openingInterestShare: opening } : {}) };
}

function usBooks(campaign: Campaign): NationBooks | undefined {
  return campaign.books?.[campaign.founding.nation];
}

/** How the books moved over the last `weeks`, or `undefined` while the trail does not reach back that far. */
export function selectBooksChange(campaign: Campaign, weeks: number): BooksChange | undefined {
  const readings = usBooks(campaign)?.trail?.readings ?? [];
  const to = readings.at(-1);
  if (!to || weeks < 1) return undefined;
  const from = readings.find((reading) => reading.turn === to.turn - weeks);
  if (!from) return undefined;
  return {
    fromTurn: from.turn,
    toTurn: to.turn,
    debtToGdp: { from: from.debtToGdp, to: to.debtToGdp },
    market: { from: from.market, to: to.market },
  };
}

/** What the United States' books opened on at the oath, or `undefined` before they were anchored. */
export function selectBooksOpening(campaign: Campaign): BooksOpening | undefined {
  const books = usBooks(campaign);
  const anchor = books?.anchor;
  const runtime = selectNation(campaign, campaign.founding.nation);
  if (!anchor || !runtime) return undefined;
  const interestShare = books.trail?.openingInterestShare;
  return {
    turn: anchor.openedTurn,
    score: anchor.score,
    debtToGdp: debtToGdp(runtime.base.stats),
    ...(interestShare !== undefined ? { interestShare } : {}),
  };
}

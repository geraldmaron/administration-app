import { FISCAL_ANCHORS, type NationId, type NationStats } from "@admin/world";
import type { Effect } from "./effect-types.js";
import { backstopRelief } from "./backstop.js";
import { nationName } from "./naming.js";
import { hashIndex } from "./rng.js";
import { selectActiveConditions, selectNation, type Campaign, type FeedItem } from "./state.js";

// What a government's credit is worth: its rating, which way the agencies are
// leaning, and the rate its borrowing costs.
//
// The arithmetic lives here and the history lives in the books
// (`national-books.ts`): a rating is a notch the rating agencies moved it to,
// on a date, for a reason, and a rate is what the debt was issued at, rolling a
// slice at a time toward what the market asks today. Nothing here reprices a
// stock in a week, and nothing outside this file multiplies an interest bill.

export type SovereignRating = NationStats["economy"]["sovereignRating"];

export type RatingOutlook = "positive" | "stable" | "negative";

/**
 * The rate a government's debt costs at a letter, where no better figure for
 * it exists. What a foreign government's books open at until published
 * interest bills are vendored for it: the stationary fallback, which holds its
 * ratio where it was found.
 */
const DEBT_SERVICE_RATES: Readonly<Record<string, number>> = {
  AAA: 0.028,
  AA: 0.031,
  A: 0.035,
  BBB: 0.042,
  BB: 0.055,
  B: 0.072,
  CCC: 0.095,
  D: 0.12,
};

/**
 * Each letter's middle notch on the agencies' twenty-one-notch scale, where
 * AA- is 18 and a default is 1. A rating finer than its letter needs a reading
 * the dataset does not author, so a letter alone is read at its middle.
 */
const LETTER_SCORE: Readonly<Record<SovereignRating, number>> = {
  AAA: 21,
  AA: 19,
  A: 16,
  BBB: 13,
  BB: 10,
  B: 7,
  CCC: 4,
  D: 1,
};

/** The lowest notch each letter covers. CCC runs down through CC; only a default is D. */
const LETTER_FLOOR: Readonly<Record<SovereignRating, number>> = {
  AAA: 21,
  AA: 18,
  A: 15,
  BBB: 12,
  BB: 9,
  B: 6,
  CCC: 2,
  D: 1,
};

const LETTERS_DOWN: readonly SovereignRating[] = ["AAA", "AA", "A", "BBB", "BB", "B", "CCC", "D"];

const NOTCH_NAMES: readonly string[] = [
  "D", "CC", "CCC-", "CCC", "CCC+", "B-", "B", "B+", "BB-", "BB", "BB+",
  "BBB-", "BBB", "BBB+", "A-", "A", "A+", "AA-", "AA", "AA+", "AAA",
];

export const TOP_NOTCH = 21;
/** The lowest notch fundamentals can take a government that has not defaulted. */
export const LOWEST_UNDEFAULTED_NOTCH = 2;

/** The annual rate a government pays on its debt at a letter. */
export function tierRate(rating: SovereignRating): number {
  return DEBT_SERVICE_RATES[rating] ?? 0.05;
}

export function letterScore(rating: SovereignRating): number {
  return LETTER_SCORE[rating];
}

/** The letter a notch sits in. */
export function letterOfScore(score: number): SovereignRating {
  return LETTERS_DOWN.find((letter) => score >= LETTER_FLOOR[letter]) ?? "D";
}

/** A notch held inside a letter's own range, so a reading finer than the letter never contradicts it. */
export function clampToLetter(score: number, letter: SovereignRating): number {
  const index = LETTERS_DOWN.indexOf(letter);
  const ceiling = index <= 0 ? TOP_NOTCH : LETTER_FLOOR[LETTERS_DOWN[index - 1]!] - 1;
  return Math.min(ceiling, Math.max(LETTER_FLOOR[letter], Math.round(score)));
}

/** The notch as the agencies write it: "AA+", "BBB-". */
export function notchName(score: number): string {
  return NOTCH_NAMES[Math.min(TOP_NOTCH, Math.max(1, Math.round(score))) - 1]!;
}

/**
 * What the market charges over a top-rated government, per notch, as an annual
 * rate. Nothing at AA- and above, which is why a top-tier downgrade moves no
 * rate; then roughly what emerging-market spreads run at each band, widening
 * fastest where default stops being a remote possibility.
 */
const SPREAD_ANCHORS: readonly (readonly [number, number])[] = [
  [18, 0],
  [16, 0.003],
  [13, 0.01],
  [10, 0.025],
  [7, 0.045],
  [3.5, 0.08],
  [1, 0.15],
];

export function ratingSpread(score: number): number {
  if (score >= SPREAD_ANCHORS[0]![0]) return 0;
  for (let index = 1; index < SPREAD_ANCHORS.length; index += 1) {
    const [lo, loSpread] = SPREAD_ANCHORS[index]!;
    const [hi, hiSpread] = SPREAD_ANCHORS[index - 1]!;
    if (score >= lo) return loSpread + ((score - lo) / (hi - lo)) * (hiSpread - loSpread);
  }
  return SPREAD_ANCHORS.at(-1)![1];
}

// --- Rates ------------------------------------------------------------------

/** The share of US marketable debt held in bills (Treasury, TBAC FY2026 Q1). */
export const US_BILL_SHARE = 0.217;
/** The average rate on US bills outstanding, 2026-08-31 (Treasury Fiscal Data). */
export const US_BILL_RATE_OPEN = 0.03788;
/** The average rate on all US interest-bearing debt, 2026-08-31 (Treasury Fiscal Data). */
export const US_EFFECTIVE_RATE_OPEN = 0.0349;
/** What the notes and bonds must average for the whole stock to cost the published average. */
export const US_COUPON_RATE_OPEN = (US_EFFECTIVE_RATE_OPEN - US_BILL_SHARE * US_BILL_RATE_OPEN) / (1 - US_BILL_SHARE);
/**
 * The ten-year Treasury yield the books open on: the par curve's ten-year on
 * the world's as-of date, 5.11% on 2026-09-23 (Treasury daily par yield curve).
 *
 * The world is pinned to that date, and a President inherits the market's
 * rate, not a budget office's projection the market has already passed. The
 * drift the old reading showed was the projection pricing no repricing, which
 * `usDecadeEffectiveRate` now carries from the oath.
 */
export const US_COUPON_MARKET_OPEN = 0.0511;

/** Bills mature inside a quarter, so the whole bill stock turns over about four times a year. */
const BILL_ROLLOVER_PER_YEAR = 4;
/**
 * Notes and bonds carry about 7.4 years of remaining maturity once bills are
 * set aside, and a ladder with that average retires one over twice it a year:
 * the notes issued a decade ago mature this year, the ones issued last year do
 * not.
 */
const COUPON_ROLLOVER_PER_YEAR = 1 / (2 * 7.4);
/** A foreign government's whole stock, blended: about a fifth a year, from a six-year maturity with some bills. */
const FOREIGN_ROLLOVER_PER_YEAR = 0.22;
/** Basis points of yield per point of the projected debt ratio: between CBO's 2 and NBER's 3. */
const PROJECTION_PRICE = 0.025;
/** How much of a move in the policy rate the long end carries. */
const POLICY_PASS_THROUGH = 0.3;
/** No government borrows for nothing, whatever its central bank does. */
const MARKET_RATE_FLOOR = 0.005;

/** What moved since the books were opened, each as a change in an annual rate or a ratio. */
export type MarketMoves = {
  readonly policyRate: number;
  readonly expectedInflation: number;
  readonly projected: number;
  readonly spread: number;
  readonly crisis: number;
};

/**
 * What a new ten-year note costs the United States: the opening yield, moved by
 * the policy rate at the short end and expected inflation at the long, by where
 * the debt is projected to be in ten years, by the rating's spread, and by a
 * crisis premium while one is open.
 */
export function usCouponMarketRate(opening: number, moves: MarketMoves): number {
  return (
    opening +
    POLICY_PASS_THROUGH * moves.policyRate +
    (1 - POLICY_PASS_THROUGH) * moves.expectedInflation +
    PROJECTION_PRICE * moves.projected +
    moves.spread +
    moves.crisis
  );
}

/**
 * What new borrowing costs a foreign government. Inflation reaches only the
 * part of the debt written in its own currency: a loan in dollars is not repaid
 * in the pesos inflation cheapened.
 */
export function foreignMarketRate(opening: number, moves: MarketMoves, nonErodible: number): number {
  const local = 1 - nonErodible;
  return Math.max(
    MARKET_RATE_FLOOR,
    opening +
      local * (moves.expectedInflation + POLICY_PASS_THROUGH * moves.policyRate) +
      PROJECTION_PRICE * moves.projected +
      moves.spread +
      moves.crisis,
  );
}

/** One week of a stock rolling over toward what the market charges now, at `perYear` of itself a year. */
export function rollToward(rate: number, market: number, perYear: number): number {
  return rate + (market - rate) * Math.min(1, Math.max(0, perYear) / 52);
}

export function rollBills(rate: number, policyRate: number): number {
  return rollToward(rate, policyRate, BILL_ROLLOVER_PER_YEAR);
}

/** New borrowing is issued at today's rate too, so a government borrowing hard reprices faster. */
export function rollCoupons(rate: number, market: number, newBorrowingShare: number): number {
  return rollToward(rate, market, COUPON_ROLLOVER_PER_YEAR + newBorrowingShare);
}

export function rollForeign(rate: number, market: number, newBorrowingShare: number, perYear = FOREIGN_ROLLOVER_PER_YEAR): number {
  return rollToward(rate, market, perYear + newBorrowingShare);
}

export function usEffectiveRate(bills: number, coupons: number): number {
  return US_BILL_SHARE * bills + (1 - US_BILL_SHARE) * coupons;
}

/**
 * What the United States' stock costs on average over the next ten years as it
 * rolls over: bills at the policy rate within a quarter, and the notes and bonds
 * toward the market rate a slice a year. A projection priced at today's
 * effective rate misses the repricing the market already expects, then finds it
 * a week at a time and reads each week of it as fresh news about the debt.
 */
export function usDecadeEffectiveRate(coupons: number, market: number, policyRate: number): number {
  const turned = COUPON_ROLLOVER_PER_YEAR * 10;
  const repricedOnAverage = 1 - (1 - Math.exp(-turned)) / turned;
  return usEffectiveRate(policyRate, coupons + (market - coupons) * repricedOnAverage);
}

/**
 * The share of a government's debt inflation cannot erode, by rule where no
 * figure is published: rich issuers borrow in their own money, poor ones
 * mostly cannot.
 */
export function nonErodibleShare(wealthTier: number): number {
  if (wealthTier >= 4) return 0.05;
  if (wealthTier === 3) return 0.3;
  return 0.55;
}

/** The share of a government's debt written in foreign currency, from the World Bank where it publishes one, else the rule. */
export function nonErodibleShareOf(nation: { readonly base: { readonly id: NationId; readonly bands: { readonly wealthTier: number } } }): number {
  return FISCAL_ANCHORS[nation.base.id]?.foreignCurrencyShare?.value ?? nonErodibleShare(nation.base.bands.wealthTier);
}

/**
 * The notch a government's books open on: the agencies' own average where the
 * World Bank has one, held inside the letter the dataset authors, so a
 * government's letter never changes on the day it is founded.
 */
export function openingScore(nation: NationId, letter: SovereignRating): number {
  const published = FISCAL_ANCHORS[nation]?.rating?.value;
  return clampToLetter(published ?? letterScore(letter), letter);
}

/** What a foreign government's stock costs when its books open: its published interest over its debt, else its letter's rate. */
export function openingRate(nation: NationId, letter: SovereignRating): number {
  return FISCAL_ANCHORS[nation]?.effectiveRate?.value ?? tierRate(letter);
}

/**
 * How fast a foreign government's whole stock turns over, bills and bonds
 * blended: about once per its average maturity where that is published, and a
 * fifth a year where it is not.
 */
export function foreignRollover(nation: NationId): number {
  const maturity = FISCAL_ANCHORS[nation]?.maturityYears?.value;
  return maturity !== undefined && maturity > 0 ? 1 / maturity : FOREIGN_ROLLOVER_PER_YEAR;
}

/** Whether the World Bank publishes the figures a government's books open on, or they open on the engine's rules. */
export function publishesFiscalFigures(nation: NationId): boolean {
  const anchor = FISCAL_ANCHORS[nation];
  return anchor?.effectiveRate !== undefined || anchor?.foreignCurrencyShare !== undefined;
}

/**
 * The premium a fiscal crisis puts on new issuance, by how deep it runs: a
 * reserve-currency economy pays less for the same panic than one whose lenders
 * can leave. Capped once it has run a year, because a market that has priced a
 * crisis for twelve months is pricing the government, not the panic.
 */
export function crisisPremium(wealthTier: number, severity: number, weeksOpen: number): number {
  const premium = (wealthTier >= 4 ? 0.015 : 0.04) * severity;
  return weeksOpen > 52 ? Math.min(0.03, premium) : premium;
}

// --- What the agencies and the market read --------------------------------------

export type BurdenInputs = {
  readonly rate: number;
  readonly ratio: number;
  readonly revenueShare: number;
  readonly expectedInflation: number;
  readonly usInflation: number;
  readonly nonErodible: number;
};

/**
 * Real interest as a share of revenue, the burden the agencies read. Inflation
 * compensation is taken out, so a price shock that raises the nominal bill and
 * erodes the debt in the same breath cannot move a rating by itself.
 */
export function interestBurden(inputs: BurdenInputs): number {
  const real =
    inputs.rate - (1 - inputs.nonErodible) * inputs.expectedInflation - inputs.nonErodible * inputs.usInflation;
  return (real * inputs.ratio) / Math.max(0.05, inputs.revenueShare);
}

export type ProjectionInputs = {
  readonly ratio: number;
  readonly rate: number;
  readonly growth: number;
  readonly inflation: number;
  readonly usInflation: number;
  readonly nonErodible: number;
  /** The structural primary balance, as a share of output. */
  readonly primaryBalance: number;
};

/**
 * Where the ratio is headed in ten years at today's structural balance and
 * rates: a year of the same identity the weekly books run, taken ten times
 * over. What the agencies and the market both price, rather than where the
 * ratio happens to sit this week.
 */
export function ratioInTenYears(inputs: ProjectionInputs): number {
  const local = (1 - inputs.nonErodible) * (1 + inputs.rate);
  const foreign = inputs.nonErodible * (1 + inputs.rate) * ((1 + inputs.inflation) / (1 + inputs.usInflation));
  const drift = inputs.ratio * ((local + foreign) / ((1 + inputs.growth) * (1 + inputs.inflation)) - 1);
  return inputs.ratio + 10 * (drift - inputs.primaryBalance);
}

/** What an open fiscal crisis does to a government's credit this week. */
export type CrisisReading = { readonly premium: number; readonly notch: number };

export const NO_CRISIS: CrisisReading = { premium: 0, notch: 0 };

/** Every government in a fiscal crisis this week, and what the crisis costs its borrowing. */
export function fiscalCrises(campaign: Campaign): ReadonlyMap<NationId, CrisisReading> {
  const crises = new Map<NationId, CrisisReading>();
  for (const condition of selectActiveConditions(campaign)) {
    if (condition.kind !== "fiscal-crisis") continue;
    const tier = selectNation(campaign, condition.nation)?.base.bands.wealthTier ?? 1;
    const weeksOpen = campaign.turn - condition.startedTurn;
    // A backstop is priced out of the premium rather than out of the crisis: the
    // crisis is still open, the market is simply charging less for it.
    const relief = backstopRelief(campaign, condition.nation);
    const premium = Math.max(0, crisisPremium(tier, condition.severity, weeksOpen) - relief.premium);
    crises.set(condition.nation, { premium, notch: 1 });
  }
  return crises;
}

// --- The rating -------------------------------------------------------------

/** How a government stands with the rating agencies. */
export type RatingState = {
  /** The notch on the agencies' scale, 1 (default) to 21 (AAA). */
  readonly score: number;
  readonly outlook: RatingOutlook;
  readonly negativeSince?: number;
  readonly positiveSince?: number;
  readonly lastActionTurn?: number;
};

/** What the agencies weigh, against where each stood when the books were opened. */
export type RatingFundamentals = {
  /** Real interest as a share of revenue. */
  readonly burden: number;
  /** The debt ratio ten years out on the structural balance. */
  readonly projected: number;
  /** A notch for a brush with default at the debt limit. */
  readonly governance: number;
  /** A notch while a fiscal crisis is open. */
  readonly crisis: number;
};

/** Twelve points of revenue going to real interest is worth a notch; so are sixty points of projected ratio. */
const BURDEN_PER_NOTCH = 0.12;
const PROJECTION_PER_NOTCH = 0.6;

/** Where the rating and its readings stood when the books were opened. */
export type RatingOpening = { readonly score: number; readonly burden: number; readonly projected: number };

/** Where the fundamentals would put the rating, as a continuous notch. */
export function fundamentalScore(opening: RatingOpening, now: RatingFundamentals): number {
  return (
    opening.score -
    (now.burden - opening.burden) / BURDEN_PER_NOTCH -
    (now.projected - opening.projected) / PROJECTION_PER_NOTCH -
    now.governance -
    now.crisis
  );
}

export const REVIEW_WEEKS = 26;
const NEGATIVE_AT = -0.33;
const NEGATIVE_CLEARS_ABOVE = -0.2;
const CUT_AT = -1;
const POSITIVE_AT = 0.5;
const POSITIVE_CLEARS_BELOW = 0.3;
const UPGRADE_AT = 1.5;

/** Each government is reviewed twice a year, on its own week, so the world's reviews do not all land at once. */
export function reviewOffset(nation: NationId): number {
  return hashIndex(`rating-review:${nation}`, REVIEW_WEEKS);
}

export function reviewDue(nation: NationId, turn: number): boolean {
  return (((turn - reviewOffset(nation)) % REVIEW_WEEKS) + REVIEW_WEEKS) % REVIEW_WEEKS === 0;
}

export function nextReviewTurn(nation: NationId, turn: number): number {
  const since = (((turn - reviewOffset(nation)) % REVIEW_WEEKS) + REVIEW_WEEKS) % REVIEW_WEEKS;
  return since === 0 ? turn : turn + REVIEW_WEEKS - since;
}

export type RatingActionKind = "downgrade" | "upgrade" | "outlook";

export type RatingAction = {
  readonly kind: RatingActionKind;
  readonly from: RatingState;
  readonly to: RatingState;
};

/**
 * One review: an outlook is a warning and a cut is the warning kept. A notch
 * falls only after half a year on negative watch and a full notch of
 * deterioration, which is why agencies lag the numbers rather than chase them.
 * A default is not the fundamentals' to lift, and fundamentals take nobody else
 * below CC.
 */
export function reviewRating(state: RatingState, fundamental: number, turn: number): { readonly state: RatingState; readonly action?: RatingAction } {
  if (state.score <= 1) return { state };
  const gap = fundamental - state.score;
  const next = nextRating(state, gap, turn);
  if (next === state) return { state };
  const kind: RatingActionKind =
    next.score < state.score ? "downgrade" : next.score > state.score ? "upgrade" : "outlook";
  return { state: next, action: { kind, from: state, to: next } };
}

function nextRating(state: RatingState, gap: number, turn: number): RatingState {
  const watchedNegative = state.outlook === "negative" && turn - (state.negativeSince ?? turn) >= REVIEW_WEEKS;
  if (gap <= CUT_AT && watchedNegative && state.score > LOWEST_UNDEFAULTED_NOTCH) {
    return settledOutlook({ score: state.score - 1, outlook: "stable", lastActionTurn: turn }, gap + 1, turn);
  }
  const watchedPositive = state.outlook === "positive" && turn - (state.positiveSince ?? turn) >= REVIEW_WEEKS;
  if (gap >= UPGRADE_AT && watchedPositive && state.score < TOP_NOTCH) {
    return settledOutlook({ score: state.score + 1, outlook: "stable", lastActionTurn: turn }, gap - 1, turn);
  }
  if (gap <= NEGATIVE_AT && state.outlook !== "negative") return { ...withoutWatch(state), outlook: "negative", negativeSince: turn, lastActionTurn: turn };
  if (gap >= POSITIVE_AT && state.outlook !== "positive") return { ...withoutWatch(state), outlook: "positive", positiveSince: turn, lastActionTurn: turn };
  const clears =
    (state.outlook === "negative" && gap > NEGATIVE_CLEARS_ABOVE) || (state.outlook === "positive" && gap < POSITIVE_CLEARS_BELOW);
  return clears ? { ...withoutWatch(state), outlook: "stable", lastActionTurn: turn } : state;
}

/** After a notch moves, the outlook is read again against the new notch, and a warning still owed starts a fresh watch. */
function settledOutlook(moved: RatingState, gap: number, turn: number): RatingState {
  if (gap <= NEGATIVE_AT) return { ...moved, outlook: "negative", negativeSince: turn };
  if (gap >= POSITIVE_AT) return { ...moved, outlook: "positive", positiveSince: turn };
  return moved;
}

function withoutWatch(state: RatingState): RatingState {
  const { negativeSince: _negative, positiveSince: _positive, ...rest } = state;
  return rest;
}

// --- What the agencies say -------------------------------------------------------

export type RatingCause = "interest" | "path" | "limit" | "crisis";

/** Which of the agencies' readings moved the rating furthest, in the direction it moved. */
export function ratingCause(opening: RatingOpening, now: RatingFundamentals, worse: boolean): RatingCause {
  const pulls: readonly (readonly [RatingCause, number])[] = [
    ["interest", -(now.burden - opening.burden) / BURDEN_PER_NOTCH],
    ["path", -(now.projected - opening.projected) / PROJECTION_PER_NOTCH],
    ["limit", -now.governance],
    ["crisis", -now.crisis],
  ];
  const sign = worse ? 1 : -1;
  return [...pulls].sort((a, b) => sign * (a[1] - b[1]))[0]![0];
}

const CAUSE_WORDS: Readonly<Record<RatingCause, { readonly worse: string; readonly better: string }>> = {
  interest: { worse: "the rising cost of interest on the debt", better: "a lighter interest bill" },
  path: { worse: "where the debt is headed over the next decade", better: "an improving path for the debt" },
  limit: { worse: "the brush with default at the debt limit", better: "the debt limit behind it" },
  crisis: { worse: "the fiscal crisis", better: "the fiscal crisis easing" },
};

/**
 * A rating action in the agencies' own register, naming its cause. `whose`
 * says whose borrowing the cause is, where the books can tell: an inherited
 * path is named as inherited, so a President who did nothing is not read as
 * having done it.
 */
export function ratingActionSentence(name: string, action: RatingAction, cause: RatingCause, whose?: string): string {
  const worse = action.to.score < action.from.score || action.to.outlook === "negative";
  const reason = `${worse ? CAUSE_WORDS[cause].worse : CAUSE_WORDS[cause].better}${whose && (cause === "interest" || cause === "path") ? ` ${whose}` : ""}`;
  const from = notchName(action.from.score);
  const to = notchName(action.to.score);
  if (action.kind === "downgrade") return `The rating agencies cut ${name} from ${from} to ${to}, citing ${reason}.`;
  if (action.kind === "upgrade") return `The rating agencies raise ${name} from ${from} to ${to}, citing ${reason}.`;
  const owner = name.endsWith("s") ? `${name}'` : `${name}'s`;
  if (action.to.outlook === "stable") return `The rating agencies return ${owner} ${to} rating to a stable outlook.`;
  return `The rating agencies put ${owner} ${to} rating on ${action.to.outlook} outlook, citing ${reason}.`;
}

/** One line of the week for the Record: what it says, and what it does. */
export type RecordEntry = { readonly summary: string; readonly effects: readonly Effect[] };

/** What a review left a government with, as the books report it. */
export type RatingWeek = {
  readonly action?: RatingAction;
  readonly fundamentals?: RatingFundamentals;
  readonly letter?: SovereignRating;
};

/** A downgrade of the United States costs the President once, in competence and standing; none while a fiscal crisis already is. */
const US_DOWNGRADE_COST = 0.02;

function ratingFeed(campaign: Campaign, nation: NationId, headline: string): FeedItem {
  return { turn: campaign.turn + 1, kind: "governance", visibility: "public", headline, actor: nation };
}

/**
 * The United States' rating action as its own line on the Record, with the
 * cause in the agencies' words and whose borrowing it was. An outlook moves no
 * opinion: it is a warning, and a warning costs a President nothing until it is
 * kept.
 */
export function usRatingEntry(
  campaign: Campaign,
  opening: RatingOpening,
  week: RatingWeek,
  context: { readonly crisisOpen: boolean; readonly ownBorrowing: boolean },
): RecordEntry | undefined {
  const { action, fundamentals } = week;
  if (!action || !fundamentals) return undefined;
  const nation = campaign.founding.nation;
  const runtime = selectNation(campaign, nation);
  const name = runtime ? nationName(runtime.base.identity) : "the United States";
  const worse = action.to.score < action.from.score || action.to.outlook === "negative";
  const whose = context.ownBorrowing ? "and the borrowing this administration has added" : "on the books this administration inherited";
  const summary = ratingActionSentence(name, action, ratingCause(opening, fundamentals, worse), whose);
  const cost = action.kind === "downgrade" && !context.crisisOpen;
  const effects: Effect[] = [
    ...(week.letter ? [{ kind: "nationStat" as const, nation, setStats: { economy: { sovereignRating: week.letter } } }] : []),
    ...(cost ? [{ kind: "metric" as const, deltas: { standing: -US_DOWNGRADE_COST } }, { kind: "opinion" as const, deltas: { competence: -US_DOWNGRADE_COST } }] : []),
    { kind: "feed", items: [ratingFeed(campaign, nation, summary)] },
  ];
  return { summary, effects };
}

/** Downgrades abroad the President had a hand in, read into the feed; the rest of the world's are its own business. */
export function foreignDowngradeEntry(
  campaign: Campaign,
  downgrades: readonly (RatingWeek & { readonly nation: NationId; readonly opening: RatingOpening })[],
): RecordEntry | undefined {
  const lines = downgrades.flatMap((week) => {
    const runtime = selectNation(campaign, week.nation);
    if (!week.action || !week.fundamentals || !runtime) return [];
    const cause = ratingCause(week.opening, week.fundamentals, true);
    return [{ nation: week.nation, line: ratingActionSentence(nationName(runtime.base.identity), week.action, cause) }];
  });
  if (lines.length === 0) return undefined;
  return {
    summary: lines.map((entry) => entry.line).join(" "),
    effects: [{ kind: "feed", items: lines.map((entry) => ({ ...ratingFeed(campaign, entry.nation, entry.line), target: entry.nation })) }],
  };
}

// --- Readings -----------------------------------------------------------------

export type SovereignReading = {
  readonly rating: SovereignRating;
  /** The notch on the agencies' scale, 1 (default) to 21 (AAA). */
  readonly score: number;
  /** The notch as the agencies write it. */
  readonly notch: string;
  readonly outlook: RatingOutlook;
  /** The annual rate its borrowing costs, as a fraction. */
  readonly rate: number;
  /** What new borrowing costs it today, as a fraction. */
  readonly marketRate: number;
  /** What the market charges it over a top-rated government, as a fraction. */
  readonly spread: number;
  /** The turn the agencies next review it. */
  readonly nextReview: number;
  /** Whether its books open on published figures; a strip says "no published figures" where they do not. */
  readonly publishedFigures: boolean;
};

export function selectSovereign(campaign: Campaign, nation: NationId): SovereignReading | undefined {
  const runtime = selectNation(campaign, nation);
  if (!runtime) return undefined;
  const rating = runtime.stats.economy.sovereignRating;
  const books = campaign.books?.[nation];
  const score = books?.rating.score ?? letterScore(rating);
  const rate = books?.rates.effective ?? tierRate(rating);
  return {
    rating,
    score,
    notch: notchName(score),
    outlook: books?.rating.outlook ?? "stable",
    rate,
    marketRate: books?.rates.market ?? rate,
    spread: ratingSpread(score),
    nextReview: nextReviewTurn(nation, campaign.turn + 1),
    publishedFigures: publishesFiscalFigures(nation),
  };
}

/** Why a government shut out of the markets is refused aid it would have to borrow to give. */
export const CREDIT_TO_LEND = "credit enough to borrow for it: a government rated B or worse, or in a fiscal crisis, funds nothing abroad";

/** The letters at which a government can no longer borrow to spend abroad. */
const SHUT_OUT: ReadonlySet<SovereignRating> = new Set(["B", "CCC", "D"]);

/**
 * The share of what it wants to borrow a government can raise; 1 is
 * unconstrained. A government rated B or worse, or in a fiscal crisis, cannot
 * borrow to fund anything it does not have to, which is every act of aid and
 * every guarantee it would stand behind abroad.
 */
export function borrowingCapacity(campaign: Campaign, nation: NationId): number {
  const rating = selectNation(campaign, nation)?.stats.economy.sovereignRating;
  if (rating === undefined || SHUT_OUT.has(rating)) return 0;
  const inCrisis = selectActiveConditions(campaign).some((condition) => condition.nation === nation && condition.kind === "fiscal-crisis");
  return inCrisis ? 0 : 1;
}

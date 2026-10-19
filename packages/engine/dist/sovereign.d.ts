import { type NationId, type NationStats } from "@admin/world";
import type { Effect } from "./effect-types.js";
import { type Campaign } from "./state.js";
export type SovereignRating = NationStats["economy"]["sovereignRating"];
export type RatingOutlook = "positive" | "stable" | "negative";
export declare const TOP_NOTCH = 21;
/** The lowest notch fundamentals can take a government that has not defaulted. */
export declare const LOWEST_UNDEFAULTED_NOTCH = 2;
/** The annual rate a government pays on its debt at a letter. */
export declare function tierRate(rating: SovereignRating): number;
export declare function letterScore(rating: SovereignRating): number;
/** The letter a notch sits in. */
export declare function letterOfScore(score: number): SovereignRating;
/** A notch held inside a letter's own range, so a reading finer than the letter never contradicts it. */
export declare function clampToLetter(score: number, letter: SovereignRating): number;
/** The notch as the agencies write it: "AA+", "BBB-". */
export declare function notchName(score: number): string;
export declare function ratingSpread(score: number): number;
/** The share of US marketable debt held in bills (Treasury, TBAC FY2026 Q1). */
export declare const US_BILL_SHARE = 0.217;
/** The average rate on US bills outstanding, 2026-08-31 (Treasury Fiscal Data). */
export declare const US_BILL_RATE_OPEN = 0.03788;
/** The average rate on all US interest-bearing debt, 2026-08-31 (Treasury Fiscal Data). */
export declare const US_EFFECTIVE_RATE_OPEN = 0.0349;
/** What the notes and bonds must average for the whole stock to cost the published average. */
export declare const US_COUPON_RATE_OPEN: number;
/**
 * The ten-year Treasury yield the books open on: the par curve's ten-year on
 * the world's as-of date, 5.11% on 2026-09-23 (Treasury daily par yield curve).
 *
 * The world is pinned to that date, and a President inherits the market's
 * rate, not a budget office's projection the market has already passed. The
 * drift the old reading showed was the projection pricing no repricing, which
 * `usDecadeEffectiveRate` now carries from the oath.
 */
export declare const US_COUPON_MARKET_OPEN = 0.0511;
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
export declare function usCouponMarketRate(opening: number, moves: MarketMoves): number;
/**
 * What new borrowing costs a foreign government. Inflation reaches only the
 * part of the debt written in its own currency: a loan in dollars is not repaid
 * in the pesos inflation cheapened.
 */
export declare function foreignMarketRate(opening: number, moves: MarketMoves, nonErodible: number): number;
/** One week of a stock rolling over toward what the market charges now, at `perYear` of itself a year. */
export declare function rollToward(rate: number, market: number, perYear: number): number;
export declare function rollBills(rate: number, policyRate: number): number;
/** New borrowing is issued at today's rate too, so a government borrowing hard reprices faster. */
export declare function rollCoupons(rate: number, market: number, newBorrowingShare: number): number;
export declare function rollForeign(rate: number, market: number, newBorrowingShare: number, perYear?: number): number;
export declare function usEffectiveRate(bills: number, coupons: number): number;
/**
 * What the United States' stock costs on average over the next ten years as it
 * rolls over: bills at the policy rate within a quarter, and the notes and bonds
 * toward the market rate a slice a year. A projection priced at today's
 * effective rate misses the repricing the market already expects, then finds it
 * a week at a time and reads each week of it as fresh news about the debt.
 */
export declare function usDecadeEffectiveRate(coupons: number, market: number, policyRate: number): number;
/**
 * The share of a government's debt inflation cannot erode, by rule where no
 * figure is published: rich issuers borrow in their own money, poor ones
 * mostly cannot.
 */
export declare function nonErodibleShare(wealthTier: number): number;
/** The share of a government's debt written in foreign currency, from the World Bank where it publishes one, else the rule. */
export declare function nonErodibleShareOf(nation: {
    readonly base: {
        readonly id: NationId;
        readonly bands: {
            readonly wealthTier: number;
        };
    };
}): number;
/**
 * The notch a government's books open on: the agencies' own average where the
 * World Bank has one, held inside the letter the dataset authors, so a
 * government's letter never changes on the day it is founded.
 */
export declare function openingScore(nation: NationId, letter: SovereignRating): number;
/** What a foreign government's stock costs when its books open: its published interest over its debt, else its letter's rate. */
export declare function openingRate(nation: NationId, letter: SovereignRating): number;
/**
 * How fast a foreign government's whole stock turns over, bills and bonds
 * blended: about once per its average maturity where that is published, and a
 * fifth a year where it is not.
 */
export declare function foreignRollover(nation: NationId): number;
/** Whether the World Bank publishes the figures a government's books open on, or they open on the engine's rules. */
export declare function publishesFiscalFigures(nation: NationId): boolean;
/**
 * The premium a fiscal crisis puts on new issuance, by how deep it runs: a
 * reserve-currency economy pays less for the same panic than one whose lenders
 * can leave. Capped once it has run a year, because a market that has priced a
 * crisis for twelve months is pricing the government, not the panic.
 */
export declare function crisisPremium(wealthTier: number, severity: number, weeksOpen: number): number;
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
export declare function interestBurden(inputs: BurdenInputs): number;
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
export declare function ratioInTenYears(inputs: ProjectionInputs): number;
/** What an open fiscal crisis does to a government's credit this week. */
export type CrisisReading = {
    readonly premium: number;
    readonly notch: number;
};
export declare const NO_CRISIS: CrisisReading;
/** Every government in a fiscal crisis this week, and what the crisis costs its borrowing. */
export declare function fiscalCrises(campaign: Campaign): ReadonlyMap<NationId, CrisisReading>;
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
/** Where the rating and its readings stood when the books were opened. */
export type RatingOpening = {
    readonly score: number;
    readonly burden: number;
    readonly projected: number;
};
/** Where the fundamentals would put the rating, as a continuous notch. */
export declare function fundamentalScore(opening: RatingOpening, now: RatingFundamentals): number;
export declare const REVIEW_WEEKS = 26;
/** Each government is reviewed twice a year, on its own week, so the world's reviews do not all land at once. */
export declare function reviewOffset(nation: NationId): number;
export declare function reviewDue(nation: NationId, turn: number): boolean;
export declare function nextReviewTurn(nation: NationId, turn: number): number;
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
export declare function reviewRating(state: RatingState, fundamental: number, turn: number): {
    readonly state: RatingState;
    readonly action?: RatingAction;
};
export type RatingCause = "interest" | "path" | "limit" | "crisis";
/** Which of the agencies' readings moved the rating furthest, in the direction it moved. */
export declare function ratingCause(opening: RatingOpening, now: RatingFundamentals, worse: boolean): RatingCause;
/**
 * A rating action in the agencies' own register, naming its cause. `whose`
 * says whose borrowing the cause is, where the books can tell: an inherited
 * path is named as inherited, so a President who did nothing is not read as
 * having done it.
 */
export declare function ratingActionSentence(name: string, action: RatingAction, cause: RatingCause, whose?: string): string;
/** One line of the week for the Record: what it says, and what it does. */
export type RecordEntry = {
    readonly summary: string;
    readonly effects: readonly Effect[];
};
/** What a review left a government with, as the books report it. */
export type RatingWeek = {
    readonly action?: RatingAction;
    readonly fundamentals?: RatingFundamentals;
    readonly letter?: SovereignRating;
};
/**
 * The United States' rating action as its own line on the Record, with the
 * cause in the agencies' words and whose borrowing it was. An outlook moves no
 * opinion: it is a warning, and a warning costs a President nothing until it is
 * kept.
 */
export declare function usRatingEntry(campaign: Campaign, opening: RatingOpening, week: RatingWeek, context: {
    readonly crisisOpen: boolean;
    readonly ownBorrowing: boolean;
}): RecordEntry | undefined;
/** Downgrades abroad the President had a hand in, read into the feed; the rest of the world's are its own business. */
export declare function foreignDowngradeEntry(campaign: Campaign, downgrades: readonly (RatingWeek & {
    readonly nation: NationId;
    readonly opening: RatingOpening;
})[]): RecordEntry | undefined;
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
export declare function selectSovereign(campaign: Campaign, nation: NationId): SovereignReading | undefined;
/** Why a government shut out of the markets is refused aid it would have to borrow to give. */
export declare const CREDIT_TO_LEND = "credit enough to borrow for it: a government rated B or worse, or in a fiscal crisis, funds nothing abroad";
/**
 * The share of what it wants to borrow a government can raise; 1 is
 * unconstrained. A government rated B or worse, or in a fiscal crisis, cannot
 * borrow to fund anything it does not have to, which is every act of aid and
 * every guarantee it would stand behind abroad.
 */
export declare function borrowingCapacity(campaign: Campaign, nation: NationId): number;

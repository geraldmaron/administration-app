import { type NationId } from "@admin/world";
import type { Effect } from "./effect-types.js";
import { type BooksTrail } from "./books-trail.js";
export { pendingOffshoreLeaseBonus } from "./offshore-leasing.js";
import { type StructuralMix } from "./fiscal-impulse.js";
import { type CrisisReading, type RatingAction, type RatingFundamentals, type RatingState, type SovereignRating } from "./sovereign.js";
import { type Campaign, type NationRuntime, type OutlayFunction, type RevenueSource } from "./state.js";
/** Where each reading stood when the books were opened: what every later move is measured from. */
export type BooksAnchor = {
    readonly openedTurn: number;
    /** The notch the rating opened at. */
    readonly score: number;
    /** Real interest as a share of revenue. */
    readonly burden: number;
    /** The debt ratio ten years out on the structural balance. */
    readonly projected: number;
    /** What the stock cost a year, as a fraction. */
    readonly rate: number;
    /** What new borrowing cost: the ten-year yield for the United States, the blended market rate elsewhere. */
    readonly market: number;
    readonly policyRate: number;
    readonly expectedInflation: number;
    /** The structural primary balance, as a share of output: at rest abroad, on the program the President inherited at home. */
    readonly primaryBalance: number;
    /** The United States only: what the inherited program took less what it spent, as a share of output. */
    readonly programBalance?: number;
};
export type NationBooks = {
    /**
     * Annual rates as fractions. `bills` and `coupons` are the United States' two
     * tranches; `effective` is what the stock costs; `market` is what new
     * borrowing costs today.
     */
    readonly rates: {
        readonly bills?: number;
        readonly coupons?: number;
        readonly effective: number;
        readonly market?: number;
    };
    readonly rating: RatingState;
    /** How much fiscal stress the government has lived through lately; 0 is none. */
    readonly stress: number;
    /** The fiscal push on demand, as a fraction of output. */
    readonly impulse: number;
    /** Last week's structural primary balance, as a fraction of output. */
    readonly lastStructuralBalance: number;
    /** Last week's structural budget by kind, which the week's change in it is weighed against for the impulse. */
    readonly structural?: StructuralMix;
    /** The public investment authorized that has been spent, a share of output a year: what the impulse counts of it. */
    readonly investmentSpent?: number;
    /** The aid given abroad that the books have already paid for, USD millions a year. */
    readonly aidSeen: number;
    /**
     * The United States only: the stock the President's own program and laws
     * added since the oath, USD millions. Negative when the President has been
     * paying debt down.
     */
    readonly choiceDebt?: number;
    /** Absent only on a record kept before the books were anchored, which the next week reopens. */
    readonly anchor?: BooksAnchor;
    /** The United States only: the books' recent weeks; absent until the first week that keeps one. */
    readonly trail?: BooksTrail;
    /** The United States only: pay and purchases a lapse has delayed, USD millions, owed the week it ends. */
    readonly lapseArrears?: number;
    /** One-time offshore lease bonuses already included in a weekly fiscal statement. */
    readonly leaseBonusReceiptIds?: readonly string[];
};
/** Books as every weekly step reads them: anchored, with a market rate. */
export type AnchoredBooks = NationBooks & {
    readonly rates: NationBooks["rates"] & {
        readonly market: number;
    };
    readonly anchor: BooksAnchor;
};
export declare const WEEK_OF_YEAR: number;
/** Where the economy's output grows when nothing is pulling it: its own trend, without the cycle. */
export declare function trendGrowth(runtime: NationRuntime): number;
/**
 * One week of a foreign government's debt ratio: what it owes compounds at the
 * rate it pays, the part it owes in foreign money is revalued by the gap
 * between its inflation and the dollar's, output growth dilutes it, and the
 * primary balance pays it down or adds to it. The deflation by its own prices is
 * already in `ratio`: the index moved before the books were kept this week.
 */
export declare function foreignRatioStep(inputs: {
    readonly ratio: number;
    readonly rate: number;
    readonly growth: number;
    readonly inflation: number;
    readonly usInflation: number;
    readonly nonErodible: number;
    readonly primaryBalance: number;
}): number;
/**
 * One week of output growth, the step every economy's output and its potential
 * both compound by, so an economy growing at its trend holds its gap exactly
 * and a ratio is diluted by exactly the growth its output took.
 */
export declare function outputStep(growth: number): number;
/**
 * The primary balance that holds a ratio where it stands at the country's own
 * rates: the fallback wherever no published path exists, so a government the
 * game has no figures for neither borrows its way up nor pays its way down.
 */
export declare function stationaryPrimaryBalance(inputs: Omit<Parameters<typeof foreignRatioStep>[0], "primaryBalance">): number;
/**
 * A year of the customs the administration's own tariffs collect, at this
 * week's rate, from the trade register: the one path new duties reach revenue
 * by, every week a tariff stands and none after it is lifted.
 */
export declare function usCustomsReceipts(campaign: Campaign): number;
/** An aging country's pensions and health programs grow faster than its output, about a tenth of a point a year. */
export declare const AGING_PER_YEAR = 0.001;
/** Where the United States stands this week, in the units its statement is written in. */
export type UsPosition = {
    readonly runtime: NationRuntime;
    readonly books: AnchoredBooks;
    readonly price: number;
    /** Nominal output this year, and at potential, USD millions. */
    readonly output: number;
    readonly potential: number;
    /** How far output sits above its potential, as a log share. */
    readonly gap: number;
    /** Debt held by the public, USD millions. */
    readonly debt: number;
    /** Years since the books were opened. */
    readonly years: number;
    readonly nonErodible: number;
};
export declare function usPosition(campaign: Campaign): UsPosition | undefined;
export declare function usRevenueTotal(campaign: Campaign, position: UsPosition, atPotential?: boolean): number;
/**
 * Revenue by source. The take is split by the mix; the duties on the
 * administration's own tariffs are added to the tariff line on top of it,
 * because a tariff collects money the take did not.
 */
export declare function usRevenue(campaign: Campaign, position: UsPosition): Record<RevenueSource, number>;
/** What the commitments the administration carries cost per year, by the line each draws on. */
export declare function commitmentOutlay(campaign: Campaign): Record<OutlayFunction, number>;
/**
 * The interest on the stock the President's own program added, which comes out
 * of the discretionary line rather than out of new borrowing: the price of a
 * President's borrowing, paid in the one currency the President spends.
 */
export declare function usCrowding(position: UsPosition): number;
/** The discretionary line as enacted, nominal, before a lapse leaves any of it unpaid: capped or crowded, at the larger of the two. */
export declare function usDiscretionaryLine(campaign: Campaign, position: UsPosition): number;
/** What the week forces onto the statement that no budget chose: benefits for the jobless, a war, a street in revolt. Nominal, a year's rate. */
export type ForcedOutlays = {
    readonly unemployment: number;
    readonly war: number;
    readonly unrest: number;
};
export declare function usForcedOutlays(campaign: Campaign, position: UsPosition): ForcedOutlays;
/**
 * Outlays by function, before any are withheld at the debt limit. Defense is
 * the authored budget at today's prices; the programs are shares of potential
 * output moved by the program and the laws that govern them; foreign affairs is
 * the standing aid program at today's prices; interest is the stock at what it
 * was issued at. A commitment is paid out of the President's authority, which
 * is already inside the discretionary line, so it is not counted a second time;
 * the same holds for aid the President's rungs send.
 */
export declare function usOutlays(campaign: Campaign, position: UsPosition): Record<OutlayFunction, number>;
/** The budget by kind at potential output, as shares of it, with what the week forced out of it. */
export declare function usStructuralMix(campaign: Campaign, position: UsPosition, outlays?: Record<OutlayFunction, number>): StructuralMix;
/**
 * The primary balance the country would run at potential output, as a share of
 * it: what the program, the laws and the inherited lines add up to once the
 * cycle, a war and the street are taken out. What the agencies project the
 * debt on.
 */
export declare function usStructuralBalance(campaign: Campaign, position: UsPosition): number;
/**
 * The one place the United States' debt is booked: a week of the year's
 * balance, plus whatever payments withheld at the debt limit are made good that
 * week. The settlement, the ten-year path and every preview book through it, so
 * none of them can disagree with the others about a week.
 */
export declare function bookUsDebt(debt: number, balance: number, arrearsPaid?: number): number;
/**
 * The stock the President's own choices added, a week further on: whatever the
 * program took less than the inherited program did, borrowed. Its interest is
 * paid out of the discretionary line, so it adds nothing more to the stock.
 */
export declare function accrueChoiceDebt(choiceDebt: number, programBalanceChange: number, potential: number): number;
/**
 * Every government's books, opened on the country as it stands. The rating
 * reads the letter it holds now, so a save that predates the books opens on its
 * own credit rather than the founding's; the President's own added stock opens
 * at nothing, because a past path is not recoverable from where it ended.
 */
export declare function openingBooks(campaign: Campaign): Readonly<Record<NationId, NationBooks>>;
export declare function selectNationalBooks(campaign: Campaign, nation: NationId): NationBooks | undefined;
/**
 * A government's books as the week reads them. A record kept before the books
 * were anchored is read as though opened today, the same forgiveness a save
 * that predates the books gets.
 */
export declare function booksFor(campaign: Campaign, runtime: NationRuntime): AnchoredBooks;
/** What a set of effects would add to the deficit, the debt and the interest bill, in USD millions a year. */
export type FiscalCost = {
    readonly deficit: number;
    readonly debt: number;
    readonly interest: number;
};
/** A books record as an effect, the only way `fiscalPhase` writes one. */
export declare function booksEffect(nation: NationId, set: NationBooks): Effect;
/** What a week did to one government's books and figures. */
export type BooksWeek = {
    readonly books: AnchoredBooks;
    readonly action?: RatingAction;
    /** What the agencies weighed, where they acted. */
    readonly fundamentals?: RatingFundamentals;
    /** The letter, where the week moved the rating across one. */
    readonly letter?: SovereignRating;
};
export type ForeignWeek = BooksWeek & {
    readonly economy: {
        readonly gdp: number;
        readonly gdpPerCapita: number;
        readonly debt: number;
    };
};
/** The dollar's own rates, which every foreign government's dollar debt is revalued against. */
export type DollarReading = {
    readonly inflation: number;
    readonly expectedInflation: number;
};
/**
 * A foreign government's week: its output grows, its ratio takes the identity,
 * its rate rolls toward what the market charges, and the agencies look at it if
 * this is its week.
 */
export declare function foreignWeek(campaign: Campaign, runtime: NationRuntime, books: AnchoredBooks, dollar: DollarReading, crisis?: CrisisReading): ForeignWeek;
/** What the week the United States just booked leaves its rates, its own added stock and its rating at. */
export type UsWeekInputs = {
    /** The year's balance the week was booked on, nominal. */
    readonly balance: number;
    /** Debt held by the public and real output after the week. */
    readonly debt: number;
    readonly gdp: number;
    /** A notch for a brush with default at the debt limit. */
    readonly governance: number;
    /** An X-date calls the agencies in whatever week it falls. */
    readonly forceReview: boolean;
    readonly crisis?: CrisisReading;
    /** The budget by kind as it was actually paid this week, withheld payments and all. */
    readonly mix: StructuralMix;
    /** Interest's share of revenue on the statement the week was booked on. */
    readonly interestShare: number;
};
export declare function usBooksWeek(campaign: Campaign, position: UsPosition, week: UsWeekInputs): BooksWeek;

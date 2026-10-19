import { type ProgramRestingOffset, type RestingPointPath } from "./policy-stats.js";
import { type Bill, type BillEnactment, type Campaign } from "./state.js";
/**
 * Shares of output a year, over `years` from enactment: revenue raised
 * (positive), outlays added (positive), the part of those outlays on the
 * discretionary line, which the President's own authority is a share of, and
 * the part paid to households as transfers. A law with no span runs until it is
 * repealed.
 *
 * `rest` is what the law does to the economy's supply side over the same span,
 * as a move in each rate's resting point: the capital or the workers it adds.
 * Its push on demand is not here; that reaches the economy through the outlays,
 * by way of the fiscal impulse, and counting it twice would be the same dollar
 * spent twice.
 */
export type LawOffset = {
    readonly revenue?: number;
    readonly outlays?: number;
    readonly discretionary?: number;
    readonly transfers?: number;
    /** The part of the outlays that builds something, which reaches demand only as it is spent out. */
    readonly investment?: number;
    readonly years?: number;
    readonly rest?: Partial<Record<RestingPointPath, number>>;
};
export declare const LAW_OFFSETS: Readonly<Record<string, LawOffset>>;
/** The enrolled provision controls every continuing flow; an old bill without text keeps the original. */
export declare function lawOffsetForBill(bill: Bill): LawOffset | undefined;
/** Price an offered provision before it has been enrolled. */
export declare function lawOffsetForText(actId: string, text: "base" | "targeted"): LawOffset | undefined;
/** Compatibility reader for the established housing comparison. */
export declare function housingLawOffset(text: "base" | "targeted"): LawOffset;
/**
 * `cap` is the part of `discretionary` that is a cap rather than a program: the
 * cut the caps in force hold the line to, as a positive share. It is inside
 * `discretionary` too, so a reader that only adds the lines up needs nothing new.
 */
export type LawShift = {
    readonly take: number;
    readonly outlays: number;
    readonly discretionary: number;
    readonly transfers: number;
    readonly investment: number;
    readonly cap: number;
};
/** How a law became law; a law with no record of it is read as the President's signature. */
export declare function billEnactment(bill: Bill): BillEnactment;
/** What the laws in force this week add to the take and the outlays, as shares of output a year. */
export declare function lawShift(campaign: Campaign): LawShift;
/** The same shift, split by whose act the law was: the ones the President signed, or the rest. */
export declare function lawShiftBySigning(campaign: Campaign): {
    readonly signed: LawShift;
    readonly unsigned: LawShift;
};
/**
 * What the laws in force add to the take and the outlays on average over the
 * next ten years, as the law stands: a law written for four years is counted
 * for the years it has left and no longer, the way a current-law projection
 * scores a provision that expires. A law with no span runs the whole ten.
 */
export declare function lawShiftOverTenYears(campaign: Campaign): LawShift;
/**
 * What the laws in force move each rate's resting point by, on top of the
 * standing program, for as long as each is written for.
 *
 * The program is what an administration says it stands for; a law is what it
 * got through, and the two are different facts about the same economy. A law
 * delivered as a one-week push on a rate `macro.ts` reverts faded within a
 * season whatever its span said, so a decade of capital read as a quarter of
 * stimulus. As a resting offset it holds for the span and stops with it, and
 * `macro.ts` stays the one writer of the rate.
 */
export declare function lawRestingOffset(campaign: Campaign): ProgramRestingOffset;

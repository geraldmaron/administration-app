import type { Campaign, Chamber, ChamberComposition, Congress, ElectionKind, FeedItem, PersonRuntime, SeatSwing } from "./state.js";
import type { Effect, EffectPacket } from "./effects.js";
import type { TieEffect } from "./ties.js";
import type { NationId } from "@admin/world";
/** One line of coverage, for anything a national night files. */
export declare function coverage(summary: string, turn: number): FeedItem;
/** A packet the world produced rather than the President. */
export declare function simulated(turn: number, summary: string, effects: readonly Effect[]): EffectPacket;
/**
 * How a midterm moves the House, fitted to the post-1946 record.
 *
 * Gallup's table of eighteen midterms (Jones, Gallup, September 12, 2018) puts
 * the president's party's net House seats against the president's job approval
 * at -97.7 + 1.41 per point of approval, correlation .66, residual standard
 * deviation about 17 seats (the least-squares fit and its residual are computed
 * from that table, an observation of the record and not a causal estimate). A
 * 40% president loses about 41 on that line, a 60% one about 13, and a 69% one
 * breaks even; the historical means are 37 below 50% and 14 above.
 *
 * A seat is lost where it is held and contestable, so the swing is a share of
 * the seats the president's party holds in competitive states (and, in a good
 * year, of the opposition's), not a flat count. That is what makes 2010
 * (255 seats held, -63) and 2014 (201 held, -13) different elections at the
 * same approval. The residual the line leaves, candidate quality and the year's
 * issues, is not modeled, so a given approval returns a seat-count band across
 * starting seats and geography rather than the line's scatter.
 *
 * `sensitivity` is the fraction of at-risk seats moved per point of ballot
 * share (1.4 puts about 300 seats per unit of share on a typical House);
 * `neutralShare` is the ballot share at which the president's party holds its
 * seats; `ceiling` is the most of its at-risk seats a party loses (the postwar
 * worst, 63 of 255 held in 2010, is a quarter of the seats and about 0.3 of
 * those at risk). Planning values: the slope and neutral point put the
 * ballot share of a term with six laws on the line at 40% and 60% approval
 * (shares near .48 and .57), the ceiling the worst postwar loss. A term with
 * fewer laws reads a lower share at the same approval and so loses more.
 */
export declare const HOUSE_MIDTERM: {
    readonly sensitivity: 1.4;
    readonly neutralShare: 0.61;
    readonly ceiling: 0.31;
};
/**
 * How close a state has to be for its senate seat to be in play at all.
 *
 * A national swing does not take Wyoming's seat, and a model that let it would
 * decompose one national count into fifty results the election never produced
 * (the defect the Senate half of this was opened for). A seat may change hands
 * only where the state sits inside this band of even, measured as alignment with
 * the administration rather than as raw lean, so an independent President faces
 * the same map their own standing gives them.
 */
export declare const SENATE_FLIP_MARGIN = 0.12;
/**
 * Which third of the Senate faces the voters in a November.
 *
 * The classes run on a six-year rotation: Class 1 in 2030, Class 2 in 2032,
 * Class 3 in 2034, and so on. Read off the year rather than counted from the
 * campaign's own start, so a save reloaded mid-term cannot disagree about which
 * seats are up.
 */
export declare function senateClassUpIn(year: number): 1 | 2 | 3 | undefined;
/** What the country does to one chamber, in seats. */
export declare function seatSwing(share: number, chamber: Chamber, composition: ChamberComposition, campaign?: Campaign, kind?: ElectionKind): number;
export type RecomposeResult = {
    readonly congress: Congress;
    /** Fresh apportionment of the recomposed chambers; written via setDelegation. */
    readonly delegationEffects: readonly Effect[];
    /** The rapport each newly seated leader opens at; an incumbent who kept a post keeps their own. */
    readonly tieEffects: readonly TieEffect[];
};
/**
 * Recompose the chambers from a swing, reseat leadership, and re-apportion every
 * state's delegation so the table matches the new composition exactly.
 *
 * The swing form. `reseat` below is the arithmetic, and the January 3 seating
 * takes it with the chambers the November already decided rather than a second
 * swing — re-deriving a settled result from the lame-duck weeks is exactly the
 * defect that separating the two prevents.
 */
export declare function recompose(congress: Congress, swing: SeatSwing, people: Readonly<Record<string, PersonRuntime>>, nation: NationId, turn: number, states: Campaign["states"], senateClassUp?: 1 | 2 | 3): RecomposeResult;
/** The reseating itself: leadership, panels and every state's delegation, on given chambers. */
export declare function reseat(congress: Congress, chambers: Readonly<Record<Chamber, ChamberComposition>>, people: Readonly<Record<string, PersonRuntime>>, nation: NationId, turn: number, states: Campaign["states"], senateClassUp?: 1 | 2 | 3): RecomposeResult;
/** The chambers the country just elected, parked on `seatingOn` until January 3. */
export declare function withPendingSeating(campaign: Campaign, swing: SeatSwing): Congress;
/**
 * The oath the chambers take, nine weeks after the country chose them.
 *
 * Applied as a whole composition rather than as a second swing: the country
 * already decided the numbers in November, and re-deriving them here would let
 * the lame-duck weeks change a result that was already counted. The senate is
 * reapportioned with the two classes that were not up held where they are, and
 * the class that was up read off the election's own year.
 */
export declare function seatingPacket(campaign: Campaign, turn: number): EffectPacket;

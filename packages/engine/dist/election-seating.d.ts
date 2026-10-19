import type { Campaign, Chamber, ChamberComposition, Congress, ElectionKind, FeedItem, PersonRuntime, SeatSwing } from "./state.js";
import type { Effect, EffectPacket } from "./effects.js";
import type { TieEffect } from "./ties.js";
import type { NationId } from "@admin/world";
/** One line of coverage, for anything a national night files. */
export declare function coverage(summary: string, turn: number): FeedItem;
/** A packet the world produced rather than the President. */
export declare function simulated(turn: number, summary: string, effects: readonly Effect[]): EffectPacket;
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

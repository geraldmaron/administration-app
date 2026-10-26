import type { StateId } from "@admin/world";
import type { GameDate, UsParty } from "./state.js";
/** Median days from a member's death to the special election that fills the House seat. */
export declare const HOUSE_SPECIAL_ELECTION_DAYS = 125;
/** The shortest death-to-special gap observed: a general election nearer than this is too close to carry the seat. */
export declare const SPECIAL_ELECTION_MIN_DAYS = 57;
/**
 * Median days from a senator's death to the governor's appointment: Thomas to
 * Barrasso 18, Kennedy to Kirk 30, Byrd to Goodwin 18, Inouye to Schatz 9,
 * Lautenberg to Chiesa 3, McCain to Kyl 10, Feinstein to Butler 2 (death and
 * appointment dates from Wikipedia's lists of members who died in office and
 * of appointed senators, opened 2026-10-25).
 */
export declare const SENATE_APPOINTMENT_DAYS = 10;
/**
 * One state's rule. `cutoffDays`: the vacancy is filled at the next November
 * general election at least this many days away, else the one after.
 * `specialWithinDays`: an expedited special election, held by this many days
 * after the vacancy unless a general election comes first.
 */
export type SenateVacancyLaw = {
    readonly appoints: boolean;
    readonly sameParty?: true;
    readonly cutoffDays?: number;
    readonly specialWithinDays?: number;
};
export declare const SENATE_VACANCY_LAW: Readonly<Record<Exclude<StateId, "DC">, SenateVacancyLaw>>;
/** A special election `withinDays` out, or the general election if one comes first and is not too close to carry it. */
export declare function specialElectionDate(since: GameDate, withinDays: number): GameDate;
/** The day a Senate seat emptied on `since` goes to the voters under its state's law. */
export declare function senateElectionDate(state: Exclude<StateId, "DC">, since: GameDate): GameDate;
/**
 * The party a statewide vote returns: a Senate special, or a separately
 * elected successor to a governor. The state's lean decides, except
 * inside the band where a statehouse counts as contested (the governors'
 * six-point flip margin), where the party holding the seat keeps it.
 */
export declare function specialElectionParty(lean: number, holding: UsParty): UsParty;
/** The logistic scale on the holder's margin that returns 19 flips in 132 across the House's seats at an even national mood. */
export declare const HOUSE_FLIP_SCALE = 0.15;
/**
 * The chance a House special changes party. `margin` is the holding party's
 * edge in the seat's lean, plus the national mood toward that party
 * (approval's distance from even, for the President's party and against the
 * other): how far it reaches a special is a design reading, not a measured one.
 */
export declare function houseFlipChance(margin: number): number;
/** The holding party's margin in a House seat of this lean at this national mood. */
export declare function houseHoldMargin(lean: number, holding: "democrat" | "republican", mood: number): number;
export type GovernorSuccessor = {
    readonly title: string;
    readonly ticket: boolean;
};
export declare function governorSuccessor(state: Exclude<StateId, "DC">): GovernorSuccessor;

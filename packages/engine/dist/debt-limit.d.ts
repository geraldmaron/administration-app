import { type UsPosition } from "./national-books.js";
import type { RecordEntry } from "./sovereign.js";
import { type Campaign } from "./state.js";
/** USD millions throughout; turns are campaign turns. */
export type DebtLimitState = {
    readonly base: number;
    /** What each enacted lift added, keyed by the id of the bill that carried it. */
    readonly lifts: Readonly<Record<string, number>>;
    /** What the government owes its own trust funds, counted against the limit. Absent only on a record kept before it was counted, which is reopened. */
    readonly intragovernmental?: number;
    readonly bindingSince?: number;
    /** Extraordinary measures left once the limit binds, USD millions. */
    readonly measuresLeft?: number;
    /** Trust-fund investments suspended while the limit binds, restored when it is lifted. */
    readonly measuresUsed?: number;
    /** The turn the measures ran out. While it is set and the limit binds, payments are being withheld. */
    readonly xDateTurn?: number;
    /** Outlays the Treasury could not pay past the limit, owed on the lift. */
    readonly arrears: number;
    /** Weeks until the Treasury runs out of room, the measures included: what Congress watches. */
    readonly headroomWeeks: number;
    /** The rating agencies count a brush with default against the United States until this turn. */
    readonly governanceUntil?: number;
};
/** The week's balance as the statement stands, before any payment is withheld: revenue less outlays, a year's rate. */
export declare function usUnprioritizedBalance(campaign: Campaign, position: UsPosition): number;
/** What the limit counts against the United States: debt held by the public plus its trust funds, less any measures in use. */
export declare function subjectToLimit(state: DebtLimitState, debt: number): number;
/** The limit record as the week reads it: one kept before the trust funds were counted is reopened, as a save that predates it would be. */
export declare function limitRecord(campaign: Campaign): DebtLimitState;
/**
 * The ceiling, derived from the laws on the books: the base the President took
 * office under plus what each enacted lift added. A lift is valued at the
 * output of the week it was enacted, and one that has not reached the books'
 * weekly accounting yet is valued at today's; a lift whose law is gone takes
 * its room with it.
 */
export declare function limitCeiling(campaign: Campaign, state: DebtLimitState, output: number): number;
/**
 * The limit as the country stands: a year and a half of the deficit it runs
 * above what it already owes, with every lift already enacted counted inside
 * that room rather than on top of it, so a save that predates the record opens
 * with the headroom a President walks in with rather than none.
 */
export declare function openingDebtLimit(campaign: Campaign): DebtLimitState;
/** What happened to the limit this week, in the order a reader of the Record needs it. */
export type LimitEvent = {
    readonly kind: "lifted";
    readonly by: number;
    readonly arrearsPaid: number;
} | {
    readonly kind: "binds";
    readonly xDateTurn: number;
} | {
    readonly kind: "x-date";
} | {
    readonly kind: "withheld";
    readonly amount: number;
};
/** The limit before the week is booked: new lifts recorded, repealed ones gone, and the Treasury's room restored if a lift gave it back. */
export type LimitOpening = {
    readonly state: DebtLimitState;
    readonly ceiling: number;
    readonly arrearsPaid: number;
    readonly events: readonly LimitEvent[];
};
export declare function openLimitWeek(campaign: Campaign, state: DebtLimitState, position: UsPosition, weeklyBorrowing: number): LimitOpening;
/** Whether this week's borrowing can be covered: false from the week the measures cannot, until a lift. */
export declare function mustWithhold(state: DebtLimitState, weeklyBorrowing: number): boolean;
/**
 * The limit after the week is booked. A limit reached this week binds and the
 * measures begin; a binding limit draws the week's borrowing from the measures;
 * a week that could not be covered sets the X-date and adds what was withheld
 * to the arrears.
 */
export declare function closeLimitWeek(campaign: Campaign, opening: LimitOpening, booked: {
    readonly debt: number;
    readonly borrowing: number;
    readonly withheld: number;
}): {
    readonly state: DebtLimitState;
    readonly events: readonly LimitEvent[];
};
export type DebtLimitReading = {
    /** What the Treasury may owe, USD millions. */
    readonly ceiling: number;
    /** What counts against it, USD millions. */
    readonly subjectToLimit: number;
    /** Weeks until the Treasury runs out of room at this year's borrowing, the extraordinary measures included; none past the X-date. */
    readonly headroomWeeks: number;
    readonly binding: boolean;
    /** The week the Treasury runs out of room, projected while the measures last and fixed once it arrives. */
    readonly xDateTurn?: number;
    /** Whether payments are being withheld now. */
    readonly prioritizing: boolean;
    /** What the Treasury has withheld and owes on the lift, USD millions. */
    readonly arrears: number;
};
export declare function selectDebtLimit(campaign: Campaign): DebtLimitReading;
/** The notch the agencies take off for a recent brush with default at the limit. */
export declare function governanceNotch(state: DebtLimitState | undefined, turn: number): number;
/**
 * What the limit did this week, as one entry on the Record. A week of withheld
 * payments costs order the way a lapse in appropriations does, because it is
 * the same experience for everyone waiting on a check.
 */
export declare function limitEntry(campaign: Campaign, events: readonly LimitEvent[]): RecordEntry | undefined;

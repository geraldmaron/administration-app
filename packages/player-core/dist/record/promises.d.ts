import { type Campaign, type GameDate, type Pledge, type PledgeStatus } from "@admin/engine";
import { type PlankId } from "@admin/world";
/** Where the act that keeps a pledge is taken, and the words on the link to it. */
export type PledgeDoor = {
    readonly href: string;
    readonly label: string;
};
/**
 * The order's own page for a pledge to sign one, and the domain's brief for a
 * pledge on a program, which is where adopting or dropping it is done. Before
 * this the Record and the Desk both pointed back at the Record, so a promise
 * never led the player to the one screen that could keep it.
 */
export declare function pledgeDoor(plank: PlankId | string): PledgeDoor | undefined;
/** One pledge as the Record lists it under Promises. */
export type PromiseRow = {
    readonly id: string;
    readonly plank: PlankId;
    /** The plank's own title, which is what the promise was made about. */
    readonly title: string;
    readonly status: PledgeStatus;
    readonly madeDate: GameDate;
    readonly dueDate: GameDate;
    readonly settledDate?: GameDate;
    readonly firstHundredDays: boolean;
    /** What keeps it, in the sentence a player reads beside the row. */
    readonly keptWhen?: string;
    /** What breaks it. */
    readonly brokenWhen?: string;
    /** Where the act that keeps it is taken. */
    readonly door?: PledgeDoor;
};
/**
 * Every pledge the administration has made, as the Record shows them: soonest
 * due first, and in the order they were made where two share a date, so the
 * first-hundred-days promises lead and the list reads as the term's calendar.
 */
export declare function selectPromises(campaign: Campaign): readonly PromiseRow[];
/** Two weeks: how long before a due date an open pledge starts to need the President. */
export declare const PLEDGE_WARNING_DAYS = 14;
/**
 * Open pledges falling due within `withinDays` of the campaign's date, nearest
 * first. One already past its date and not yet settled is the most urgent of
 * all, so it is included rather than dropped.
 */
export declare function selectDuePledges(campaign: Campaign, withinDays?: number): readonly Pledge[];

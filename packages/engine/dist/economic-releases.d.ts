import { type Campaign, type GameDate, type ReleaseKind } from "./state.js";
/** The day the month's jobs report comes out, holiday exceptions applied. */
export declare function jobsReleaseDay(year: number, month: number): GameDate;
export declare function isJobsRelease(date: GameDate): boolean;
export declare function isCpiRelease(date: GameDate): boolean;
export declare function isGdpRelease(date: GameDate): boolean;
/** The same planning day the rate is set. The release and the decision do not drift. */
export declare function isFomcRelease(date: GameDate): boolean;
export declare const RELEASE_KINDS: readonly ReleaseKind[];
/** One release on the calendar: what came out, the day it did, and the figure it printed, as a fraction. */
export type EconomicRelease = {
    readonly kind: ReleaseKind;
    readonly date: GameDate;
    readonly figure?: number;
};
/** The kinds that fall on a day. */
export declare function releaseKindsOn(date: GameDate): readonly ReleaseKind[];
/** The figure a release prints this week: the rate the engine computed, as a fraction. */
export declare function releaseFigure(campaign: Campaign, kind: ReleaseKind): number | undefined;
/** The releases that fall on a day, each with the figure it printed. */
export declare function releasesOn(campaign: Campaign, date: GameDate): readonly EconomicRelease[];
/**
 * Store the figure of every release dated in the seven days ending today that
 * has no stored vintage. Idempotent, so calling it twice in a week changes
 * nothing; the first call in a week fixes the printed value.
 */
export declare function recordReleases(campaign: Campaign): Campaign;
/** Every release dated from `from` to `to`, both days included, oldest first. */
export declare function releasesBetween(from: GameDate, to: GameDate): readonly {
    readonly kind: ReleaseKind;
    readonly date: GameDate;
}[];
/** The releases of the seven days ending today, for the week's feed. */
export declare function releasesThisWeek(campaign: Campaign): readonly EconomicRelease[];
/** The next date each kind comes out, on or after `from`. */
export declare function nextReleases(from: GameDate): readonly {
    readonly kind: ReleaseKind;
    readonly date: GameDate;
}[];

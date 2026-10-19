import { type Campaign } from "@admin/engine";
export type TermStation = {
    readonly key: string;
    readonly label: string;
    readonly meta: string;
    /** The one station the walk currently sits at — the latest one reached. */
    readonly active: boolean;
};
/**
 * This term's walk, marked at whichever station the campaign's own calendar
 * has most recently reached.
 *
 * Read off `campaignClock`/`milestonesBetween` rather than stored, so a rail
 * drawn today and one drawn after a week's Continue never disagree about
 * where the term stands — there is nothing here to fall out of date.
 */
export declare function termJourney(campaign: Campaign): readonly TermStation[];

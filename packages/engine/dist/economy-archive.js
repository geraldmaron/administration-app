import { elapsedDays } from "./pace.js";
const MONTH_DAYS = 365.25 / 12;
/** The month since the oath a week closed in, counted from zero. */
export const archiveMonth = (turn) => Math.floor(elapsedDays(turn) / MONTH_DAYS);
/**
 * Fold samples leaving the weekly window into the monthly archive.
 *
 * The archive keeps the last reading of each month, which is how a rate read at
 * a point in time is brought to a coarser cadence: a month's rate is the one it
 * closed on, and a mean of weekly rates would blend readings the economy never
 * printed. A month already held is replaced by its later week, so the archive
 * never holds two readings of one month and never holds a month it did not see.
 * A record whose weeks carry only what changed passes `merge`, so a month keeps
 * every change its weeks held rather than only its last week's.
 */
export function foldIntoArchive(archive, leaving, merge = (_earlier, later) => later) {
    if (leaving.length === 0)
        return archive;
    const folded = [...archive];
    for (const sample of leaving) {
        const last = folded[folded.length - 1];
        if (last && archiveMonth(last.turn) === archiveMonth(sample.turn))
            folded[folded.length - 1] = merge(last, sample);
        else
            folded.push(sample);
    }
    return folded;
}
/** Append one week to the ring and fold whatever the ring no longer holds into its month. */
export function recordWeek(course, sample, window, merge) {
    const all = [...course.weekly, sample];
    const leaving = all.slice(0, Math.max(0, all.length - window));
    return { weekly: all.slice(-window), monthly: foldIntoArchive(course.monthly, leaving, merge) };
}
/** The whole recorded course, oldest first: the monthly archive, then the weekly window. */
export function economyRecord(campaign) {
    return [...(campaign.economyArchive ?? []), ...(campaign.economyHistory ?? [])];
}

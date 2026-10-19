import { COHORT_IDS } from "@admin/world";
import { cohortSupport } from "./demos.js";
import { recordWeek } from "./economy-archive.js";
import { OPINION_DRIVERS } from "./opinion-drivers.js";
import { displayRollup } from "./electorate.js";
import { selectElectorate } from "./opinion.js";
// The public's readings as each week closed: the six judgments and how divided
// the country is, every cohort cell's support and the three blocs a player is
// shown (the President's party with its leaners, the independents, the other
// party with its leaners).
//
// Every one of these is derived (a cohort's support from the mood, its lens and
// its memory; a bloc's from the record, the polarization stock and the
// week's scandals), so a past week
// cannot be recomputed from the campaign as it stands now: the salience, the
// partisan base and the memories it was read through have all moved since.
// What is kept is the observation itself, taken once at the week's close, and
// a trend is read off what was observed rather than off a reconstruction.
/** Two years weekly, like the economy's ring; older weeks fold to their month. */
export const OPINION_HISTORY_WINDOW = 104;
const round3 = (value) => Math.round(value * 1000) / 1000;
/** What the public's readings are on this campaign, rounded to a thousandth for the save. */
export function opinionSample(campaign, turn) {
    const mood = campaign.player.opinion;
    const judgments = Object.fromEntries(OPINION_DRIVERS.map((driver) => [driver, round3(mood[driver])]));
    const cohorts = Object.fromEntries(COHORT_IDS.map((cohort) => [cohort, cohortSupport(campaign, cohort)]));
    const reading = selectElectorate(campaign);
    const rollup = displayRollup(reading.shares, reading.approvals);
    const blocs = Object.fromEntries(Object.entries(rollup).map(([bloc, entry]) => [bloc, round3(entry.value)]));
    return { turn, judgments, polarization: round3(mood.polarization), cohorts, blocs };
}
/**
 * The record with the week `closed` ends filed as `turn`. Draws nothing
 * and reads nothing back, so keeping it cannot change anything else the week does.
 */
export function withOpinionSample(closed, turn) {
    const record = closed.opinionRecord ?? { since: closed.turn, weekly: [], monthly: [] };
    return { since: record.since, ...recordWeek(record, opinionSample(closed, turn), OPINION_HISTORY_WINDOW) };
}
/** The whole observed course, oldest first: the monthly archive, then the weekly ring. */
export function opinionCourse(campaign) {
    const record = campaign.opinionRecord;
    return record ? [...record.monthly, ...record.weekly] : [];
}

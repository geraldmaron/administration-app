import { COHORT_IDS } from "@admin/world";
import { towardAdministration } from "./party.js";
import { COHORT_PARTISAN_BASELINE } from "./state-cohort-sensitivity.js";
// Each cohort's partisan starting point (DECISIONS 5.8, "Partisan baseline"):
// its measured two-party vote, jittered once per campaign inside the
// estimate's error, and read relative to the President's party. demos.ts turns
// it into a log-odds offset on the cohort's reading and calibrates every axis
// back onto its own mean, so the baseline sets where a group starts relative to
// the others and never moves the country's figure or how an act reaches anyone.
/** The jitter on each baseline, as a fraction of its bootstrap error: campaigns differ, never by more than the data could tell apart. */
export const BASELINE_JITTER_SHARE = 0.5;
const SHARE_FLOOR = 0.02;
const clampShare = (value) => Math.min(1 - SHARE_FLOOR, Math.max(SHARE_FLOOR, value));
const round3 = (value) => Math.round(value * 1000) / 1000 + 0;
function gaussian(stream) {
    const u = Math.max(stream.next(), 1e-12);
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * stream.next());
}
/** This campaign's Republican two-party share per cohort, drawn once at founding on its own stream and stored. */
export function openingCohortBaseline(streams) {
    const stream = streams.stream("founding", "electorate", "cohort-baseline");
    return Object.fromEntries(COHORT_IDS.map((cohort) => {
        const { republican, se } = COHORT_PARTISAN_BASELINE[cohort];
        return [cohort, round3(clampShare(republican + gaussian(stream) * se * BASELINE_JITTER_SHARE))];
    }));
}
/** The stored draw, or the sourced shares on a save founded before the draw existed. */
export function cohortBaselineShares(campaign) {
    const stored = campaign.cohortBaseline;
    return Object.fromEntries(COHORT_IDS.map((cohort) => [cohort, stored?.[cohort] ?? COHORT_PARTISAN_BASELINE[cohort].republican]));
}
/**
 * The cohort's lean toward the administration in log-odds, before calibration:
 * the log-odds of its Republican share, signed toward the President's party and
 * scaled by how much of a partisan pull an administration without a party
 * commands, the same reading `towardAdministration` gives a state's lean.
 */
export function baselineLean(republican, standing) {
    const share = clampShare(republican);
    return towardAdministration(Math.log(share / (1 - share)), standing);
}

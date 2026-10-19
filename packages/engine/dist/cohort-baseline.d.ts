import { type CohortId } from "@admin/world";
import { type AdministrationStanding } from "./party.js";
import type { RngStreams } from "./rng.js";
import type { Campaign } from "./state.js";
/** The jitter on each baseline, as a fraction of its bootstrap error: campaigns differ, never by more than the data could tell apart. */
export declare const BASELINE_JITTER_SHARE = 0.5;
/** This campaign's Republican two-party share per cohort, drawn once at founding on its own stream and stored. */
export declare function openingCohortBaseline(streams: RngStreams): Readonly<Record<CohortId, number>>;
/** The stored draw, or the sourced shares on a save founded before the draw existed. */
export declare function cohortBaselineShares(campaign: Campaign): Readonly<Record<CohortId, number>>;
/**
 * The cohort's lean toward the administration in log-odds, before calibration:
 * the log-odds of its Republican share, signed toward the President's party and
 * scaled by how much of a partisan pull an administration without a party
 * commands, the same reading `towardAdministration` gives a state's lean.
 */
export declare function baselineLean(republican: number, standing: AdministrationStanding): number;

import { type CohortId } from "@admin/world";
import { type WeeklyCourse } from "./economy-archive.js";
import { type OpinionDriver } from "./opinion-drivers.js";
import type { Campaign } from "./state.js";
import { type DisplayBloc } from "./electorate.js";
/** Two years weekly, like the economy's ring; older weeks fold to their month. */
export declare const OPINION_HISTORY_WINDOW = 104;
export type OpinionSample = {
    readonly turn: number;
    readonly judgments: Readonly<Record<OpinionDriver, number>>;
    readonly polarization: number;
    readonly cohorts: Readonly<Partial<Record<CohortId, number>>>;
    readonly blocs: Readonly<Partial<Record<DisplayBloc, number>>>;
};
/**
 * The weekly ring and the months before it, and the turn the record opened on.
 * `since` is the founding turn on a campaign that kept it from the oath and the
 * load turn on a save written before the record existed, whose earlier weeks
 * were never observed and are not reconstructed.
 */
export type OpinionRecord = WeeklyCourse<OpinionSample> & {
    readonly since: number;
};
/** What the public's readings are on this campaign, rounded to a thousandth for the save. */
export declare function opinionSample(campaign: Campaign, turn: number): OpinionSample;
/**
 * The record with the week `closed` ends filed as `turn`. Draws nothing
 * and reads nothing back, so keeping it cannot change anything else the week does.
 */
export declare function withOpinionSample(closed: Campaign, turn: number): OpinionRecord;
/** The whole observed course, oldest first: the monthly archive, then the weekly ring. */
export declare function opinionCourse(campaign: Campaign): readonly OpinionSample[];

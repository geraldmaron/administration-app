import type { NationId } from "@admin/world";
import { type WeeklyCourse } from "./economy-archive.js";
import { type Campaign } from "./state.js";
/** Two years weekly, like the economy's ring; older weeks fold to their month. */
export declare const RELATIONS_HISTORY_WINDOW = 104;
/** One government's reading. A side is absent when no relationship is kept that way. */
export type TrustReading = {
    /** The United States' trust in it, -1..1. */
    readonly ours?: number;
    /** Its trust in the United States, -1..1. Recorded whether or not the services read it. */
    readonly theirs?: number;
    /** The tension the United States reads with it, 0..1. */
    readonly tension?: number;
};
export type RelationsSample = {
    readonly turn: number;
    readonly ties: Readonly<Record<string, TrustReading>>;
};
/** The weekly ring, the months before it, and the turn the record opened on (see `OpinionRecord`). */
export type RelationsRecord = WeeklyCourse<RelationsSample> & {
    readonly since: number;
};
/** One point of one government's course: the reading carried to a recorded week. */
export type TrustPoint = TrustReading & {
    readonly turn: number;
};
/**
 * The record with the week `closed` ends filed as `turn`. Draws nothing and
 * reads nothing back, so keeping it cannot change anything else the week does.
 */
export declare function withRelationsSample(closed: Campaign, turn: number): RelationsRecord;
/**
 * One government's course, oldest first: a point at every recorded week in the
 * ring and every month before it, each carrying the reading as it then stood.
 * Empty when the record holds nothing of it.
 */
export declare function trustCourse(campaign: Campaign, nation: NationId): readonly TrustPoint[];

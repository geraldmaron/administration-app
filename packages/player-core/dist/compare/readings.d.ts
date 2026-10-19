import { type Campaign } from "@admin/engine";
import type { CompareMetric } from "./metrics.js";
import type { CoursePoint, Reading, Subject } from "./types.js";
export type CourseReading = {
    readonly ok: true;
    readonly points: readonly CoursePoint[];
} | {
    readonly ok: false;
    readonly reason: string;
};
/**
 * The course point for a week: the week itself, or, for a week old enough to
 * have left the weekly ring, the closing reading of the month it fell in,
 * which is all the archive keeps of it.
 */
export declare function pointAt(points: readonly CoursePoint[], turn: number): CoursePoint | undefined;
/** A subject's figure this week (a past week for `self-at`; a stretch's average for a published record). */
export declare function readCurrent(campaign: Campaign, metric: CompareMetric, subject: Subject): Reading;
/** A subject's recorded course, oldest first. Only the President's own figures and the states' keep one. */
export declare function readCourse(campaign: Campaign, metric: CompareMetric, subject: Subject): CourseReading;

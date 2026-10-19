import type { Campaign, NationRuntime } from "@admin/engine";
import type { NationId } from "@admin/world";
import type { Subject } from "./types.js";
/** The government the President runs. */
export declare function selfNation(campaign: Campaign): NationId;
/** A nation subject naming the President's own government is the President's own reading. */
export declare function isSelfSubject(campaign: Campaign, subject: Subject): boolean;
/** The President's own government named as a nation is the `self` subject, so it is never listed twice. */
export declare function normalizeSubject(campaign: Campaign, subject: Subject): Subject;
/** "the United Kingdom", "France": a name that reads inside a sentence. */
export declare function nationName(runtime: NationRuntime): string;
/** "Week 12" from the oath, or how far before it an inherited week sits. */
export declare function weekLabel(turn: number): string;
/** A stable key for a subject, unique within one comparison. */
export declare function subjectKey(subject: Subject): string;
/** What a subject is called on a legend or a row, before any history label is resolved. */
export declare function entityLabel(campaign: Campaign, subject: Exclude<Subject, {
    kind: "history";
}>): string;

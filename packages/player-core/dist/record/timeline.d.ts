import { type Campaign, type EffectActor } from "@admin/engine";
import { type RecordRow } from "./record-entry";
import { type EventPlace } from "./event-place";
export type TimelineOutcome = "under-way" | "in-effect" | "helped" | "hurt";
export declare const OUTCOME_WORDS: Readonly<Record<TimelineOutcome, string>>;
export type TimelineRow = RecordRow & {
    readonly domains: readonly string[];
    readonly outcomes: readonly TimelineOutcome[];
    readonly subject?: NonNullable<EventPlace["subject"]>;
    readonly storySubjects?: readonly {
        readonly id: string;
        readonly label: string;
    }[];
    readonly place: EventPlace;
};
export type TimelineFilter = {
    readonly actor?: EffectActor;
    readonly domain?: string;
    readonly subject?: string;
    readonly outcome?: TimelineOutcome;
    /** Words the entry's headline, description, domain or place must all contain. */
    readonly query?: string;
};
export type TimelineOption<T extends string = string> = {
    readonly value: T;
    readonly label: string;
    readonly count: number;
};
export type TimelineReading = {
    /** Newest first, after the filters. */
    readonly rows: readonly TimelineRow[];
    /** How many entries the Record holds before any filter. */
    readonly total: number;
    readonly domains: readonly TimelineOption[];
    readonly subjects: readonly TimelineOption[];
    readonly outcomes: readonly TimelineOption<TimelineOutcome>[];
};
/** Every entry of the term, newest first, with the options each filter can take and how many entries each would keep. */
export declare function recordTimeline(campaign: Campaign, filter?: TimelineFilter): TimelineReading;

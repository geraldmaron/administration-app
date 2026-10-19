import type { Discipline } from "./ic-elements.js";
import type { CollectionFinding, TaskingTargetKind } from "./intelligence.js";
/** A scoped collection request. Assessment questions use broader intent/capability/stability judgments. */
export type CollectionFocus = "overview" | "external-intent" | "force-posture" | "economic-pressure" | "domestic-public-conditions";
export type CollectionTopic = CollectionFinding["topic"];
export declare const COLLECTION_FOCUS_QUESTIONS: Readonly<Record<CollectionFocus, string>>;
export declare const COLLECTION_FOCUS_LABELS: Readonly<Record<CollectionFocus, string>>;
export declare const DISCIPLINE_TOPICS: Readonly<Record<Discipline, readonly CollectionTopic[]>>;
export declare function collectionTopics(discipline: Discipline, focus: CollectionFocus | undefined, kind: TaskingTargetKind): readonly CollectionTopic[];
export declare function collectionFocusUnavailable(discipline: Discipline, focus: CollectionFocus | undefined, kind: TaskingTargetKind): string | undefined;

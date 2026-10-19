import { type ConditionKind } from "./condition-kinds.js";
import { type Desk } from "./article-desk.js";
import type { FeedItem } from "./state.js";
type Footprint = "weather" | "health" | "order" | "economy";
export type ConditionPhase = "onset" | "worsening" | "easing" | "over";
type Extent = "local" | "part" | "whole";
/** What the composer can honestly read off a condition item. */
export type ConditionRead = {
    readonly kind?: ConditionKind;
    /** The hazard with its article, as the headline printed it: "an earthquake", "civil unrest". */
    readonly noun?: string;
    readonly phase?: ConditionPhase;
    readonly extent?: Extent;
    /** The week's regional roll-up: how many countries the line now stands for, and where. */
    readonly fold?: {
        readonly count: number;
        readonly region: string;
    };
};
export declare function readCondition(item: FeedItem): ConditionRead;
export declare function plural(noun: string): boolean;
/** The hazard as a second reference: "an earthquake" is "the earthquake" once the lede has named it. */
export declare function theHazard(noun: string): string;
/** The body of a condition piece abroad, or nothing when the headline named no hazard the desk can read. */
export declare function conditionParagraphs(desk: Desk, read: ConditionRead): readonly string[] | undefined;
export declare function conditionStandfirst(desk: Desk, read: ConditionRead): string | undefined;
export declare function conditionRelevance(reader: string, desk: Desk, read: ConditionRead): string | undefined;
/** The words a home piece can use for its hazard: the noun, and where it was filed from. */
export declare function homeHazard(desk: Desk, read: ConditionRead): {
    readonly noun: string;
    readonly where: string;
} | undefined;
export declare function conditionFootprint(read: ConditionRead): Footprint | undefined;
export {};

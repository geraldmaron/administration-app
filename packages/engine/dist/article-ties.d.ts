import { type NationId } from "@admin/world";
import { type Campaign, type FeedItem } from "./state.js";
export type ArticleTie = {
    /** The party's display name, as `ArticleNames` carries it. */
    readonly name: string;
    /** Bound to the reader's country by a mutual-defense treaty. */
    readonly treatyAlly: boolean;
    /** Counted a military threat on the live relationship. */
    readonly threat: boolean;
};
/** At or above this a relationship's military threat reads as a threat the country is planning against. */
export declare const THREAT_TIE = 0.5;
/** Whether the two governments are bound by a defense compact. */
export declare function treatyAllyOf(campaign: Campaign, from: NationId, to: NationId): boolean;
/** The reader's ties to each foreign party named in the item, for those it has any with. */
export declare function articleTies(campaign: Campaign, item: FeedItem): readonly ArticleTie[];

import type { FeedItem } from "./state.js";
import { type Desk } from "./article-desk.js";
import { type ConditionRead } from "./article-condition.js";
/** Nobody foreign in the item, and the reader's own country named or acting. */
export declare function isDomesticItem(item: FeedItem, playerNation: string | undefined): boolean;
/** The body of a home piece. */
export declare function domesticParagraphs(desk: Desk, read: ConditionRead): readonly string[];
/** The standfirst, given a stake the headline has not already said (or none). */
export declare function domesticStandfirst(desk: Desk, read: ConditionRead, stake: string | undefined): string;
export declare function domesticRelevance(desk: Desk, read: ConditionRead): string;

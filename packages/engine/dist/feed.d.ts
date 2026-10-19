import type { FeedItem, SceneFacetHint } from "./state.js";
/** Topic slugs for the wire header. Authored tags win; kind defaults when absent. */
export declare function feedTopics(item: FeedItem): readonly string[];
/** Resolved scene facet for hero photography: authored hint merged with kind defaults. */
export declare function feedSceneFacet(item: FeedItem): SceneFacetHint;

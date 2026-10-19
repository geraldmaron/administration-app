import type { Campaign, FeedItem } from "@admin/engine";
/**
 * The feed in the order the front page shows it: by the parties' power tier,
 * the story's rung-like severity, whether a US ally or rival is named, and a
 * stable tie-break on the feed's own order so two items ranked equal keep the
 * order they were filed in.
 */
export declare function rankedFeed(campaign: Campaign, items: readonly FeedItem[]): readonly FeedItem[];

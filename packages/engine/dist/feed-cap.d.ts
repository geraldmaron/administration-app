import type { Campaign, FeedItem, GameDate } from "./state.js";
/**
 * The most public items one week of the wire may carry.
 *
 * Twelve, which is about a broadsheet's front and second page. The cap counts a
 * week rather than a day because the wire is spread across the week now: a
 * per-call or per-day cap would let seven quiet days add up to a wall and would
 * cut a busy Thursday that was the whole week's news.
 */
export declare const WEEKLY_FEED_CAP = 12;
/** The first day of the week the campaign is standing in. */
export declare function weekOpenDate(campaign: Campaign): GameDate;
/** A region slug as a sentence names it: "region-middle-east" is "the Middle East"; an unplaced item has no region to name. */
export declare function regionPhrase(region: string): string | undefined;
/**
 * Append a week's items under the cap, folding what does not fit.
 *
 * Applied one item at a time and in order, so the twelfth item of a week is
 * carried and the thirteenth is digested — never the other way round because of
 * how a phase happened to batch its effects.
 */
export declare function appendWithinCap(campaign: Campaign, items: readonly FeedItem[]): Campaign;
/**
 * How many public items the week that is open is carrying, which is the figure
 * the cap is about and the one a test asserts.
 */
export declare function weeklyVisibleCount(campaign: Campaign): number;

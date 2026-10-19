import { type StateRegion } from "@admin/world";
import type { Campaign, FeedItem } from "./state.js";
import { type PressOutlet } from "./press-outlets.js";
/**
 * The census region a home story happened in, when it is one.
 *
 * A regional paper files the news from its own states and nothing else: a
 * condition with a dateline inside the country, read off the dateline the
 * condition system already writes. A story with no place, or a place abroad, has
 * no region and no regional desk.
 */
export declare function localeRegion(item: FeedItem): StateRegion | undefined;
export declare function pressOutletById(id: string): PressOutlet | undefined;
/**
 * Which masthead carries a public feed item.
 *
 * The desk it was filed at, once it has one. Before that, chosen by relevance:
 * a home story with a place goes to its region's paper, anything else to one of
 * the national desks that cover its kind, weighted by audience. Never by which
 * desk is hostile — a paper does not get a story because it dislikes the
 * government. The key is the item's own content, so the same headline lands on
 * the same desk however often it is reread.
 */
export declare function pickOutletForFeedItem(item: FeedItem): PressOutlet | undefined;
/**
 * The second desk that files the same story. Never the first one; for a home
 * story with a place, a national desk that covers disasters, because a fire
 * big enough for the regional paper is on the wire the same morning.
 */
export declare function secondOutletFor(item: FeedItem, first?: PressOutlet | undefined): PressOutlet | undefined;
/**
 * The most of one week's filings any desk carries. A corps where one masthead
 * writes most of the week is one voice with a roster attached, which is the
 * thing having eighteen desks is for avoiding.
 */
export declare const WEEK_SHARE_CAP = 0.4;
/**
 * A story as its desks file it: the masthead, the reporter, and what each desk
 * that filed thought of the administration at that moment.
 *
 * The stance is copied rather than read back later, because a paper that has
 * since come round did not write a friendlier story last month. The desk is the
 * most relevant one that is not already carrying more than its share of the
 * week. An item that already has a desk, or that no newspaper prints, is
 * returned unchanged.
 */
export declare function fileAtDesk(campaign: Campaign, item: FeedItem): FeedItem;
/** Several stories filed in one go, each counting the ones before it against the week's share. */
export declare function fileAtDesks(campaign: Campaign, items: readonly FeedItem[]): readonly FeedItem[];

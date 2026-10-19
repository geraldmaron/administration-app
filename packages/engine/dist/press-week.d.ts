import type { ActionRecord, Campaign, FeedItem } from "./state.js";
/**
 * How many of the President's acts the desks file in one week. The wire leads
 * with what the government did, but it is still a wire: a week of twelve policy
 * moves is covered as the three that led, not as twelve bulletins.
 */
export declare const WEEK_FILINGS_CAP = 3;
/**
 * Whether the public would see this act: something the President chose, not a
 * covert rung, not an intelligence or internal read, and not the booking of a
 * press engagement, which files its own story when the room answers.
 */
export declare function isPublicAct(entry: ActionRecord): boolean;
/**
 * The week's public acts as the stories the desks file on them.
 *
 * What the act's own producer already put on the wire counts first and against
 * the cap, so an authored press line is never covered twice and never crowded
 * out by the ledger's plainer sentence for the same week. The headline is the
 * sentence the act is remembered by; the piece names no person as its subject,
 * because the subject of a President's act is the act.
 */
export declare function presidentsWeekItems(campaign: Campaign, turn: number): readonly FeedItem[];

import { type NationId, type Person } from "@admin/world";
import { type LeadershipArticle, type LeadershipStory } from "./article-leadership.js";
import type { AttentionMatter } from "./attention.js";
import { type Effect, type EffectPacket } from "./effects.js";
import { type Campaign, type ForeignSeat, type GameDate, type LeadershipCause, type LeadershipChange, type NationRuntime } from "./state.js";
import type { TurnPhase } from "./turn-loop.js";
import { type Term } from "./willingness.js";
export { applyLeadership, type LeadershipEffect } from "./world-effects.js";
/** The seat on the record, or the table's where none has been stored. */
export declare function selectForeignSeat(campaign: Campaign, nation: NationId): ForeignSeat | undefined;
/** The chance the sitting government comes through a selection: its system, then its legitimacy and stability. */
export declare function incumbentStanding(runtime: NationRuntime, nation: NationId): number;
/** The weekly chance of a lost confidence vote: an illegitimate government in a split chamber. */
export declare function confidenceRate(runtime: NationRuntime): number;
/** The coup hazard's terms, each a weekly rate the country's own state sets. */
export declare function coupTerms(campaign: Campaign, nation: NationId, runtime: NationRuntime, rival: Person | undefined): readonly Term[];
/** Which story a change is, for the article and the feed. */
export declare function leadershipStoryOf(campaign: Campaign, change: LeadershipChange): LeadershipStory;
/** The article a change is reported in, naming the modeled people on either side of it. */
export declare function leadershipArticleOf(campaign: Campaign, change: LeadershipChange): LeadershipArticle;
/** The week's selections, falls and successions abroad, and the week of the press abroad. */
export declare const foreignPoliticsPhase: TurnPhase;
/**
 * The selections the table schedules between its own date and the oath,
 * resolved at the seal by the same rule the calendar runs by afterwards, and
 * seeded, so the 2029 world has had the elections 2026 to 2028 were due to
 * hold. Only the seats are resolved: nothing else about those two years is
 * simulated. Every change carries "projected" as its provenance, and every
 * other capital opens on its table incumbent with no offset.
 */
export declare function interregnum(campaign: Campaign): Campaign;
/**
 * The packet that replaces a government's leader outside an election, through
 * the same seat path and with a fresh offset: the next candidate of another
 * party where parties contest power, the governing party's next where they do
 * not. None where the charter seats nobody.
 */
export declare function successionPacket(campaign: Campaign, nation: NationId, cause: LeadershipCause): EffectPacket | undefined;
/** A government's leader replaced outside an election, applied. */
export declare function succeedLeader(campaign: Campaign, nation: NationId, cause: LeadershipCause): Campaign;
/**
 * Every effect a succession after a lost war files: the chair, the seat, the
 * new government's program and the story, so the leader the record names and
 * the temperament the seat carries never part.
 */
export declare function defeatSuccessionEffects(campaign: Campaign, nation: NationId): readonly Effect[];
/** A government's leader after it loses a war. */
export declare function succeedAfterDefeat(campaign: Campaign, nation: NationId): Campaign;
/** The changes of government on the record, newest first, for one nation or for the world. */
export declare function selectLeadershipChanges(campaign: Campaign, nation?: NationId): readonly LeadershipChange[];
/**
 * Coups as the Desk reads them: a coup in a government the President's
 * services read is an intelligence matter on the desk the week it happens, and
 * one in a government they cannot read is logged. Soft, not hard: pausing on
 * arrival is the attention policy's default for a coup, which the player may
 * change, and a hard matter would override that setting.
 */
export declare function coupMatters(campaign: Campaign, date: GameDate): readonly AttentionMatter[];

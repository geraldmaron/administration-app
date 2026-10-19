import { type AttentionMatter, type AttentionSource, type Campaign, type GameDate } from "@admin/engine";
import type { AttentionSetting } from "../preferences/preferences-store";
import { type MetricStance } from "../format/figures";
import { type AttentionItem } from "./attention-row";
export { guardCandidateHeadline, guardRequestCandidates, type GuardCandidate } from "./attention-requests";
export type { AttentionClock, AttentionItem, AttentionRoute } from "./attention-row";
export { ATTENTION_SOURCES, applyAttentionPolicy, defaultAttentionSetting, LAST_CALL_DAYS, logEligible } from "./attention-policy";
/**
 * What needs the president this week, ranked, each row a real surface.
 *
 * The folio is the week's one act. This list is everything else that is loud
 * enough to interrupt: a war, a bill on the desk, a vacant chair. Quiet
 * categories stay off the page so an empty week does not train the player to
 * stop looking.
 */
/**
 * The severity in words, so the row's spoken name carries what ranks it.
 *
 * Severity reaches a sighted player two ways, the filament down the row's
 * left edge and the trail's tint, and both are color. The list is ordered by
 * it, so a reader arrowing down a ranked list with no term in the name hears
 * equally weighted matters in an order whose meaning is invisible.
 */
export declare function stanceSpoken(stance: MetricStance): string;
/**
 * Everything the President has been raised for, worst first.
 *
 * The order is: what the presidency cannot continue past, then what it can,
 * then the world's pulse; and inside each, the worst-going first. Before this
 * it was ten builders concatenated in source order, so two vacant chairs
 * (adverse) drew below one enrolled bill (caution) under a heading that said
 * "worst first", and the chapter badge could read adverse because of a row
 * sitting fourth.
 *
 * Three producers feed it and there is no fourth: the Desk's standing
 * conditions, the statutory clocks, and the constitutional calendar. They used
 * to be separate systems with separate rankings that had to negotiate by hand
 * over which of them was allowed to badge a fact — `SummonsSpec.badgedBy` was
 * that negotiation, in a field. What replaced it is below: two rows about one
 * subject are one row.
 */
export declare function attentionItems(campaign: Campaign): readonly AttentionItem[];
/**
 * Every row every producer raised, ranked, before two rows about one subject
 * become one.
 *
 * The collapse is right for what interrupts the President and wrong for what
 * the President is waiting on: two press plays share the subject "press", and
 * a list of pending work that kept one of them would lose the other's date.
 */
export declare function attentionRows(campaign: Campaign): readonly AttentionItem[];
/** One row as the matter the engine keys a deferral on, for a surface that puts it off. */
export declare function matterFor(item: AttentionItem, date: GameDate): AttentionMatter;
/** The player's own settings for each kind, or none — every function below reads absent as the game's own defaults. */
export type AttentionPolicySettings = Partial<Record<AttentionSource, AttentionSetting>>;
/**
 * The Desk's rows, as a source the engine's advance can ask.
 *
 * This is the adapter that stops the app and the engine having two unrelated
 * ideas of what needs the President. The rows were already computed, already
 * ranked and already drawn; what they could not do was stop time, because
 * nothing connected them to `advanceUntilAttention`. Now the same producers
 * answer both questions, and a row cannot be loud enough to badge a room and
 * too quiet to interrupt a quiet fortnight.
 *
 * The player's settings run here, over every candidate, before the engine
 * ever composes a stop out of them — never afterward, and never over
 * `presented` alone, so a "wait" matter cannot be shadowed by a "pause" one
 * it collided with and then never resurface.
 */
export declare function deskMatterSource(campaign: Campaign, date: GameDate, settings?: AttentionPolicySettings): readonly AttentionMatter[];
/**
 * The at-most-three the composer presents, back as the rows a surface draws.
 *
 * Ranking, the cap and the subject collapse all happen once, in the engine, and
 * this is how a screen reads the result without re-deciding any of it.
 */
export declare function presentedItems(campaign: Campaign, settings?: AttentionPolicySettings): readonly AttentionItem[];
/**
 * Everything the President is actually owed: the three, then what is queued
 * behind them.
 *
 * Ambient rows are not here and that is the point. A press number that drifted
 * and an election eleven months out reach the feed and the Record; a chapter
 * headed NEEDS YOU that listed them would be teaching the player that the
 * heading is decoration. What the chapter draws is the stop, and the count
 * under it is what the stop is holding back.
 */
export declare function owedItems(campaign: Campaign, settings?: AttentionPolicySettings): readonly AttentionItem[];

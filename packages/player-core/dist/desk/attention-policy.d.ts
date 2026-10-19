import { type AttentionMatter, type AttentionSource, type GameDate } from "@admin/engine";
import type { AttentionSetting } from "../preferences/preferences-store";
/** How close to its own deadline a "wait" matter is allowed to sit unseen before it gets its one last call. */
export declare const LAST_CALL_DAYS = 2;
/**
 * Every kind the engine's union has, in the order a settings screen lists
 * them. A separate runtime array rather than a cast off the type, because the
 * type-level check below fails to compile the day `AttentionSource` grows a
 * member this array has not: a settings row cannot silently stay a member
 * short.
 */
export declare const ATTENTION_SOURCES: readonly ["constitutional-deadline", "appropriations-deadline", "bill-signature", "nomination", "court-ruling", "intelligence-warning", "military-escalation", "treaty-deadline", "agency-request", "governor-request", "market-threshold", "standing-threshold", "disaster", "diplomatic-request", "consequence-return", "investigation", "pledge", "scandal", "incident", "resignation-offer", "market-shock", "coup", "scenario"];
export declare function defaultAttentionSetting(source: AttentionSource): AttentionSetting;
export declare function logEligible(source: AttentionSource): boolean;
/**
 * The candidates a stop may actually be composed from, after the player's
 * settings have run.
 *
 * Called before `composeAttentionStop`, by every source that raises matters
 * (`applyAttentionPolicy` over the desk's own matter source) and by every
 * surface that reads what the desk owes (`presentedItems`, `owedItems`), so
 * the two never disagree about what a "wait" setting is currently holding
 * back.
 */
export declare function applyAttentionPolicy(matters: readonly AttentionMatter[], settings: Partial<Record<AttentionSource, AttentionSetting>> | undefined, date: GameDate, foundingDate: GameDate): readonly AttentionMatter[];

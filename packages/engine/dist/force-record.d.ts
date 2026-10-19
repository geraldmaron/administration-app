import type { NationId } from "@admin/world";
import { type Campaign } from "./state.js";
/** The acts a relationship's own history remembers force being used in. */
export declare const FORCE_RECORD_KINDS: readonly string[];
/**
 * How long a use of force stays on the record as the thing a second one is a
 * continuation of.
 *
 * Longer than the eight weeks a crossed red line stays answerable for, and for
 * a reason that is arithmetic rather than temperament: sixty governments share
 * three weekly slots, so a capital's own turn comes round about every twentieth
 * week. A shorter window asks a government to answer inside a period in which
 * it will usually never be asked for a decision at all.
 */
export declare const FORCE_ANSWERABLE_FOR = 20;
/**
 * Whether force has already been used between these two governments lately, in
 * either direction.
 *
 * Deliberately symmetric. A blow returned and a blow repeated are both the
 * second act of the same episode, and neither capital would still describe what
 * is happening as an isolated incident once there have been two.
 */
export declare function forceOnTheRecord(campaign: Campaign, a: NationId, b: NationId): boolean;

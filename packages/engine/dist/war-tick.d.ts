import type { NationId } from "@admin/world";
import { type Campaign, type Conflict, type ConflictSide } from "./state.js";
import { type EffectPacket } from "./effects.js";
import type { TurnPhase } from "./turn-loop.js";
export declare function commandQuality(campaign: Campaign, nation: NationId): number;
/**
 * How the war is actually going, above 1 for the aggressor.
 *
 * The weekly tick's own figure without the week's swing on it, exported because
 * anything that has to read whether a side is losing — a peace table, a screen —
 * must read the same strength the front is fought with rather than a second
 * opinion about who is winning.
 */
export declare function strengthRatio(campaign: Campaign, conflict: Conflict): number;
export declare function settle(conflict: Conflict, turn: number, status: Conflict["status"], description: string): Conflict;
/** The support a war opens with. A defense of home ground starts better supported than a war of choice. */
export declare const OPENING_WAR_SUPPORT: Readonly<Record<ConflictSide, number>>;
export declare const HELD_FRONT_INTENSITY = 0.2;
/**
 * The week's weight on each side from the strength ratio alone, before the
 * week's swing: what the week's losses are computed on, so they are derived
 * rather than drawn.
 */
export declare function derivedPressure(campaign: Campaign, conflict: Conflict): Readonly<Record<ConflictSide, number>>;
/**
 * What a war that ended this week leaves, read off the board after its last
 * week was fought. Two reasons it cannot share that week's packet: the
 * settlement writes each principal's standing as absolutes, which read against
 * the pre-week stats would erase the last week's attrition, and a government
 * that came in during the last week holds a commitment the pre-week board has
 * never seen, which would then stay deployed to a war that is over.
 *
 * A war that ends by attrition ends the promises made to fight it, the same
 * way one ended at a table does. Won or lost makes no difference to this: the
 * front is gone either way, and a sustainment line billing the treasury for a
 * theater nobody is in is the same defect in both directions.
 */
export declare function aftermathPacket(settled: Campaign, conflict: Conflict, decisive: boolean, summary: string): EffectPacket;
/**
 * The turn phase: one packet per active war, so the ledger explains each war's
 * week on its own line. Each packet is applied before the next war is computed
 * — two wars sharing a belligerent must both bite it, and attrition is written
 * as absolute stats, so a stale snapshot would let the second overwrite the first.
 */
export declare const conflictPhase: TurnPhase;

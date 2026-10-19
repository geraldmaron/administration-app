import type { NationId, OrgId } from "@admin/world";
import { type Campaign } from "./state.js";
import type { TurnPhase } from "./turn-loop.js";
/** How many alarmed nations it takes before they are a coalition rather than a
 * set of separately worried capitals. Exported because a surface that draws the
 * count has to draw it against this line, and a copy of the number on the player
 * side would be a second source of truth for a rule the engine owns. */
export declare const MIN_COALITION = 3;
/** Every bloc in play, with its members, ordered so a replay walks them the
 * same way regardless of how the nation record was built. */
export declare function blocsInPlay(campaign: Campaign): ReadonlyMap<OrgId, readonly NationId[]>;
/**
 * Who is currently turning on whom inside a bloc. A running war between two
 * members and a standing campaign by one against another count the same: the
 * compact is being ignored either way, and a member watching cannot tell the
 * difference between the two in terms of what it means for their own security.
 */
export declare function fracturesIn(campaign: Campaign, members: readonly NationId[]): readonly (readonly [NationId, NationId])[];
/**
 * How alarming one nation currently reads to another, folding the standing
 * relationship together with what the alarming state has actually been doing.
 * A high threat reading on its own is a border and a posture; a high reading
 * against a state that has been sanctioning and shooting is a problem.
 */
export declare function alarmAt(campaign: Campaign, watcher: NationId, subject: NationId): number;
/** The most capitals that can be one coalition on a board this size. */
export declare function coalitionCap(campaign: Campaign): number;
/**
 * Everyone currently alarmed by one nation and not standing with it, ordered for replay stability and
 * capped at the share of the board a coalition can be. Where more capitals
 * clear the standing line than that, the ones kept are the ones reading highest
 * — the line has risen, which is the only honest thing for it to do when the
 * whole world is alarmed at once.
 */
export declare function alarmedBy(campaign: Campaign, subject: NationId): readonly NationId[];
/**
 * The flag that stands while a coalition exists, so its formation is reported
 * once rather than every week it persists. Same contract conditions.ts uses for
 * `condition:<kind>:<nation>`: a derived world fact that authored content also
 * has a legitimate reason to gate on.
 */
export declare function coalitionFlag(subject: NationId): string;
/** The week a coalition formed, dated in its own key. */
export declare function coalitionSinceFlag(subject: NationId, turn: number): string;
/**
 * The week's work on every compact and every coalition, as one packet.
 *
 * Both halves are recomputed from the live board rather than stored, for the
 * same reason removal pressure is: a fracture is not an event that happened
 * once, it is a description of what the board currently looks like, and a
 * stored version of it would keep charging for a war that had ended.
 */
export declare const blocPhase: TurnPhase;

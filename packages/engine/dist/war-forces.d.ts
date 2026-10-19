import { type NationId } from "@admin/world";
import { type Campaign, type Conflict, type ConflictSide } from "./state.js";
export type Combatant = {
    readonly nation: NationId;
    /** People in the theater. */
    readonly personnel: number;
    /** How well each of them fights, 0..1 (`combatQuality`). */
    readonly quality: number;
};
/**
 * A corps at the invasion package's preferred size, in people: the least the
 * President's government fights any war with, because a country at war brings
 * its standoff weapons and air power whether or not a formation is on the
 * order of battle's books for the theater. Read when asked rather than at load,
 * so this module never evaluates an import while the war modules' cycle is
 * still loading.
 */
export declare function fullFrontPersonnel(): number;
/** Everyone fighting on one side this week, principal first. */
export declare function sideCombatants(campaign: Campaign, conflict: Conflict, side: ConflictSide): readonly Combatant[];
/** People a side has in the theater. */
export declare function sidePersonnel(combatants: readonly Combatant[]): number;
/** A side's quality, weighted by who has the most people there. */
export declare function sideQuality(combatants: readonly Combatant[]): number;

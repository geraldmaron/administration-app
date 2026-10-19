import { type NationId } from "@admin/world";
import { type TempoClaim, type TempoFamily } from "./npc-tempo.js";
import { type Campaign } from "./state.js";
/**
 * Planning value, for the owner to set: the most acts of force (military rungs
 * 3 to 5) the world's governments make in any term, and how long a pair of
 * governments rests after one before either may use force on the other again.
 * No opened source gives a rate of interstate uses of force at this grain; the
 * cooldown is half a year, long enough for a war an act opened to cool on its
 * own rather than be fed every week by the same pair.
 */
export declare const NPC_ACTS_OF_FORCE: TempoFamily;
/**
 * The owner's rate: at most two strait closures by other governments in a
 * term, with each strait resting half a term after one. A closure is a war
 * newly opened with a government on a priced strait's shores, where no war
 * already contests that strait.
 */
export declare const NPC_STRAIT_CLOSURES: TempoFamily;
/**
 * Operations against another government's hold on power: the owner's band is
 * one to six a term worldwide, US treaty partners included, and one sponsor
 * works against one government at most once in two years.
 */
export declare const NPC_REGIME_OPERATIONS: TempoFamily;
/**
 * The priced straits a new war between these two governments would close: one
 * of them is on its shores, they are not already at war, and no war on the
 * board already contests it.
 */
export declare function straitsANewWarWouldClose(campaign: Campaign, a: NationId, b: NationId): readonly string[];
type ForceRequest = {
    readonly actor: NationId;
    readonly target: NationId;
    readonly instrument: string;
    readonly rung: number;
};
/** Whether the request is an act of force: a blockade, a strike or an invasion. */
export declare function isActOfForce(request: ForceRequest): boolean;
/** The act of force a request would make, on the pair it rests. */
export declare function forceClaim(campaign: Campaign, request: ForceRequest): TempoClaim;
/** The strait closures a war opened between the request's two governments would make. */
export declare function straitClaims(campaign: Campaign, request: ForceRequest): readonly TempoClaim[];
/** Everything an act would claim before it is made, for the agent to check against the ledger. */
export declare function isRegimeOperation(request: ForceRequest): boolean;
/** One sponsor against one government: the key runs one way, because who works against whom is the fact. */
export declare function regimeClaim(campaign: Campaign, request: ForceRequest): TempoClaim;
export declare function coercionClaims(campaign: Campaign, request: ForceRequest): readonly TempoClaim[];
export {};

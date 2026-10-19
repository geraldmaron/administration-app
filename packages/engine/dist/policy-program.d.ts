import type { Effect } from "./effects.js";
import { type PolicyStatPath, type ProgramRestingOffset } from "./policy-stats.js";
import type { PolicyStance } from "./policy.js";
import { type Campaign, type NationRuntime } from "./state.js";
/** One domain's standing stance and how well the government delivers it. */
export type ProgramLine = {
    readonly stance: PolicyStance;
    readonly quality: number;
};
/**
 * One turn of a program, as it lands on the nation running it.
 *
 * Takes the nation rather than reading the player's, because nothing here is
 * about the player: the same function is what gives an NPC's program its
 * consequences. Quality scales what a program *delivers* and
 * never what it costs, the same asymmetry `movementToDeltas` applies — so a
 * weak minister's surveillance state watches less and censors just as much.
 *
 * The eleven paths with no rate law behind them are the ones written here. The
 * five that `macro.ts` reverts are not: on those a weekly level write is a bid
 * against a restoring force rather than a delivery, and what it settles at is
 * the authored figure divided by the reversion rate. Those five leave through
 * `policyRestingOffset` instead, which moves the target the law reverts to.
 */
export declare function policyNationEffects(runtime: NationRuntime, program: readonly ProgramLine[]): readonly Effect[];
/**
 * Where this program puts the five rates whose evolution law lives in
 * `macro.ts`, in each rate's own unit.
 *
 * Competence still scales what the program delivers, because a resting point a
 * government cannot actually hold the country at is not a resting point.
 */
export declare function policyRestingOffset(program: readonly ProgramLine[]): ProgramRestingOffset;
/**
 * A one-off movement of the same sixteen paths, landed on the player's own
 * nation. An executive order is a single act rather than a standing program, so
 * nothing here scales by competence — a decree is carried out by the state as
 * it is, and how well it was drafted has already been priced, in whether the
 * courts let it stand. What is shared with a program is the part that matters:
 * absolutes computed against live stats and held inside the schema's range, so
 * a government signing orders for eighty turns cannot write a campaign the
 * validator would reject.
 */
export declare function orderStatEffects(campaign: Campaign, movements: Partial<Record<PolicyStatPath, number>>, ownerId?: string): readonly Effect[];

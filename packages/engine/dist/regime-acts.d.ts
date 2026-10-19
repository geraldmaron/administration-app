import type { NationId } from "@admin/world";
import type { Effect, EffectPacket } from "./effect-types.js";
import { type InstrumentContext } from "./instrument-gates.js";
import type { Campaign } from "./state.js";
import type { Indictment, RegimeAct, RegimeOperation } from "./state-world.js";
/** Every operation on record, running or ended. Absent on older saves, which ran none. */
export declare function selectRegimeOperations(campaign: Campaign): readonly RegimeOperation[];
/** Every indictment the Justice Department has filed against a foreign leader, served or not. Absent on older saves, which filed none. */
export declare function selectIndictments(campaign: Campaign): readonly Indictment[];
/** The indictment on a government's leader that has not yet been served, if the Justice Department has filed one. */
export declare function openIndictment(campaign: Campaign, target: NationId): Indictment | undefined;
export declare function indictmentId(target: NationId, turn: number): string;
export declare function runningOperations(campaign: Campaign, target?: NationId): readonly RegimeOperation[];
/** The standing acts, the ones that run until they land, lapse or are exposed. */
export declare const STANDING_ACTS: readonly RegimeAct[];
export declare function isStandingAct(act: RegimeAct): boolean;
/** How much of a standing operation's force is left after it has run this long. */
export declare function operationStrength(op: RegimeOperation, turn: number): number;
/**
 * The weekly coup hazard a sponsor adds: the target's own exposure to a coup
 * (its proneness, its armed rival's ambition and how far it sits below full
 * order) times the operation's remaining strength. Read past the stability
 * ceiling: a sponsor can make a coup possible in a country that would not have
 * one on its own, which is the point of sponsoring one, but a country at full
 * order carries no exposure and gives the sponsor nothing to work with.
 */
export declare function sponsoredCoupTerm(campaign: Campaign, nation: NationId, proneness: number, ambition: number): number;
/** What a running political operation does to the target's next selection and to its parliament's patience. */
export declare function politicalActionPressure(campaign: Campaign, nation: NationId): {
    readonly standingPull: number;
    readonly confidenceLift: number;
};
/** The id an operation is filed under: who, against whom, which act, from which week. */
export declare function operationId(act: RegimeAct, sponsor: NationId, target: NationId, turn: number): string;
/** The standing operation a covert regime act starts, filed the week it lands. */
export declare function startOperationEffect(ctx: InstrumentContext, act: RegimeAct): Effect;
/**
 * The weekly chance a running operation comes out: its footprint, how well the
 * target looks, and how well the sponsor covers. A political operation leaves
 * half the footprint a coup does.
 */
export declare function exposureChance(campaign: Campaign, op: RegimeOperation): number;
/** The flag a story about an exposed operation run by the President's own government stands on. */
export declare function exposureScandalFlag(op: RegimeOperation): string;
/** What exposure leaves: a target government that remembers, and, when the sponsor is the player, a story. */
export declare function exposureEffects(campaign: Campaign, op: RegimeOperation): readonly Effect[];
/** The government the operation was aimed at no longer sits: the operation is over, and its successor leans toward the sponsor. */
export declare function fellEffects(campaign: Campaign, op: RegimeOperation): readonly Effect[];
/** Whether the government an operation was started against has since left office. */
export declare function targetFell(campaign: Campaign, op: RegimeOperation): boolean;
/** Every running operation's week. */
export declare function operationsWeek(campaign: Campaign): readonly EffectPacket[];
/** Whether a government declares an arsenal it can deliver: such powers are refused as targets. */
export declare function nuclearArmed(campaign: Campaign, nation: NationId): boolean;

import type { ForceAssetId, MilitaryBranch, Nation, NationId, OrgId, Relationship } from "@admin/world";
import type { InstrumentId, RungLevel } from "./instrument-ids.js";
import { type ForcePackage } from "./force-packages.js";
import { type Campaign } from "./state.js";
import type { Effect } from "./effects.js";
import type { RngStreams } from "./rng.js";
/**
 * Where a refused gate read a relationship the President can move, how far it
 * stands from the floor, so a screen can draw the gap and point at what closes
 * it. Only relationship readings carry one: reserves and readiness are not
 * built by an act toward this government.
 */
export type GateShortfall = {
    readonly reading: "trust";
    readonly have: number;
    readonly need: number;
};
export type CapabilityCheck = {
    readonly ok: boolean;
    readonly missingCapability?: string;
    readonly shortfall?: GateShortfall;
};
export type InstrumentContext = {
    readonly campaign: Campaign;
    readonly actor: NationId;
    readonly target: NationId;
    readonly streams: RngStreams;
    /** Present when the actor chose a scaleable package instead of the rung default. */
    readonly force?: ForcePackage;
    readonly strikeObjective?: import("./strike-assessment.js").StrikeObjective;
    /** Which operation a covert regime act is, when the actor chose one; the rung's default otherwise. */
    readonly regimeAct?: import("./state-world.js").RegimeAct;
};
export type InstrumentRung = {
    readonly instrument: InstrumentId;
    readonly rung: RungLevel;
    readonly id: string;
    readonly name: string;
    readonly gate: (ctx: InstrumentContext) => CapabilityCheck;
    readonly resolve: (ctx: InstrumentContext) => readonly Effect[];
};
export declare function liveNation(campaign: Campaign, id: NationId): Nation;
export declare function liveRelationship(campaign: Campaign, from: NationId, to: NationId): Relationship;
/** The bodies a government sits in this week: its authored roster, as any accession or withdrawal since has changed it. */
export declare function liveMemberships(campaign: Campaign, id: NationId): readonly OrgId[];
/**
 * Whether a government still sets its own tariffs against this target.
 *
 * A customs-union member has handed its tariff schedule to the union: it
 * raises a tariff on nobody alone, and the bloc acts as a bloc through its own
 * sanctions package. A free-trade-area member keeps its schedule against the
 * world and has dropped it against fellow members, so it cannot raise one on a
 * partner inside the area.
 */
export declare function tariffCompetence(campaign: Campaign, actor: NationId, target: NationId): CapabilityCheck;
/**
 * A strike that needs no air force over the target: the actor's missiles reach
 * the target's capital, or a country hosting the United States' forces when
 * the target is the United States. The alternative to the air-strength and
 * airframe gates on the strike rung, for a government whose answer is a missile.
 */
export declare function standoffReach(ctx: InstrumentContext): CapabilityCheck;
/**
 * Whether a strike this actor can make is a missile strike: it lacks the air
 * force the flown strike needs and its missiles reach. The strike's resolution
 * reads this so a missile salvo does not commit a hundred airframes.
 */
export declare function strikesByMissile(ctx: InstrumentContext): boolean;
export declare function sharesBorder(actor: Nation, target: Nation): boolean;
export declare function jitter(ctx: InstrumentContext, spread?: number): number;
export declare function requireAtLeast(value: number, min: number, capability: string, reading?: GateShortfall["reading"]): CapabilityCheck;
export declare function requireTrue(condition: boolean, capability: string): CapabilityCheck;
export declare function requireAll(...checks: readonly CapabilityCheck[]): CapabilityCheck;
/** Either way in is enough; where neither is, the first way's missing capability is the one named. */
export declare function requireAny(...checks: readonly CapabilityCheck[]): CapabilityCheck;
/**
 * A rung whose whole effect is to stand something up refuses while it stands.
 *
 * Three rungs at the top of three ladders — a full embargo, a severance of
 * relations, a security guarantee — do not describe an act so much as a state,
 * and the state is recorded as a flag. Nothing stopped any of them being
 * ordered again the following week against a country they were already in
 * force against, so the heaviest move on three ladders was also the most
 * repeatable one: the balance harness's reckless proxy spent half its term
 * embargoing countries it had already embargoed. Breaking off relations twice
 * is not twice as severe; it is the second one meaning nothing.
 */
export declare function notAlreadyStanding(ctx: InstrumentContext, flag: string, capability: string): CapabilityCheck;
export declare const PROJECTION_CAPS: Record<3 | 4 | 5, number>;
/**
 * Whether the actor can get force to the target at this rung: a shared border,
 * or a projection cost under the rung's cap, measured from the nearest
 * installation or treaty ally the actor can mount from (`staging.ts`).
 */
export declare function projectionAccess(ctx: InstrumentContext, cap: number, capability: string): CapabilityCheck;
/**
 * The capacity half of a military gate: what the services have available now,
 * as opposed to what they are on paper.
 *
 * Branch strength alone was the whole check, and branch strength is authored
 * and static — so a superpower held the top rung open forever and nothing an
 * administration did made next week's decision any harder. Readiness is the
 * figure the ladder already *charged* for military action and gated nothing
 * with; pairing the two is what turns a permanent capability into a rate.
 */
/**
 * The one nuclear test every refusal reads: warheads, declared, and a means to
 * deliver them. Force (below) and the operations against a government's hold
 * on power (`regime-acts.ts`) both refuse such a target; an arsenal a
 * government has never declared is read as it presents itself, and only
 * stiffens the odds.
 */
export declare function declaresDeliverableArsenal(arsenal: Nation["stats"]["military"]["arsenal"]): boolean;
/**
 * A government with a declared arsenal and the means to deliver it is not
 * offered as a target of force by anyone: no blockade, strike or invasion. The
 * test is the dataset's own (`arsenal.declared` and `deliveryTriad`), so no
 * list of countries drifts out of date, and a state that has never declared its
 * arsenal is read as it presents itself. Below that line a nuclear defender
 * still stiffens the odds (`resolution.ts`), which is information, not a wall.
 */
export declare function outsideNuclearDeterrence(ctx: InstrumentContext): CapabilityCheck;
export declare function forceAvailable(ctx: InstrumentContext, rung: 3 | 4 | 5): CapabilityCheck;
export declare function packageFormations(ctx: InstrumentContext, rung: number, fallbackBranch: MilitaryBranch, fallbackCount: number, fallbackType: ForceAssetId, capability: string): CapabilityCheck;
/**
 * The constitutional half of a military gate.
 *
 * Readiness and formations say what the services could do; this says what the
 * office is allowed to order. A president may introduce forces on their own
 * authority and answer for it — the first rung 4 or 5 against a country is
 * theirs to take, at a price Congress remembers — but sustaining it, or opening
 * a second front while the first has never been voted on, is not latitude the
 * office has. That is the missing constraint the whole force ceiling was
 * standing in for: money never stopped a superpower and readiness only sets a
 * tempo, so a president refused nothing simply aimed at the next capital.
 *
 * Applied to the player's own government and to nobody else's, because the
 * campaign carries one legislature and it is theirs. Every other capital is
 * modeled by its standing program, and holding a foreign government to a
 * Congress it does not have would be inventing a branch for fifty countries.
 */
export declare function warPowers(ctx: InstrumentContext, rung: RungLevel): CapabilityCheck;
/**
 * The same check for any act that introduces forces, the ladder's or not.
 * Entering somebody else's war is held to it too, so there is one statute and
 * no second door into a war that the office's authority does not reach.
 */
export declare function warPowersCheck(campaign: Campaign, actor: NationId, target: NationId, rung: RungLevel): CapabilityCheck;

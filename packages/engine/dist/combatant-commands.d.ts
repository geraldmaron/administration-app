import type { MilitaryBranch, NationId } from "@admin/world";
import type { Campaign, GameDate } from "./state.js";
import type { EffectPacket } from "./effects.js";
import type { TurnPhase } from "./turn-loop.js";
import { COMBATANT_COMMANDS, type CombatantCommandDef, type CombatantCommandId } from "./command-catalog.js";
export { COMBATANT_COMMANDS };
export type { CombatantCommandDef, CombatantCommandId };
/**
 * An officer holding a four-star position.
 *
 * Not a `PersonId`, and deliberately: the campaign's people are the political
 * cast, and a combatant commander is not one of them. The star belongs to the
 * position rather than to the officer — it terminates when the assignment does
 * and the officer keeps a permanent grade — so what this records is a tenure in
 * a chair, which is the fact the game needs when the chair is emptied.
 */
export type CommandOfficer = {
    readonly name: string;
    readonly service: MilitaryBranch;
    /** The permanent grade the officer reverts to. Relief costs the star, not the career. */
    readonly permanentGrade: string;
    readonly confirmedDay: number;
    /** Serving as acting commander because the seat was emptied and no successor is confirmed. */
    readonly acting?: true;
};
export type CommandPosture = "routine" | "heightened" | "surge";
export type CommandRuntime = {
    readonly id: CombatantCommandId;
    readonly commander?: CommandOfficer;
    /** Day the seat was emptied, where it is. A command is never left unled, only led by a deputy. */
    readonly vacantSinceDay?: number;
    /**
     * Share of each service's formations assigned to this command, 0..1.
     * Assigned, not allocated: what a commander may employ without asking.
     */
    readonly assignment: Readonly<Record<MilitaryBranch, number>>;
    readonly posture: CommandPosture;
    /** How many commanders this administration has relieved here. The institution counts. */
    readonly reliefs: number;
    readonly lastReliefTurn?: number;
    /** Missions the President and Secretary have actually assigned. A commander acts inside these and nowhere else. */
    readonly missions: readonly string[];
};
/** One country moved from one command's map to another, and why. */
export type UcpAmendment = {
    readonly nation: NationId;
    readonly from: CombatantCommandId;
    readonly to: CombatantCommandId;
    readonly day: number;
    readonly date: GameDate;
    readonly rationale: string;
};
export type UnifiedCommandState = {
    readonly commands: Readonly<Record<CombatantCommandId, CommandRuntime>>;
    /**
     * Only the deviations from the region default are stored, for the reason
     * trade edges are derived: a sixty-one row table nobody authored would be a
     * sixty-one row invention, and the default is a real reading of the plan.
     */
    readonly aorOverrides: Readonly<Record<string, CombatantCommandId>>;
    readonly amendments: readonly UcpAmendment[];
};
export declare function commandDef(id: CombatantCommandId): CombatantCommandDef | undefined;
export declare const GEOGRAPHIC_COMMANDS: readonly CombatantCommandDef[];
export declare const FUNCTIONAL_COMMANDS: readonly CombatantCommandDef[];
/**
 * Which command owns a country, before any amendment this administration made.
 *
 * Region first, then the named exceptions, because the exceptions are the
 * interesting part: Israel and Turkey and Egypt do not sit where their
 * neighborhood does, and each of those is a decision somebody took rather than
 * a line a map drew.
 */
export declare function defaultCommandFor(campaign: Campaign, nation: NationId): CombatantCommandId | undefined;
/** Which command owns a country now, amendments included. */
export declare function commandFor(campaign: Campaign, nation: NationId): CombatantCommandId | undefined;
/** Every country on one command's map. */
export declare function nationsInAor(campaign: Campaign, id: CombatantCommandId): readonly NationId[];
/**
 * Formations of a service this command may actually employ.
 *
 * Derived from the national bench rather than stored beside it: two ledgers of
 * the same divisions would disagree the first time a unit was committed, and
 * the one that mattered would be whichever the gate happened to read.
 */
export declare function assignedFormations(campaign: Campaign, id: CombatantCommandId, branch: MilitaryBranch): number | undefined;
/** What share of each service is assigned somewhere at all. Above 1 is impossible and is checked. */
export declare function assignedShare(campaign: Campaign, branch: MilitaryBranch): number;
export type ChainLink = "president" | "secretary" | "commander";
export type CommandAuthority = {
    readonly command?: CombatantCommandDef;
    /** Every link that is not what it should be, in the order the order would travel. */
    readonly breaks: readonly {
        readonly link: ChainLink;
        readonly reason: string;
    }[];
    /**
     * How well an execute order would actually be carried out in this theater,
     * 0..1. Never zero: a broken chain degrades execution, it does not make the
     * armed forces stop existing.
     */
    readonly execution: number;
};
/**
 * Whether an order can travel from this desk to that theater, and what it
 * loses on the way.
 *
 * The Secretary of Defense is a link, not a formality. An empty seat at the
 * Pentagon is the single most expensive thing on this list because the statute
 * puts the Secretary between the President and every commander in the world,
 * and an acting secretary can sign what a confirmed one can while carrying
 * none of the standing.
 */
export declare function commandAuthority(campaign: Campaign, nation: NationId): CommandAuthority;
/**
 * The same chain, read for a command rather than for a country on its map.
 *
 * The question a theater board asks, and the only form a functional command can
 * be asked in: Cyber Command and Transportation Command hold no map, so there is
 * no country whose chain would reach them.
 */
export declare function commandChain(campaign: Campaign, id: CombatantCommandId): CommandAuthority;
/**
 * Every command at inauguration, led.
 *
 * The asymmetry with the civilian side is the point and it is real: political
 * appointees leave with the administration that appointed them, and a four-star
 * does not. A new president is sworn in over a Pentagon with empty offices and
 * eleven theaters that all have a commander already, confirmed under the last
 * president, whose relief would be this president's decision rather than an
 * inherited vacancy.
 */
export declare function foundingUnifiedCommand(): UnifiedCommandState;
export type CommandResult = {
    readonly ok: true;
    readonly packet: EffectPacket;
} | {
    readonly ok: false;
    readonly reason: string;
};
/**
 * Relieve a combatant commander.
 *
 * Not a firing, and the difference is the whole reason this is its own act. A
 * civilian who is dismissed leaves; a relieved officer reverts to a permanent
 * grade and stays in the service, the deputy takes the command that afternoon,
 * and what the building reads is whether the relief was about the officer or
 * about the president. So the seat is never empty — it is worse than that, it
 * is filled by someone who knows they are temporary — and the residue lands on
 * the institution rather than on a vacancy counter.
 */
export declare function relieveCommander(campaign: Campaign, id: CombatantCommandId, rationale: string): CommandResult;
/**
 * Move forces between commands.
 *
 * Refused outright with no Secretary of Defense, and that refusal is the
 * statute rather than a difficulty setting: assignment runs through the
 * Secretary under procedures the President approved, so an empty Pentagon is
 * a president who can order a war and cannot move a division to it.
 */
export declare function reassignForces(campaign: Campaign, from: CombatantCommandId, to: CombatantCommandId, branch: MilitaryBranch, share: number): CommandResult;
/**
 * Move a country from one command's map to another.
 *
 * The Unified Command Plan is a document the Chairman prepares and the
 * President approves, so this is an act with a date and a rationale rather than
 * a setting. It is also the only way the map in this game ever changes, which
 * is the honest shape: nothing about geography moved when Israel changed hands.
 */
export declare function amendUnifiedCommandPlan(campaign: Campaign, nation: NationId, to: CombatantCommandId, rationale: string): CommandResult;
/**
 * Why a theater stands engaged: governments in its area the country is fighting,
 * as a principal or beside one, has forces introduced against, or holds forces
 * committed toward. A strike opens no war, so a reading resting on wars alone
 * would leave the theater of an air campaign standing at routine.
 */
export type CommandEngagement = {
    readonly against: readonly NationId[];
    readonly toward: readonly NationId[];
};
export declare function commandEngagement(campaign: Campaign, id: CombatantCommandId): CommandEngagement | undefined;
/**
 * What a theater actually stands at: the President's order, and never below
 * heightened while the theater is engaged. An order back to routine is kept,
 * and takes effect the week the engagement ends.
 */
export declare function effectivePosture(campaign: Campaign, id: CombatantCommandId): CommandPosture;
/**
 * Raise or lower what a theater is standing at.
 *
 * A posture is a bill, not a mood: a surged theater burns readiness every week
 * it stays surged, which is why leaving one at surge because a crisis might
 * come back is a decision with a price rather than free insurance.
 */
export declare function setCommandPosture(campaign: Campaign, id: CombatantCommandId, posture: CommandPosture): CommandResult;
export declare const POSTURE_READINESS_COST: Readonly<Record<CommandPosture, number>>;
/**
 * How much of a war week's pressure a theater's posture takes off the
 * American side: nothing at routine, a twentieth at heightened, a tenth at
 * surge. Bounded on purpose. A posture is readiness spent in advance, and it
 * buys a margin in the fighting, not the outcome; the surge keeps its own
 * readiness bill above.
 */
export declare const POSTURE_PRESSURE_RELIEF: Readonly<Record<CommandPosture, number>>;
/** The share of a war week's pressure the American side still carries in this theater, from 1 down to 0.9. */
export declare function posturePressureFactor(campaign: Campaign, theater: NationId): number;
export declare const SUCCESSOR_CONFIRMATION_DAYS = 84;
/**
 * The commands' own week: postures draw on readiness, an engaged theater at
 * least at heightened, and acting commanders are confirmed once the Senate has
 * had the time it takes.
 */
export declare const commandPhase: TurnPhase;

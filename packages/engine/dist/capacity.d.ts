import type { ForceAssetId, MilitaryBranch, NationId } from "@admin/world";
import { type Campaign, type NationRuntime } from "./state.js";
import type { TurnPhase } from "./turn-loop.js";
/**
 * The readiness a nation's establishment can hold, as its recovery anchor.
 *
 * Recovery is toward the authored figure rather than toward 1: what a force
 * can hold indefinitely is what its budget, its bases and its maintenance
 * depots support, and that is exactly what the authored reading is a
 * statement about. A conscript army that opens at 0.3 does not become a
 * professional one by resting.
 *
 * Raised, never lowered, in proportion to what an appropriation has built.
 * The budget writes readiness up and this phase used to pull it straight back
 * to the figure the campaign opened with, so money bought a week of readiness
 * and nothing after it. The establishment the same appropriation builds
 * (doctrine, the services, lift) is what holds a higher figure up, and it is
 * the part nothing else pulls back.
 */
export declare function readinessAnchor(runtime: NationRuntime): number;
/**
 * How far a service has grown or shrunk since the campaign began: its live
 * branch strength over the strength it was handed.
 *
 * Branch strength is what an appropriation buys, and it is a reading rather
 * than a count; the order of battle is the count. Reading one through the
 * other is what makes money spent on the air force show up as airframes a
 * player can count, rather than as a figure that climbs beside a roster that
 * never moves.
 */
export declare function establishmentScale(campaign: Campaign, nation: NationId, branch: MilitaryBranch): number;
/**
 * The share of a fielded force ready to go this week: live readiness over the
 * anchor it recovers toward. Proportional rather than a bar each unit clears
 * or does not, because every unit of a type carries one authored readiness
 * figure and a bar would take all eleven carriers off the board in one week.
 */
export declare function readyShare(campaign: Campaign, nation: NationId): number;
/**
 * How much readiness a week of peace returns.
 *
 * The rate is what sets the tempo of the whole military ladder: at this figure
 * an expeditionary invasion is affordable roughly every eight weeks and a
 * limited strike every four. Slower than this and a term holds one war; faster
 * and the ceiling stops being felt.
 */
export declare const READINESS_RECOVERY_PER_TURN = 0.02;
/** What each rung of the military ladder takes out of the force that uses it. */
export declare const MILITARY_READINESS_COST: Readonly<Record<3 | 4 | 5, number>>;
/**
 * What each rung needs available before it can be ordered.
 *
 * Deliberately below the cost of the rung above it in every case: the gate is
 * meant to be a ceiling on tempo, not a lockout. A force at the floor can still
 * exercise and still deploy forward — signaling is what a military does when
 * it cannot do anything else — and climbing back to a strike is a matter of
 * weeks the player can count rather than a state they cannot leave.
 */
export declare const MILITARY_READINESS_GATES: Readonly<Record<3 | 4 | 5, number>>;
/**
 * Formations a branch has on the books, whatever their state.
 *
 * Absent for a nation that ships no order of battle, which is most of them —
 * and absent is not zero. A gate that read a missing decomposition as an empty
 * one would refuse every NPC the rungs it has always been able to take, on the
 * strength of authoring that has not happened yet.
 */
export declare function branchUnits(campaign: Campaign, nation: NationId, branch: MilitaryBranch): {
    type: "army.division" | "army.airborne-division" | "army.armored-brigade" | "army.brigade-combat-team" | "army.mechanized-brigade" | "army.air-assault-brigade" | "army.combat-aviation-brigade" | "army.group-army" | "army.combined-arms-army" | "army.maneuver-battalion" | "army.air-defense-battalion" | "army.air-defense-battery" | "navy.carrier-strike-group" | "navy.surface-action-group" | "navy.amphibious-ready-group" | "navy.fleet" | "navy.aircraft-carrier" | "navy.attack-submarine" | "navy.ballistic-missile-submarine" | "navy.surface-combatant" | "navy.frigate" | "navy.amphibious-ship" | "navy.mine-countermeasures-vessel" | "air.fighter-squadron" | "air.bomber-squadron" | "air.refueling-squadron" | "air.fighter-brigade" | "air.fighter-regiment" | "air.fighter" | "air.strategic-bomber" | "air.tanker" | "air.strategic-airlifter" | "air.transport" | "marines.expeditionary-force" | "marines.littoral-regiment" | "marines.brigade" | "marines.infantry-regiment" | "marines.infantry-battalion" | "marines.expeditionary-unit" | "space.delta" | "space.missile-warning-constellation" | "space.navigation-satellite" | "cyber.mission-force-team" | "cyber.national-mission-team" | "cyber.network-defense-team" | "cyber.combat-mission-team";
    count: number;
    readiness: number;
    label?: string | undefined;
}[] | {
    type: "army.division" | "army.airborne-division" | "army.armored-brigade" | "army.brigade-combat-team" | "army.mechanized-brigade" | "army.air-assault-brigade" | "army.combat-aviation-brigade" | "army.group-army" | "army.combined-arms-army" | "army.maneuver-battalion" | "army.air-defense-battalion" | "army.air-defense-battery" | "navy.carrier-strike-group" | "navy.surface-action-group" | "navy.amphibious-ready-group" | "navy.fleet" | "navy.aircraft-carrier" | "navy.attack-submarine" | "navy.ballistic-missile-submarine" | "navy.surface-combatant" | "navy.frigate" | "navy.amphibious-ship" | "navy.mine-countermeasures-vessel" | "air.fighter-squadron" | "air.bomber-squadron" | "air.refueling-squadron" | "air.fighter-brigade" | "air.fighter-regiment" | "air.fighter" | "air.strategic-bomber" | "air.tanker" | "air.strategic-airlifter" | "air.transport" | "marines.expeditionary-force" | "marines.littoral-regiment" | "marines.brigade" | "marines.infantry-regiment" | "marines.infantry-battalion" | "marines.expeditionary-unit" | "space.delta" | "space.missile-warning-constellation" | "space.navigation-satellite" | "cyber.mission-force-team" | "cyber.national-mission-team" | "cyber.network-defense-team" | "cyber.combat-mission-team";
    count: number;
    readiness: number;
    label?: string | undefined;
}[] | {
    type: "army.division" | "army.airborne-division" | "army.armored-brigade" | "army.brigade-combat-team" | "army.mechanized-brigade" | "army.air-assault-brigade" | "army.combat-aviation-brigade" | "army.group-army" | "army.combined-arms-army" | "army.maneuver-battalion" | "army.air-defense-battalion" | "army.air-defense-battery" | "navy.carrier-strike-group" | "navy.surface-action-group" | "navy.amphibious-ready-group" | "navy.fleet" | "navy.aircraft-carrier" | "navy.attack-submarine" | "navy.ballistic-missile-submarine" | "navy.surface-combatant" | "navy.frigate" | "navy.amphibious-ship" | "navy.mine-countermeasures-vessel" | "air.fighter-squadron" | "air.bomber-squadron" | "air.refueling-squadron" | "air.fighter-brigade" | "air.fighter-regiment" | "air.fighter" | "air.strategic-bomber" | "air.tanker" | "air.strategic-airlifter" | "air.transport" | "marines.expeditionary-force" | "marines.littoral-regiment" | "marines.brigade" | "marines.infantry-regiment" | "marines.infantry-battalion" | "marines.expeditionary-unit" | "space.delta" | "space.missile-warning-constellation" | "space.navigation-satellite" | "cyber.mission-force-team" | "cyber.national-mission-team" | "cyber.network-defense-team" | "cyber.combat-mission-team";
    count: number;
    readiness: number;
    label?: string | undefined;
}[] | {
    type: "army.division" | "army.airborne-division" | "army.armored-brigade" | "army.brigade-combat-team" | "army.mechanized-brigade" | "army.air-assault-brigade" | "army.combat-aviation-brigade" | "army.group-army" | "army.combined-arms-army" | "army.maneuver-battalion" | "army.air-defense-battalion" | "army.air-defense-battery" | "navy.carrier-strike-group" | "navy.surface-action-group" | "navy.amphibious-ready-group" | "navy.fleet" | "navy.aircraft-carrier" | "navy.attack-submarine" | "navy.ballistic-missile-submarine" | "navy.surface-combatant" | "navy.frigate" | "navy.amphibious-ship" | "navy.mine-countermeasures-vessel" | "air.fighter-squadron" | "air.bomber-squadron" | "air.refueling-squadron" | "air.fighter-brigade" | "air.fighter-regiment" | "air.fighter" | "air.strategic-bomber" | "air.tanker" | "air.strategic-airlifter" | "air.transport" | "marines.expeditionary-force" | "marines.littoral-regiment" | "marines.brigade" | "marines.infantry-regiment" | "marines.infantry-battalion" | "marines.expeditionary-unit" | "space.delta" | "space.missile-warning-constellation" | "space.navigation-satellite" | "cyber.mission-force-team" | "cyber.national-mission-team" | "cyber.network-defense-team" | "cyber.combat-mission-team";
    count: number;
    readiness: number;
    label?: string | undefined;
}[] | {
    type: "army.division" | "army.airborne-division" | "army.armored-brigade" | "army.brigade-combat-team" | "army.mechanized-brigade" | "army.air-assault-brigade" | "army.combat-aviation-brigade" | "army.group-army" | "army.combined-arms-army" | "army.maneuver-battalion" | "army.air-defense-battalion" | "army.air-defense-battery" | "navy.carrier-strike-group" | "navy.surface-action-group" | "navy.amphibious-ready-group" | "navy.fleet" | "navy.aircraft-carrier" | "navy.attack-submarine" | "navy.ballistic-missile-submarine" | "navy.surface-combatant" | "navy.frigate" | "navy.amphibious-ship" | "navy.mine-countermeasures-vessel" | "air.fighter-squadron" | "air.bomber-squadron" | "air.refueling-squadron" | "air.fighter-brigade" | "air.fighter-regiment" | "air.fighter" | "air.strategic-bomber" | "air.tanker" | "air.strategic-airlifter" | "air.transport" | "marines.expeditionary-force" | "marines.littoral-regiment" | "marines.brigade" | "marines.infantry-regiment" | "marines.infantry-battalion" | "marines.expeditionary-unit" | "space.delta" | "space.missile-warning-constellation" | "space.navigation-satellite" | "cyber.mission-force-team" | "cyber.national-mission-team" | "cyber.network-defense-team" | "cyber.combat-mission-team";
    count: number;
    readiness: number;
    label?: string | undefined;
}[] | {
    type: "army.division" | "army.airborne-division" | "army.armored-brigade" | "army.brigade-combat-team" | "army.mechanized-brigade" | "army.air-assault-brigade" | "army.combat-aviation-brigade" | "army.group-army" | "army.combined-arms-army" | "army.maneuver-battalion" | "army.air-defense-battalion" | "army.air-defense-battery" | "navy.carrier-strike-group" | "navy.surface-action-group" | "navy.amphibious-ready-group" | "navy.fleet" | "navy.aircraft-carrier" | "navy.attack-submarine" | "navy.ballistic-missile-submarine" | "navy.surface-combatant" | "navy.frigate" | "navy.amphibious-ship" | "navy.mine-countermeasures-vessel" | "air.fighter-squadron" | "air.bomber-squadron" | "air.refueling-squadron" | "air.fighter-brigade" | "air.fighter-regiment" | "air.fighter" | "air.strategic-bomber" | "air.tanker" | "air.strategic-airlifter" | "air.transport" | "marines.expeditionary-force" | "marines.littoral-regiment" | "marines.brigade" | "marines.infantry-regiment" | "marines.infantry-battalion" | "marines.expeditionary-unit" | "space.delta" | "space.missile-warning-constellation" | "space.navigation-satellite" | "cyber.mission-force-team" | "cyber.national-mission-team" | "cyber.network-defense-team" | "cyber.combat-mission-team";
    count: number;
    readiness: number;
    label?: string | undefined;
}[] | undefined;
/** What a branch is, in the names a player reads rather than in a count. */
export declare function branchCapabilities(campaign: Campaign, nation: NationId, branch: MilitaryBranch): {
    name: "army.division" | "army.airborne-division" | "army.armored-brigade" | "army.brigade-combat-team" | "army.mechanized-brigade" | "army.air-assault-brigade" | "army.combat-aviation-brigade" | "army.group-army" | "army.combined-arms-army" | "army.maneuver-battalion" | "army.air-defense-battalion" | "army.air-defense-battery" | "navy.carrier-strike-group" | "navy.surface-action-group" | "navy.amphibious-ready-group" | "navy.fleet" | "navy.aircraft-carrier" | "navy.attack-submarine" | "navy.ballistic-missile-submarine" | "navy.surface-combatant" | "navy.frigate" | "navy.amphibious-ship" | "navy.mine-countermeasures-vessel" | "air.fighter-squadron" | "air.bomber-squadron" | "air.refueling-squadron" | "air.fighter-brigade" | "air.fighter-regiment" | "air.fighter" | "air.strategic-bomber" | "air.tanker" | "air.strategic-airlifter" | "air.transport" | "marines.expeditionary-force" | "marines.littoral-regiment" | "marines.brigade" | "marines.infantry-regiment" | "marines.infantry-battalion" | "marines.expeditionary-unit" | "space.delta" | "space.missile-warning-constellation" | "space.navigation-satellite" | "cyber.mission-force-team" | "cyber.national-mission-team" | "cyber.network-defense-team" | "cyber.combat-mission-team";
    count: number;
    label?: string | undefined;
}[] | {
    name: "army.division" | "army.airborne-division" | "army.armored-brigade" | "army.brigade-combat-team" | "army.mechanized-brigade" | "army.air-assault-brigade" | "army.combat-aviation-brigade" | "army.group-army" | "army.combined-arms-army" | "army.maneuver-battalion" | "army.air-defense-battalion" | "army.air-defense-battery" | "navy.carrier-strike-group" | "navy.surface-action-group" | "navy.amphibious-ready-group" | "navy.fleet" | "navy.aircraft-carrier" | "navy.attack-submarine" | "navy.ballistic-missile-submarine" | "navy.surface-combatant" | "navy.frigate" | "navy.amphibious-ship" | "navy.mine-countermeasures-vessel" | "air.fighter-squadron" | "air.bomber-squadron" | "air.refueling-squadron" | "air.fighter-brigade" | "air.fighter-regiment" | "air.fighter" | "air.strategic-bomber" | "air.tanker" | "air.strategic-airlifter" | "air.transport" | "marines.expeditionary-force" | "marines.littoral-regiment" | "marines.brigade" | "marines.infantry-regiment" | "marines.infantry-battalion" | "marines.expeditionary-unit" | "space.delta" | "space.missile-warning-constellation" | "space.navigation-satellite" | "cyber.mission-force-team" | "cyber.national-mission-team" | "cyber.network-defense-team" | "cyber.combat-mission-team";
    count: number;
    label?: string | undefined;
}[] | {
    name: "army.division" | "army.airborne-division" | "army.armored-brigade" | "army.brigade-combat-team" | "army.mechanized-brigade" | "army.air-assault-brigade" | "army.combat-aviation-brigade" | "army.group-army" | "army.combined-arms-army" | "army.maneuver-battalion" | "army.air-defense-battalion" | "army.air-defense-battery" | "navy.carrier-strike-group" | "navy.surface-action-group" | "navy.amphibious-ready-group" | "navy.fleet" | "navy.aircraft-carrier" | "navy.attack-submarine" | "navy.ballistic-missile-submarine" | "navy.surface-combatant" | "navy.frigate" | "navy.amphibious-ship" | "navy.mine-countermeasures-vessel" | "air.fighter-squadron" | "air.bomber-squadron" | "air.refueling-squadron" | "air.fighter-brigade" | "air.fighter-regiment" | "air.fighter" | "air.strategic-bomber" | "air.tanker" | "air.strategic-airlifter" | "air.transport" | "marines.expeditionary-force" | "marines.littoral-regiment" | "marines.brigade" | "marines.infantry-regiment" | "marines.infantry-battalion" | "marines.expeditionary-unit" | "space.delta" | "space.missile-warning-constellation" | "space.navigation-satellite" | "cyber.mission-force-team" | "cyber.national-mission-team" | "cyber.network-defense-team" | "cyber.combat-mission-team";
    count: number;
    label?: string | undefined;
}[] | {
    name: "army.division" | "army.airborne-division" | "army.armored-brigade" | "army.brigade-combat-team" | "army.mechanized-brigade" | "army.air-assault-brigade" | "army.combat-aviation-brigade" | "army.group-army" | "army.combined-arms-army" | "army.maneuver-battalion" | "army.air-defense-battalion" | "army.air-defense-battery" | "navy.carrier-strike-group" | "navy.surface-action-group" | "navy.amphibious-ready-group" | "navy.fleet" | "navy.aircraft-carrier" | "navy.attack-submarine" | "navy.ballistic-missile-submarine" | "navy.surface-combatant" | "navy.frigate" | "navy.amphibious-ship" | "navy.mine-countermeasures-vessel" | "air.fighter-squadron" | "air.bomber-squadron" | "air.refueling-squadron" | "air.fighter-brigade" | "air.fighter-regiment" | "air.fighter" | "air.strategic-bomber" | "air.tanker" | "air.strategic-airlifter" | "air.transport" | "marines.expeditionary-force" | "marines.littoral-regiment" | "marines.brigade" | "marines.infantry-regiment" | "marines.infantry-battalion" | "marines.expeditionary-unit" | "space.delta" | "space.missile-warning-constellation" | "space.navigation-satellite" | "cyber.mission-force-team" | "cyber.national-mission-team" | "cyber.network-defense-team" | "cyber.combat-mission-team";
    count: number;
    label?: string | undefined;
}[] | {
    name: "army.division" | "army.airborne-division" | "army.armored-brigade" | "army.brigade-combat-team" | "army.mechanized-brigade" | "army.air-assault-brigade" | "army.combat-aviation-brigade" | "army.group-army" | "army.combined-arms-army" | "army.maneuver-battalion" | "army.air-defense-battalion" | "army.air-defense-battery" | "navy.carrier-strike-group" | "navy.surface-action-group" | "navy.amphibious-ready-group" | "navy.fleet" | "navy.aircraft-carrier" | "navy.attack-submarine" | "navy.ballistic-missile-submarine" | "navy.surface-combatant" | "navy.frigate" | "navy.amphibious-ship" | "navy.mine-countermeasures-vessel" | "air.fighter-squadron" | "air.bomber-squadron" | "air.refueling-squadron" | "air.fighter-brigade" | "air.fighter-regiment" | "air.fighter" | "air.strategic-bomber" | "air.tanker" | "air.strategic-airlifter" | "air.transport" | "marines.expeditionary-force" | "marines.littoral-regiment" | "marines.brigade" | "marines.infantry-regiment" | "marines.infantry-battalion" | "marines.expeditionary-unit" | "space.delta" | "space.missile-warning-constellation" | "space.navigation-satellite" | "cyber.mission-force-team" | "cyber.national-mission-team" | "cyber.network-defense-team" | "cyber.combat-mission-team";
    count: number;
    label?: string | undefined;
}[] | {
    name: "army.division" | "army.airborne-division" | "army.armored-brigade" | "army.brigade-combat-team" | "army.mechanized-brigade" | "army.air-assault-brigade" | "army.combat-aviation-brigade" | "army.group-army" | "army.combined-arms-army" | "army.maneuver-battalion" | "army.air-defense-battalion" | "army.air-defense-battery" | "navy.carrier-strike-group" | "navy.surface-action-group" | "navy.amphibious-ready-group" | "navy.fleet" | "navy.aircraft-carrier" | "navy.attack-submarine" | "navy.ballistic-missile-submarine" | "navy.surface-combatant" | "navy.frigate" | "navy.amphibious-ship" | "navy.mine-countermeasures-vessel" | "air.fighter-squadron" | "air.bomber-squadron" | "air.refueling-squadron" | "air.fighter-brigade" | "air.fighter-regiment" | "air.fighter" | "air.strategic-bomber" | "air.tanker" | "air.strategic-airlifter" | "air.transport" | "marines.expeditionary-force" | "marines.littoral-regiment" | "marines.brigade" | "marines.infantry-regiment" | "marines.infantry-battalion" | "marines.expeditionary-unit" | "space.delta" | "space.missile-warning-constellation" | "space.navigation-satellite" | "cyber.mission-force-team" | "cyber.national-mission-team" | "cyber.network-defense-team" | "cyber.combat-mission-team";
    count: number;
    label?: string | undefined;
}[] | undefined;
/**
 * Formations of a branch that could actually go somewhere this week.
 *
 * A unit counts as available when its own readiness clears the bar and it is
 * not already committed elsewhere — which is what makes a second crisis find a
 * thinner bench than the first. The count is the establishment's as the budget
 * has grown it, at the share national readiness can field this week, so a
 * force spent in one crisis is visibly smaller in the next. `undefined` where
 * the nation ships no decomposition, for the same reason `branchUnits` is.
 */
export declare function availableUnits(campaign: Campaign, nation: NationId, branch: MilitaryBranch, minimumReadiness?: number): number | undefined;
/**
 * Formations of one named type still free this week.
 *
 * `undefined` where the nation ships no decomposition, for the same reason
 * `availableUnits` is. Zero where the type is missing from an authored branch:
 * naming a package the dataset does not carry is a closed package, not a gate
 * the NPC path can ignore.
 */
export declare function availableUnitsOfType(campaign: Campaign, nation: NationId, branch: MilitaryBranch, unitType: ForceAssetId, minimumReadiness?: number): number | undefined;
export type ForceBench = {
    readonly branch: MilitaryBranch;
    readonly unitType: ForceAssetId;
    /** What the campaign opened with: the establishment an appropriation is measured against. */
    readonly establishment: number;
    /** What the service holds now, grown or shrunk with its branch strength. */
    readonly fielded: number;
    /** Held abroad by standing commitments. */
    readonly committed: number;
    /** Free to go somewhere this week. */
    readonly available: number;
};
/**
 * One holding's bench: what the campaign opened with, what the budget has made
 * of it, how much is abroad and how much could go this week. `undefined` where
 * the nation ships no order of battle for it, which is most of the world: a
 * count the dataset does not hold is not a count to print.
 */
export declare function selectForceBench(campaign: Campaign, nation: NationId, branch: MilitaryBranch, unitType: ForceAssetId): ForceBench | undefined;
/**
 * Formations already spoken for by a standing commitment.
 *
 * Reads the commitments a campaign carries rather than a second store, so a
 * deployment is subtracted from the homeland's bench by the same fact that
 * makes it a budget line.
 */
export declare function committedUnits(campaign: Campaign, nation: NationId, branch: MilitaryBranch): number;
export declare function committedUnitsOfType(campaign: Campaign, nation: NationId, branch: MilitaryBranch, unitType: ForceAssetId): number;
/**
 * People under arms this nation has standing toward a country or a war, at the
 * catalog's establishment for each holding.
 *
 * In people rather than in counts, because a count is unit-blind: two hundred
 * airframes, four hulls and eight brigades are three different sizes of thing,
 * and adding the numbers made a strike package outweigh a corps.
 */
export declare function committedPersonnelToward(campaign: Campaign, actor: NationId, targetId: string): number;
/**
 * How far below its own establishment a nation's standing commitments hold it.
 *
 * Forces abroad are forces not resting, not training and not in the depot, so
 * an administration that has committed a third of a service cannot bring the
 * whole establishment back to full readiness however long it waits. This is
 * what makes a deployment a lasting decision rather than a week's expense.
 */
export declare function commitmentDrag(campaign: Campaign, nation: NationId): number;
/** The readiness a nation can actually climb back to, given what it has out. */
export declare function readinessCeiling(campaign: Campaign, nation: NationId): number;
/** What a covert rung takes out of the service that runs it. */
export declare const COVERT_CAPABILITY_COST: Readonly<Record<4 | 5, number>>;
export declare const INTEL_RECOVERY_PER_TURN = 0.015;
/**
 * A week of rest, refit, rotation and recruiting, everywhere at once.
 *
 * Runs for NPCs on the same arithmetic as for the player, because the ladder is
 * one code path and a rule that only depleted the player's capacity would hand
 * the world a tempo the player cannot match. A nation already at its own
 * ceiling emits nothing, so the ordinary week costs a couple of comparisons per
 * nation and writes no effects at all.
 */
export declare const capacityPhase: TurnPhase;

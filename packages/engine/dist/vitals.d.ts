import type { StateId } from "@admin/world";
import type { PopulationTollEffect } from "./effect-types.js";
import type { Campaign } from "./state.js";
import { WEEKLY_YEAR_FRACTION } from "./pace.js";
import type { TurnPhase } from "./turn-loop.js";
export { WEEKLY_YEAR_FRACTION };
/**
 * `population' = population * (1 + (birthRate - deathRate + netMigration) * yearFraction)`.
 * Pure. `birthRate`/`deathRate`/`netMigration` are read as they stand this
 * turn — whether they are still the authored dataset figures or one day
 * evolve under their own rate law (not this function's concern) is
 * this function's caller's business, not its own.
 */
export declare function populationIdentity(population: number, birthRate: number, deathRate: number, netMigration: number, yearFraction: number): number;
/**
 * The player's own population delta, distributed across every state pro
 * rata by that state's current share of the player nation's population.
 *
 * The last state (sorted id order, deterministic) absorbs whatever residue
 * floating-point division leaves, so the state deltas always sum to exactly
 * the nation delta they were given — the same residue-to-the-last-entry
 * convention `districtPopulation`'s sealed share and
 * `apportionDelegations` both already use. No vital-deviation weighting: the
 * `StateVitalDeviation` layer (unemployment/crime/cost-of-living)
 * belongs to a different rate entirely and does not exist yet — weighting
 * population by a deviation that is not built would be inventing a number.
 */
export declare function distributedStateDeltas(states: Readonly<Record<StateId, {
    readonly population: number;
}>>, nationDelta: number): ReadonlyMap<StateId, number>;
/** Charge a known state first; spread only an unlocated toll or local overflow. */
export declare function stateDeathDeltas(states: Readonly<Record<StateId, {
    readonly population: number;
}>>, deaths: number, place?: StateId): ReadonlyMap<StateId, number>;
/** Live writer for a declared toll; the national and state stocks move together. */
export declare function applyPopulationToll(campaign: Campaign, effect: PopulationTollEffect): Campaign;
/**
 * Every nation's population moves this turn. The player's nation moves at
 * the state level first — `distributedStateDeltas`, applied and clamped at
 * zero per state — and the nation's own figure is then the sum of the states
 * it just wrote, never computed independently: the same number twice, kept
 * honest by construction rather than by a separate reconciliation pass.
 * Every other nation, which carries no state layer, writes its identity
 * directly.
 *
 * Runs after `commitmentPhase` and before `fiscalPhase` — see the ordering
 * comment in `turn-phases.ts`.
 */
export declare const vitalsPhase: TurnPhase;

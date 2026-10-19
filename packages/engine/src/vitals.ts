import type { NationId, StateId } from "@admin/world";
import type { Effect, EffectPacket } from "./effects.js";
import type { PopulationTollEffect } from "./effect-types.js";
import type { Campaign } from "./state.js";
import { WEEKLY_YEAR_FRACTION } from "./pace.js";
import type { TurnPhase } from "./turn-loop.js";

export { WEEKLY_YEAR_FRACTION };

// The stock identities: quantities driven by rates rather
// than rates themselves, computed once per turn in one place. Not a law in
// `macro.ts`'s sense — nothing here calls `nextValue` — because a stock is a
// fact accumulated from rates that already moved elsewhere this turn, not a
// value that reverts toward a baseline of its own.
//
// This phase owns `demography.population` alone. `economy.debt`,
// `economy.gdp` and `gdpPerCapita` are `fiscalPhase`'s, for every nation
// (`fiscal.ts`) — a second writer of the same fields would be exactly the
// ratchet `macroDriftPhase`'s own header comment exists to prevent, so
// `vitalsPhase` runs before it and never touches economy at all.

/**
 * `population' = population * (1 + (birthRate - deathRate + netMigration) * yearFraction)`.
 * Pure. `birthRate`/`deathRate`/`netMigration` are read as they stand this
 * turn — whether they are still the authored dataset figures or one day
 * evolve under their own rate law (not this function's concern) is
 * this function's caller's business, not its own.
 */
export function populationIdentity(
  population: number,
  birthRate: number,
  deathRate: number,
  netMigration: number,
  yearFraction: number,
): number {
  return population * (1 + (birthRate - deathRate + netMigration) * yearFraction);
}

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
export function distributedStateDeltas(
  states: Readonly<Record<StateId, { readonly population: number }>>,
  nationDelta: number,
): ReadonlyMap<StateId, number> {
  const ids = (Object.keys(states) as StateId[]).sort((a, b) => (a as string).localeCompare(b as string));
  const total = ids.reduce((sum, id) => sum + states[id]!.population, 0);
  const deltas = new Map<StateId, number>();
  let distributed = 0;
  for (let i = 0; i < ids.length; i++) {
    const id = ids[i]!;
    const isLast = i === ids.length - 1;
    const share = total > 0 ? states[id]!.population / total : 1 / ids.length;
    const delta = isLast ? nationDelta - distributed : nationDelta * share;
    distributed += delta;
    deltas.set(id, delta);
  }
  return deltas;
}

/** Charge a known state first; spread only an unlocated toll or local overflow. */
export function stateDeathDeltas(
  states: Readonly<Record<StateId, { readonly population: number }>>,
  deaths: number,
  place?: StateId,
): ReadonlyMap<StateId, number> {
  const total = Object.values(states).reduce((sum, state) => sum + state.population, 0);
  const charged = Math.min(Math.max(0, deaths), total);
  const local = place && states[place] ? Math.min(charged, states[place].population) : 0;
  const remaining = Object.fromEntries(Object.entries(states).filter(([id]) => id !== place)) as typeof states;
  const deltas = new Map(distributedStateDeltas(local ? remaining : states, -(charged - local)));
  if (local && place) deltas.set(place, -local);
  return deltas;
}

/** Live writer for a declared toll; the national and state stocks move together. */
export function applyPopulationToll(campaign: Campaign, effect: PopulationTollEffect): Campaign {
  if (!Number.isFinite(effect.deaths) || effect.deaths < 0) throw new Error("Population toll must be finite and nonnegative");
  const runtime = campaign.nations[effect.nation];
  if (!runtime) throw new Error("Population toll nation is absent");
  const home = effect.nation === campaign.founding.nation && Object.keys(campaign.states).length > 0;
  let states = campaign.states;
  let population: number;
  if (home) {
    const deltas = stateDeathDeltas(states, effect.deaths, effect.place);
    for (const [id, delta] of deltas) {
      if (delta === 0) continue;
      states = { ...states, [id]: { ...states[id]!, population: Math.max(0, states[id]!.population + delta) } };
    }
    population = Object.values(states).reduce((sum, state) => sum + state.population, 0);
  } else {
    population = Math.max(0, runtime.stats.demography.population - effect.deaths);
  }
  return {
    ...campaign,
    states,
    nations: { ...campaign.nations, [effect.nation]: { ...runtime, stats: { ...runtime.stats, demography: { ...runtime.stats.demography, population } } } },
  };
}

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
export const vitalsPhase: TurnPhase = (campaign) => {
  const effects: Effect[] = [];
  const playerNation = campaign.founding.nation;
  for (const id of (Object.keys(campaign.nations) as NationId[]).sort((a, b) => (a as string).localeCompare(b as string))) {
    const runtime = campaign.nations[id];
    if (!runtime) continue;
    const demography = runtime.stats.demography;
    const nextPopulation = populationIdentity(
      demography.population,
      demography.birthRate,
      demography.deathRate,
      demography.netMigration,
      WEEKLY_YEAR_FRACTION,
    );
    if (id !== playerNation || Object.keys(campaign.states).length === 0) {
      if (nextPopulation === demography.population) continue;
      effects.push({ kind: "nationStat", nation: id, setStats: { demography: { population: nextPopulation } } });
      continue;
    }

    const delta = nextPopulation - demography.population;
    const stateDeltas = distributedStateDeltas(campaign.states, delta);
    let summedPopulation = 0;
    for (const [stateId, stateDelta] of stateDeltas) {
      const state = campaign.states[stateId]!;
      const written = Math.max(0, state.population + stateDelta);
      summedPopulation += written;
      if (stateDelta === 0) continue;
      effects.push({
        kind: "state",
        state: stateId,
        deltas: { population: stateDelta },
        reason: "The week's births, deaths and migration land where the people are.",
      });
    }
    if (summedPopulation !== demography.population) {
      effects.push({ kind: "nationStat", nation: id, setStats: { demography: { population: summedPopulation } } });
    }
  }
  if (effects.length === 0) return [];
  const packet: EffectPacket = {
    source: "simulate",
    actor: "world",
    turn: campaign.turn,
    narration: { summary: "The country's population moves a week." },
    effects,
  };
  return [packet];
};

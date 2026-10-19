import { z } from "zod";
import { COHORT_AXES, cohortsOfAxis, type CohortAxisId } from "./cohort.js";

// Player overlay on the playable nation only. Not fifty legislatures on
// NPC nations. DC is required so electoral votes sum to 538.

export const STATE_IDS = [
  "AL",
  "AK",
  "AZ",
  "AR",
  "CA",
  "CO",
  "CT",
  "DE",
  "DC",
  "FL",
  "GA",
  "HI",
  "ID",
  "IL",
  "IN",
  "IA",
  "KS",
  "KY",
  "LA",
  "ME",
  "MD",
  "MA",
  "MI",
  "MN",
  "MS",
  "MO",
  "MT",
  "NE",
  "NV",
  "NH",
  "NJ",
  "NM",
  "NY",
  "NC",
  "ND",
  "OH",
  "OK",
  "OR",
  "PA",
  "RI",
  "SC",
  "SD",
  "TN",
  "TX",
  "UT",
  "VT",
  "VA",
  "WA",
  "WV",
  "WI",
  "WY",
] as const;

export const StateId = z.enum(STATE_IDS);
export type StateId = z.infer<typeof StateId>;

export const StateRegion = z.enum(["northeast", "midwest", "south", "west"]);
export type StateRegion = z.infer<typeof StateRegion>;

// The six ways a state's economy can be hit by a decision made in Washington.
// Deliberately not the closed 23 SectorIds: those are what an act names, these
// are what a state is. `sector-axis.ts` is the one place the two vocabularies
// meet.
export const STATE_ECONOMY_AXES = ["industrial", "agricultural", "energy", "tech", "services", "defense"] as const;

export const StateEconomyAxis = z.enum(STATE_ECONOMY_AXES);
export type StateEconomyAxis = z.infer<typeof StateEconomyAxis>;

// Sums to 1 ± 0.002, same tolerance as SectorMixEntry.mix; enforced by the
// dataset validator once the 51 rows are authored.
export const StateEconomy = z
  .object({
    industrial: z.number().min(0).max(1),
    agricultural: z.number().min(0).max(1),
    energy: z.number().min(0).max(1),
    tech: z.number().min(0).max(1),
    services: z.number().min(0).max(1),
    defense: z.number().min(0).max(1),
  })
  .strict();
export type StateEconomy = z.infer<typeof StateEconomy>;

// A closed set of shares for the cells of one cohort axis. Built off
// cohortsOfAxis rather than a hand-copied list, so the axis and its schema
// can never disagree about which cells belong to it.
const AxisShares = (axis: CohortAxisId) =>
  z
    .object(Object.fromEntries(cohortsOfAxis(axis).map((cohort) => [cohort, z.number().min(0).max(1)])))
    .strict();

// Twenty-nine shares, ten sum-to-1 axes: the original five (age, class,
// schooling, place, work) are authored by hand, and the race, sex, nativity,
// disability and veteran axes come from the Census-based demographics table. The population cross-cut beside
// StateEconomy: what a state's people are exposed to, not
// what its industries are. Every runtime cohort figure in the campaign
// derives from this table; there is no national cohort table to disagree
// with it.
export const StateCohortMix = z
  .object(Object.fromEntries(COHORT_AXES.map((axis) => [axis, AxisShares(axis)])) as { [A in CohortAxisId]: ReturnType<typeof AxisShares> })
  .strict();
export type StateCohortMix = z.infer<typeof StateCohortMix>;

// Three deviations from the national figure, never absolutes. A state's
// reading is `nation + deviation`, so the two levels cannot drift out of
// agreement and nothing has to reconcile 153 numbers against the country every
// turn. The population-weighted mean of each column is zero, which is what
// stops the anchors from quietly re-baselining the whole country; the dataset
// validator holds them to it.
export const StateVitalAnchor = z
  .object({
    unemployment: z.number().min(-0.08).max(0.12),
    crimeIndex: z.number().min(-0.25).max(0.35),
    costOfLiving: z.number().min(-0.25).max(0.6),
  })
  .strict();
export type StateVitalAnchor = z.infer<typeof StateVitalAnchor>;

export const StateCharacter = z
  .object({
    economy: StateEconomy,
    /** Share of the population in metro areas. Cross-cuts every axis. */
    urbanization: z.number().min(0).max(1),
    /**
     * How much of state income comes through federal outlays. The field an
     * omission reads: a state that lives on federal money notices money not
     * appropriated, and a state that does not, does not.
     */
    federalDependence: z.number().min(0).max(1),
    /**
     * The demographic cross-cut: five axes (age, class, schooling, place,
     * work) each summing to 1.0 ± 0.002, grounded in real state-by-state
     * distributions. Every runtime cohort figure in the campaign derives from
     * this table; there is no national cohort table to disagree with it.
     */
    cohorts: StateCohortMix,
    /**
     * Where this state rests relative to the country on unemployment, crime
     * and prices. The resting point a state's live reading reverts toward, and
     * the weight that decides which state a nationally-billed condition lands
     * in — never a second bill of its own.
     */
    vitalAnchor: StateVitalAnchor,
  })
  .strict();
export type StateCharacter = z.infer<typeof StateCharacter>;

const StateObject = z.object({
  id: StateId,
  name: z.string().min(1),
  fips: z.string().length(2),
  electoralVotes: z.number().int().positive(),
  houseSeats: z.number().int().nonnegative(),
  /**
   * How many people live here. The mass the `character` shares apply to.
   *
   * Until this existed the states carried distributions and no quantity, so
   * every consumer that needed to know how big an act was had to reach for a
   * proxy: `cohortGeography` weighted a state's contribution by the *political*
   * displacement an act caused there, which made California and Wyoming the
   * same size of act, and `electoralVotes` is off by design because every state
   * carries a floor of three.
   *
   * This is the level that owns the number. The nation's
   * `stats.demography.population` is the sum of these, written at assembly by
   * `applyStateMass` and checked by the validator — authoring it in both places
   * would only create a second copy that can disagree with the first, which is
   * the argument `bands` and `memberships` are already derived on.
   */
  population: z.number().positive(),
  /**
   * Gross state product, in USD millions — the same unit every money field in
   * the dataset uses, so a state's output and the nation's GDP are comparable
   * without a conversion nobody would remember to apply.
   *
   * Distinct from `population` because an act does not land on people and
   * output in the same proportion: a steel tariff reaches a share of the
   * country's population and a much larger share of the industry that makes
   * steel. `character.economy` says which industries; this says how much they
   * are worth.
   */
  grp: z.number().nonnegative(),
  // Dem ← → Rep. Authored Cook-PVI-ish / 2020 two-party; engine may drift.
  lean: z.number().min(-1).max(1),
  region: StateRegion,
  character: StateCharacter,
});

export const State = StateObject;
export type State = z.infer<typeof State>;

export const StateObjectSchema = StateObject;

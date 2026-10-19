// routeCohorts: fold a DomesticSignature through cohort exposure and the
// lean movement routeDomestic already computed, into CohortEffects. Lives
// beside demos.ts rather than inside it so demos never imports
// domestic-signature / effects (which import demos for applyCohort).
import { COHORT_AXIS, COHORT_IDS, IDEOLOGY_AXES, STATE_ECONOMY_AXES, STATE_IDS, type CohortId, type StateId } from "@admin/world";
import { COHORT_MOTIVATION, nationalShare, type CohortEffect, type CohortStrain } from "./demos.js";
import { MAGNITUDE_STEP, foldedAxes, type DomesticSignature } from "./domestic-signature.js";
import type { StateEffect } from "./effects.js";
import { channelAffinity } from "./cohort-channels.js";
import type { Campaign } from "./state.js";

/** Scales signature magnitude into cohort strain weight. */
export const COHORT_STRAIN_SCALE = 2;

/** A cohort barely touched emits nothing — same argument as the state floor. */
export const COHORT_STRAIN_FLOOR = 0.004;

/** Harm / favor decay for a routed act; matches `STRAIN_DECAY` in demos.ts. */
const ROUTED_STRAIN_DECAY = { [-1]: 0.06, [1]: 0.1 } as const;

const round3 = (value: number): number => Math.round(value * 1000) / 1000 + 0;
const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

/**
 * Place tilt for the urban signature term. Mirrors stateAffinity's
 * (urbanization − 0.5) × 2 at the three place cells; other axes contribute 0.
 */
export function placeTilt(cohort: CohortId): number {
  switch (cohort) {
    case "urban":
      return 1;
    case "suburban":
      return 0;
    case "rural":
      return -1;
    default:
      return 0;
  }
}

/**
 * Affinity of one cohort for a signature. Pure, no roll.
 *
 * The `values` term is the direct case `stateAffinity`'s `stateValues` has to
 * derive a proxy for: every cohort already carries a real, authored
 * `IdeologyVector` (`COHORT_MOTIVATION[cohort].beliefs`), differentiated by
 * design: rural and urban sit on opposite sides of `authLibertarian` before
 * this function ever reads either of them. Nothing here is invented; the
 * vector already sits next to `exposure`.
 */
export function cohortAffinity(cohort: CohortId, signature: DomesticSignature): number {
  const folded = foldedAxes(signature);
  const { exposure, programReliance, beliefs } = COHORT_MOTIVATION[cohort];
  let affinity = 0;
  for (const axis of STATE_ECONOMY_AXES) {
    affinity += exposure[axis] * folded[axis];
  }
  affinity += channelAffinity(cohort, signature);
  affinity += (signature.urban ?? 0) * placeTilt(cohort);
  affinity += (signature.federal ?? 0) * (programReliance - 0.5) * 2;
  if (signature.values) {
    for (const axis of IDEOLOGY_AXES) {
      affinity += (signature.values[axis] ?? 0) * beliefs[axis];
    }
  }
  return affinity;
}

/**
 * Where the act actually landed, and who lives there. Mass-weighted mean of
 * the cohort's state share, divided by the national share — so a uniform act
 * reads ~1, a steel act in industrial states reads above 1 for goods-producing
 * and below 1 for professional-technical.
 *
 * "Mass" is people times political displacement, and the population half is
 * what makes it a reading of whom an act moved. Displacement alone counts an
 * act that moved California and one that moved Wyoming by the same amount of
 * lean identically, which makes a national act's cohort reading a reading of
 * where the politics moved rather than of whom it moved. Weighting by the
 * product is what makes this
 * function's own doc comment true: a steel act reads above 1 for
 * goods-producing because most of the goods-producing population is in the
 * states it landed on, not merely because those states swung.
 *
 * Both terms are needed. Population alone would count a state the act never
 * touched; displacement alone counts a state nobody lives in. The product is
 * "how many people were reached, and how hard".
 */
export function cohortGeography(
  campaign: Campaign,
  cohort: CohortId,
  routed: readonly StateEffect[],
): number {
  const axis = COHORT_AXIS[cohort];
  let massTotal = 0;
  let weighted = 0;
  for (const effect of routed) {
    const lean = effect.deltas?.lean;
    if (lean === undefined) continue;
    const runtime = campaign.states[effect.state];
    // A state the campaign has no runtime for contributes nothing rather than
    // contributing at an assumed size: guessing a population here would put a
    // fabricated number into every cohort reading downstream of it.
    if (!runtime) continue;
    const mass = Math.abs(lean) * runtime.base.population;
    if (mass === 0) continue;
    massTotal += mass;
    const share =
      (runtime.base.character.cohorts[axis] as Readonly<Record<string, number>> | undefined)?.[cohort] ?? 0;
    weighted += mass * share;
  }
  if (massTotal === 0) return 1;
  const national = nationalShare(campaign, cohort);
  if (national <= 0) return 0;
  return weighted / massTotal / national;
}

const round2 = (value: number): number => Math.round(value * 100) / 100 + 0;

function cohortPeople(campaign: Campaign, cohort: CohortId, state: StateId): number {
  const runtime = campaign.states[state];
  if (!runtime) return 0;
  const shares = runtime.base.character.cohorts[COHORT_AXIS[cohort]] as Readonly<Record<string, number>> | undefined;
  return runtime.base.population * (shares?.[cohort] ?? 0);
}

/**
 * Where a routed act's strain on one cohort landed, state by state: the state's
 * share of the act's reach on the cohort (the same people-times-displacement
 * mass `cohortGeography` weighs) over its share of the cohort's people. The
 * people-weighted mean is one, so the strain's national weight is unchanged and
 * only its geography is kept. Undefined when the act moved no state.
 */
export function routedReach(campaign: Campaign, cohort: CohortId, routed: readonly StateEffect[]): Readonly<Partial<Record<StateId, number>>> | undefined {
  const moved = new Map<StateId, number>();
  for (const effect of routed) {
    const lean = effect.deltas?.lean;
    if (lean !== undefined && lean !== 0) moved.set(effect.state, (moved.get(effect.state) ?? 0) + Math.abs(lean));
  }
  const reached = [...moved].reduce((sum, [state, lean]) => sum + lean * cohortPeople(campaign, cohort, state), 0);
  if (reached <= 0) return undefined;
  const people = STATE_IDS.reduce((sum, state) => sum + cohortPeople(campaign, cohort, state), 0);
  const where = STATE_IDS.flatMap((state) => {
    const lean = moved.get(state);
    return lean === undefined ? [] : [[state, round2((lean * people) / reached)] as const];
  });
  return Object.fromEntries(where) as Partial<Record<StateId, number>>;
}

/**
 * Compile a domestic signature into one CohortEffect per cohort that clears
 * the strain floor. Iteration is over COHORT_IDS in declaration order so the
 * effect list is byte-identical run to run. `routed` is routeDomestic's own
 * output, passed in rather than recomputed.
 */
export function routeCohorts(
  campaign: Campaign,
  signature: DomesticSignature,
  routed: readonly StateEffect[],
): readonly CohortEffect[] {
  const effects: CohortEffect[] = [];
  const step = MAGNITUDE_STEP[signature.magnitude];
  for (const cohort of COHORT_IDS) {
    const affinity = cohortAffinity(cohort, signature);
    const geography = cohortGeography(campaign, cohort, routed);
    const { attention } = COHORT_MOTIVATION[cohort];
    const signed = step * COHORT_STRAIN_SCALE * affinity * geography * attention;
    const weight = round3(clamp01(Math.abs(signed)));
    if (weight < COHORT_STRAIN_FLOOR) continue;
    const valence: 1 | -1 = signed >= 0 ? 1 : -1;
    const where = routedReach(campaign, cohort, routed);
    effects.push({
      kind: "cohort",
      cohort,
      addStrain: {
        createdTurn: campaign.turn,
        cause: signature.signature,
        weight,
        valence,
        decayRate: ROUTED_STRAIN_DECAY[valence],
        reason: signature.reason,
        ...(where === undefined ? {} : { where }),
      },
      reason: signature.reason,
    });
  }
  return effects;
}

/**
 * A promise's reckoning, written to the cohorts it was made to.
 *
 * Routed acts find their cohorts through exposure and geography because an act
 * lands on places. A promise does not: it was made to named people, and they
 * are the ones who remember whether it was kept, wherever they live. So the
 * cohorts come from the promise itself, and each one's attention scales how
 * hard it lands, the same multiplier every routed strain carries.
 */
export function courtedStrains(courts: readonly CohortId[], memory: CohortStrain): readonly CohortEffect[] {
  return courts.flatMap((cohort): CohortEffect[] => {
    const weight = round3(clamp01(memory.weight * COHORT_MOTIVATION[cohort].attention));
    if (weight < COHORT_STRAIN_FLOOR) return [];
    return [{ kind: "cohort", cohort, addStrain: { ...memory, weight }, reason: memory.reason }];
  });
}

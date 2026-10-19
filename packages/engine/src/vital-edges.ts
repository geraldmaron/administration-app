import type { CohortId } from "@admin/world";
import type { CohortEffect } from "./demos.js";

// A national vital crossing a threshold stamps ONE
// CohortStrain on the edge, never a strain per turn while the level merely
// holds above it. Lives beside `macro.ts` rather than inside it, on the same
// precedent `route-cohorts.ts` sits beside `demos.ts`: the rate law and the
// cohort routing are different concerns.
//
// A deliberately narrow edge: the fuller design would
// geographically weight the strain by each state's live vital DEVIATION,
// and no state-deviation layer exists. Until one is built, every
// edge here strikes its axis nationally, weighted only by how exposed each
// cohort in that axis is, never by geography.
//
// Routes through no `DomesticSignature` and stamps no `GrievanceMark`, so it
// can never double-bill against a routed act's own strain or sum with a
// state's grievance: this is the one channel a vital reaches a cohort through.

const round3 = (value: number): number => Math.round(value * 1000) / 1000 + 0;

/** True only on the turn a reading first reaches `threshold`, never while it stays above. */
function crossedUpward(before: number, after: number, threshold: number): boolean {
  return before < threshold && after >= threshold;
}

type Edge = { readonly threshold: number; readonly weight: number };

/**
 * costOfLiving's two named edges, as a ratio to the price level the country's
 * own ordinary inflation would have reached by now (`normalPriceLevel`).
 *
 * Read against the index itself, the edges were a calendar: the United States'
 * ordinary three percent a year crossed the first inside two years and the
 * second inside four, so every term stamped both strains on the households
 * however prices behaved. What a household feels as a cost-of-living crisis is
 * prices running ahead of where they usually go.
 */
const COST_OF_LIVING_EDGES: readonly Edge[] = [
  { threshold: 1.05, weight: 0.12 },
  { threshold: 1.12, weight: 0.2 },
];

/**
 * How hard a cost-of-living edge lands on each "class" cohort. A household
 * living paycheck to paycheck feels a shelf getting dearer at once; an
 * affluent one barely notices — the same shape every real cost-of-living
 * story has.
 */
const COST_OF_LIVING_CLASS_WEIGHT: Readonly<Partial<Record<CohortId, number>>> = {
  "income-struggling": 1,
  "income-comfortable": 0.5,
  "income-affluent": 0.15,
};

/**
 * National only, for the reason in the header: a crime edge would be
 * defined on a state's deviation from its anchor, which this repo does not
 * carry yet. Picked to sit meaningfully above `crimeBaseline`'s ordinary
 * resting range rather than at a level an unremarkable country regularly
 * revisits.
 */
const CRIME_INDEX_EDGE: Edge = { threshold: 0.4, weight: 0.15 };

/** How hard a rising crime reading lands on each "place" cohort. */
const CRIME_PLACE_WEIGHT: Readonly<Partial<Record<CohortId, number>>> = {
  urban: 1,
  suburban: 0.5,
  rural: 0.35,
};

function edgeEffects(
  cohortWeights: Readonly<Partial<Record<CohortId, number>>>,
  edge: Edge,
  cause: string,
  reason: string,
  turn: number,
): CohortEffect[] {
  const effects: CohortEffect[] = [];
  for (const [cohort, exposure] of Object.entries(cohortWeights) as [CohortId, number][]) {
    const weight = round3(edge.weight * exposure);
    if (weight <= 0) continue;
    effects.push({
      kind: "cohort",
      cohort,
      addStrain: { createdTurn: turn, cause, weight, valence: -1, decayRate: 0.06, reason },
      reason,
    });
  }
  return effects;
}

/** Where the price index would stand on its ordinary path, before and after the week. */
export type NormalPrice = { readonly before: number; readonly after: number };

const AT_PARITY: NormalPrice = { before: 1, after: 1 };

/**
 * Evaluated once per turn against the nation's own before/after this turn's
 * settled rates — never re-read from `campaign`, so a reading in flight this
 * turn is compared against where it actually started.
 */
export function vitalCohortEdges(
  turn: number,
  before: { readonly costOfLiving: number; readonly crimeIndex: number },
  after: { readonly costOfLiving: number; readonly crimeIndex: number },
  normal: NormalPrice = AT_PARITY,
): readonly CohortEffect[] {
  const effects: CohortEffect[] = [];
  const ratioBefore = before.costOfLiving / Math.max(1e-9, normal.before);
  const ratioAfter = after.costOfLiving / Math.max(1e-9, normal.after);
  for (const edge of COST_OF_LIVING_EDGES) {
    if (!crossedUpward(ratioBefore, ratioAfter, edge.threshold)) continue;
    effects.push(
      ...edgeEffects(
        COST_OF_LIVING_CLASS_WEIGHT,
        edge,
        `cost-of-living-edge:${edge.threshold}`,
        `Prices ran ${Math.round((edge.threshold - 1) * 100)}% ahead of where they usually go.`,
        turn,
      ),
    );
  }
  if (crossedUpward(before.crimeIndex, after.crimeIndex, CRIME_INDEX_EDGE.threshold)) {
    effects.push(
      ...edgeEffects(
        CRIME_PLACE_WEIGHT,
        CRIME_INDEX_EDGE,
        "crime-index-edge",
        "Crime crossed a threshold the country can feel.",
        turn,
      ),
    );
  }
  return effects;
}

import { COHORT_IDS, IDEOLOGY_AXES, type CohortId } from "@admin/world";
import type { Campaign } from "./state.js";
import { COHORT_MOTIVATION, nationalCohortShares } from "./demos.js";
import { FORMAT_PARTISANSHIP, type PressOutlet } from "./press-outlets.js";

// Who reads a masthead.
//
// A desk's reach says how many people it gets to; this says which of them. It
// reads the country's cohorts and never writes to them: an audience is where a
// desk's reach lands, not a second road from the press to the public. The
// corps's standing stays the equal-weight mean of the desks for that reason —
// weighting it by reach would move every saved campaign's approval the moment it
// loaded — and the only thing reach and audience decide is what a desk's profile
// says about who is listening.

export type AudienceCohort = {
  readonly cohort: CohortId;
  readonly name: string;
  /**
   * How over-represented the cohort is in this desk's audience, as a multiple
   * of its share of the country: 1 reads it exactly as often as anyone does.
   */
  readonly index: number;
};

export type OutletAudience = {
  /** The desk's weekly reach, as authored. */
  readonly reach: number;
  /** The cohorts most over-represented in its audience, most over-represented first. */
  readonly leans: readonly AudienceCohort[];
};

/** How many over-represented cohorts a profile names. */
const NAMED = 3;

// The widest two belief vectors can sit apart on three axes of −1..1.
const WIDEST = 2 * Math.sqrt(IDEOLOGY_AXES.length);

/**
 * How strongly a cohort is drawn to a desk, 0..1: the closer their beliefs, the
 * stronger, sharpened by the format's partisanship, since the audience of a
 * partisan channel sorts by politics far harder than a newspaper's does.
 */
function affinity(cohort: CohortId, outlet: PressOutlet): number {
  const beliefs = COHORT_MOTIVATION[cohort].beliefs;
  const distance = Math.sqrt(IDEOLOGY_AXES.reduce((sum, axis) => sum + (beliefs[axis] - outlet.beliefs[axis]) ** 2, 0));
  return Math.max(0, 1 - distance / WIDEST) ** FORMAT_PARTISANSHIP[outlet.format];
}

/**
 * The desk's audience, read off the country's cohort shares. The index is how
 * strongly a cohort is drawn to the desk over how strongly the country as a
 * whole is, weighting every cohort by its share of the country, so a large
 * cohort and a small one compare on one scale.
 */
export function outletAudience(campaign: Campaign, outlet: PressOutlet): OutletAudience {
  const shares = nationalCohortShares(campaign);
  const draw = Object.fromEntries(COHORT_IDS.map((cohort) => [cohort, affinity(cohort, outlet)])) as Record<CohortId, number>;
  const mean = COHORT_IDS.reduce((sum, cohort) => sum + draw[cohort] * shares[cohort], 0) / Math.max(1e-9, COHORT_IDS.reduce((sum, cohort) => sum + shares[cohort], 0));
  const leans = COHORT_IDS.filter((cohort) => shares[cohort] > 0)
    .map((cohort) => ({
      cohort,
      name: COHORT_MOTIVATION[cohort].name,
      index: Math.round((mean > 0 ? draw[cohort] / mean : 1) * 100) / 100,
    }))
    .sort((a, b) => b.index - a.index || a.cohort.localeCompare(b.cohort))
    .slice(0, NAMED);
  return { reach: outlet.reach, leans };
}

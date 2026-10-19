import { COHORT_IDS, IDEOLOGY_AXES, platformPlanks, type CohortId, type IdeologyAxis } from "@admin/world";
import type { AlignmentVector, Campaign } from "./state.js";
import type { AdministrationParty } from "./state-legislature.js";
import { usTicket } from "./party.js";
import { COHORT_MOTIVATION } from "./demos.js";

// Who the President is, in the space the desks think in.
//
// Every desk already reads what an administration does (`press-beliefs.ts`).
// What none of them read was who took office: a cable channel on the right met
// a Democrat and a Republican in the same frame of mind, and the placement at
// the founding was the only place the party reached the press at all, where it
// drifted out within a season. A newsroom's view of a President's party is not
// a first impression. It is a standing term, read here once and by every desk.

/**
 * How much of the President's reading the platform carries beside the party's.
 * Half: a platform is chosen inside a party, so it bends the party's reading
 * toward the voters it courts rather than replacing it.
 */
export const PLATFORM_PLACEMENT_WEIGHT = 0.5;

type AxisTotals = Readonly<Record<IdeologyAxis, number>>;

function meanBeliefs(cohorts: readonly CohortId[]): AxisTotals {
  const count = Math.max(1, cohorts.length);
  return Object.fromEntries(
    IDEOLOGY_AXES.map((axis) => [
      axis,
      cohorts.reduce((total, cohort) => total + COHORT_MOTIVATION[cohort].beliefs[axis], 0) / count,
    ]),
  ) as AxisTotals;
}

const NATIONAL_MEAN = meanBeliefs(COHORT_IDS);

/**
 * Where a platform leans, as the distance between the voters its planks court
 * and the country as a whole. A plank courts cohorts, not an ideology, so the
 * lean is read off the people it is written for.
 */
function platformLean(platform: readonly string[]): AxisTotals | undefined {
  const planks = platformPlanks.filter((plank) => platform.includes(plank.id));
  if (planks.length === 0) return undefined;
  const leans = planks.map((plank) => meanBeliefs(plank.courts));
  return Object.fromEntries(
    IDEOLOGY_AXES.map((axis) => [
      axis,
      leans.reduce((total, lean) => total + lean[axis], 0) / leans.length - NATIONAL_MEAN[axis],
    ]),
  ) as AxisTotals;
}

const clamp11 = (value: number) => Math.max(-1, Math.min(1, value));
const placements = new Map<string, Partial<AlignmentVector>>();

/** The party's beliefs, bent toward the voters the platform courts. */
export function placementFor(party: AdministrationParty, platform: readonly string[] = []): Partial<AlignmentVector> {
  const key = `${party}|${[...platform].sort().join(",")}`;
  const cached = placements.get(key);
  if (cached) return cached;
  const beliefs = usTicket(party).beliefs;
  const lean = platformLean(platform);
  const placement = Object.fromEntries(
    IDEOLOGY_AXES.map((axis) => [axis, clamp11(beliefs[axis] + (lean ? lean[axis] * PLATFORM_PLACEMENT_WEIGHT : 0))]),
  ) as Partial<AlignmentVector>;
  placements.set(key, placement);
  return placement;
}

/** The President this campaign seated, placed. */
export function placementOf(campaign: Campaign): Partial<AlignmentVector> {
  return placementFor(campaign.congress.administrationParty, campaign.founding.platform ?? []);
}

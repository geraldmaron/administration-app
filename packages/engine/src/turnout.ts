import { COHORT_IDS, type CohortId } from "@admin/world";
import type { Campaign } from "./state.js";
import { cohortBlocShares, blocTurnoutShift } from "./cohort-blocs.js";
import { COHORT_MOTIVATION, TURNOUT_CEILING, TURNOUT_FLOOR, centeredStrain, nationalCohortShares, selectCohorts } from "./demos.js";
import { BLOC_HABIT, BLOCS, ballotOf, type Bloc } from "./electorate.js";
import { selectElectorate } from "./opinion.js";

// Who shows up.
//
// A bloc that stops voting has not changed its mind, and one that turns out in
// anger has not been persuaded of anything. Preference reaches the count
// through each bloc's approval; this is the other half of an election, and the
// one a record changes most: hurt the people who put you there and your own
// blocs stay home where they live, hurt the people who never would have and
// the opposition's blocs come out.
//
// Turnout acts as composition, at full size: the ballot weights each bloc's
// vote by how many of it turn out, so a displaced bloc costs exactly the votes
// it would have cast. The driver the count shows is that ballot against the
// same ballot at habitual turnout, so the habit (identifiers vote more than
// leaners, leaners far more than independents who lean neither) is charged
// once, in the share itself, and only the part this administration caused is
// reported as turnout.

const round3 = (value: number): number => Math.round(value * 1000) / 1000 + 0;
const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

/** How much unforgiven harm each cohort carries relative to its axis, 0..1. */
export function cohortHarm(campaign: Campaign): Readonly<Record<CohortId, number>> {
  return Object.fromEntries(COHORT_IDS.map((cohort) => [cohort, clamp(-centeredStrain(campaign, cohort), 0, 1)])) as Record<CohortId, number>;
}

export type BlocTurnout = {
  readonly bloc: Bloc;
  readonly habit: number;
  readonly shift: number;
  readonly turnout: number;
};

/** Each bloc's turnout this week: its habit, moved by what was done to the cohorts its members belong to. */
export function selectBlocTurnout(campaign: Campaign): readonly BlocTurnout[] {
  const { partisanship } = selectElectorate(campaign);
  const shift = blocTurnoutShift(campaign, cohortHarm(campaign), nationalCohortShares(campaign), partisanship);
  return BLOCS.map((bloc) => ({ bloc, habit: BLOC_HABIT[bloc], shift: shift[bloc], turnout: BLOC_HABIT[bloc] + shift[bloc] }));
}

function turnoutRecord(rows: readonly BlocTurnout[], pick: (row: BlocTurnout) => number): Readonly<Record<Bloc, number>> {
  return Object.fromEntries(rows.map((row) => [row.bloc, pick(row)])) as Record<Bloc, number>;
}

/** The ballot at habitual turnout and at this week's, from one reading of the blocs. */
export function selectBallot(campaign: Campaign): { readonly habitual: number; readonly actual: number } {
  const reading = selectElectorate(campaign);
  const rows = selectBlocTurnout(campaign);
  const at = (turnout: Readonly<Record<Bloc, number>>) => ballotOf(reading.shares, reading.approvals, reading.partisanship, turnout);
  return { habitual: at(turnoutRecord(rows, (row) => row.habit)), actual: at(turnoutRecord(rows, (row) => row.turnout)) };
}

/** What differential participation does to the count, in share of the vote. */
export function turnoutShift(campaign: Campaign): number {
  const { habitual, actual } = selectBallot(campaign);
  return round3(actual - habitual);
}

export type CohortTurnout = {
  readonly cohort: CohortId;
  readonly name: string;
  readonly share: number;
  readonly support: number;
  /** The share of it that turns out when nothing has happened to it. */
  readonly habit: number;
  /** The share of it that would turn out this week. */
  readonly turnout: number;
};

/**
 * Every cell's turnout, in the order `selectCohorts` gives them: its published
 * habit, moved by the displacement of the blocs it is made of. A reading of the
 * blocs through the cohort, so it cannot disagree with the ballot.
 */
export function selectCohortTurnout(campaign: Campaign): readonly CohortTurnout[] {
  const shift = turnoutRecord(selectBlocTurnout(campaign), (row) => row.shift);
  return selectCohorts(campaign).map((standing) => {
    const habit = COHORT_MOTIVATION[standing.cohort].baseTurnout;
    const mix = cohortBlocShares(campaign, standing.cohort);
    const moved = BLOCS.reduce((sum, bloc) => sum + mix[bloc] * shift[bloc], 0);
    return {
      cohort: standing.cohort,
      name: standing.name,
      share: standing.share,
      support: standing.support,
      habit,
      turnout: round3(clamp(habit + moved, TURNOUT_FLOOR, TURNOUT_CEILING)),
    };
  });
}

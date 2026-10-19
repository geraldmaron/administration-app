import { COHORT_AXIS, STATE_IDS, cohortsOfAxis, type CohortAxisId, type CohortId, type StateId } from "@admin/world";
import { COHORT_MOTIVATION, cohortSupport, stateApprovals, stateCohortOpinion, type Campaign } from "@admin/engine";
import { readingBand, type Stance } from "../reading";
import { COHORT_AXIS_LABELS } from "../polling/crosstabs";
import { stateDemographics, type DemographicAxis } from "./electorate";

// A state's people as its file reads them: size against the other states, the
// composition on every axis, the groups that set it apart, and how those groups
// in this state rate the President. The state figures are the engine's
// estimate (`stateCohortOpinion`): each state's approval split across its
// groups by how far each group's politics follow its state, raked so the
// groups add up to the state and the states to each group's national figure.
// It is a model reading, not a poll, and the screen says so in one line.

/** The one line a screen shows under a state-by-group figure, saying what it is. */
export const STATE_GROUP_METHOD =
  "Estimated, not polled, by splitting each state's approval among its groups based on how closely each group voted like its state in the 2020 and 2024 Cooperative Election Study (a large voter survey), so the groups add up to the state and the states add up to each group's national figure.";

export type StateSize = {
  readonly population: number;
  /** 1 is the most populous. */
  readonly rank: number;
  readonly of: number;
  /** The most populous state's people, for drawing this one against it. */
  readonly largest: number;
  /** Share of the people the dataset carries across all states, 0..1. */
  readonly share: number;
};

export type Standout = {
  readonly cohort: CohortId;
  readonly axis: CohortAxisId;
  readonly axisName: string;
  readonly name: string;
  readonly state: number;
  readonly nation: number;
  readonly gap: number;
};

export type GroupRating = {
  readonly cohort: CohortId;
  readonly axis: CohortAxisId;
  readonly axisName: string;
  readonly name: string;
  /** The group's share of this state's people. */
  readonly state: number;
  readonly nation: number;
  /** The group's support in this state, estimated. */
  readonly support: number;
  /** The group's support across the country, the engine's own figure. */
  readonly national: number;
  /** State figure less national figure, in share. */
  readonly gap: number;
  readonly figure: string;
  readonly word: string;
  readonly stance: Stance;
};

export type StatePeople = {
  readonly size: StateSize;
  readonly axes: readonly DemographicAxis[];
  readonly standouts: readonly Standout[];
  readonly ratings: readonly GroupRating[];
};

/** Below this a gap is noise beside the source's own rounding. */
export const STANDOUT_FLOOR = 0.02;

/** A group that is nearly everyone (non-veterans, the U.S.-born) says nothing about who lives here. */
const NEAR_UNIVERSAL = 0.85;

function sizeOf(campaign: Campaign, id: StateId): StateSize | undefined {
  const rows = STATE_IDS.flatMap((state) => {
    const runtime = campaign.states[state];
    return runtime ? [{ state, population: runtime.population }] : [];
  }).sort((a, b) => b.population - a.population);
  const index = rows.findIndex((row) => row.state === id);
  const row = rows[index];
  if (!row) return undefined;
  const total = rows.reduce((sum, entry) => sum + entry.population, 0);
  return { population: row.population, rank: index + 1, of: rows.length, largest: rows[0]?.population ?? row.population, share: total > 0 ? row.population / total : 0 };
}

/** The most distinctive groups: the largest gaps, one per axis, sex left out because its two cells mirror each other. */
export function standoutsOf(axes: readonly DemographicAxis[], count: number): readonly Standout[] {
  return axes
    .filter((axis) => axis.axis !== "sex")
    .flatMap((axis) => {
      const best = [...axis.cells].sort((a, b) => Math.abs(b.gap) - Math.abs(a.gap))[0];
      return best && Math.abs(best.gap) >= STANDOUT_FLOOR ? [{ cohort: best.cohort, axis: axis.axis, axisName: axis.name, name: best.name, state: best.state, nation: best.nation, gap: best.gap }] : [];
    })
    .sort((a, b) => Math.abs(b.gap) - Math.abs(a.gap))
    .slice(0, count);
}

const percent = (value: number): string => `${Math.round(value * 100)}%`;

function ratingOf(campaign: Campaign, id: StateId, cohort: CohortId): Pick<GroupRating, "support" | "national" | "gap" | "figure" | "word" | "stance"> | undefined {
  const support = stateCohortOpinion(campaign).axes[COHORT_AXIS[cohort]].support[id]?.[cohort];
  if (support === undefined) return undefined;
  const national = cohortSupport(campaign, cohort);
  const band = readingBand("standing", support);
  return { support, national, gap: support - national, figure: percent(support), word: band?.word ?? "", stance: band?.stance ?? "neutral" };
}

/** An exact community, including those not selected for the summary's top-six list. */
export function stateGroupRating(campaign: Campaign, id: StateId, cohort: CohortId): GroupRating | undefined {
  const axis = stateDemographics(campaign, id)?.find((entry) => entry.axis === COHORT_AXIS[cohort]);
  const cell = axis?.cells.find((entry) => entry.cohort === cohort);
  const rating = ratingOf(campaign, id, cohort);
  return axis && cell && rating ? { cohort, axis: axis.axis, axisName: axis.name, name: cell.name, state: cell.state, nation: cell.nation, ...rating } : undefined;
}

function ratingsOf(campaign: Campaign, id: StateId, axes: readonly DemographicAxis[]): readonly GroupRating[] {
  const cells = axes
    .filter((axis) => axis.axis !== "sex")
    .flatMap((axis) => axis.cells.filter((cell) => cell.state >= 0.05 && cell.state <= NEAR_UNIVERSAL).map((cell) => ({ axis, cell })));
  const over = [...cells].sort((a, b) => b.cell.gap - a.cell.gap).slice(0, 4);
  const taken = new Set(over.map((entry) => entry.cell.cohort));
  const largest = [...cells].sort((a, b) => b.cell.state - a.cell.state).filter((entry) => !taken.has(entry.cell.cohort)).slice(0, 2);
  return [...over, ...largest].flatMap(({ axis, cell }) => {
    const rating = ratingOf(campaign, id, cell.cohort);
    return rating ? [{ cohort: cell.cohort, axis: axis.axis, axisName: axis.name, name: cell.name, state: cell.state, nation: cell.nation, ...rating }] : [];
  });
}

/** Undefined for a state the campaign does not carry or whose dataset has no cohort mix. */
export function statePeople(campaign: Campaign, id: StateId): StatePeople | undefined {
  const axes = stateDemographics(campaign, id);
  const size = sizeOf(campaign, id);
  if (!axes || !size) return undefined;
  return { size, axes, standouts: standoutsOf(axes, 4), ratings: ratingsOf(campaign, id, axes) };
}

/** One column of the states-by-groups grid. */
export type GridGroup = {
  readonly cohort: CohortId;
  readonly name: string;
  /** The group's national figure, the engine's own. */
  readonly national: number;
};

/** One state's row: its approval and every group of the axis, in column order. */
export type GridRow = {
  readonly state: StateId;
  readonly name: string;
  readonly approval: number;
  readonly cells: readonly { readonly cohort: CohortId; readonly support: number; readonly share: number }[];
};

export type StateGroupGrid = {
  readonly axis: CohortAxisId;
  readonly axisName: string;
  readonly groups: readonly GridGroup[];
  /** In `STATE_IDS` order; a screen sorts them. */
  readonly rows: readonly GridRow[];
};

/** Every state against every group of one axis, for a heatmap. */
export function stateGroupGrid(campaign: Campaign, axis: CohortAxisId): StateGroupGrid {
  const fit = stateCohortOpinion(campaign).axes[axis];
  const approvals = stateApprovals(campaign);
  const groups = cohortsOfAxis(axis).map((cohort) => ({ cohort, name: COHORT_MOTIVATION[cohort].name, national: cohortSupport(campaign, cohort) }));
  const rows = STATE_IDS.flatMap((state) => {
    const runtime = campaign.states[state];
    const support = fit.support[state];
    const approval = approvals[state];
    if (!runtime || !support || approval === undefined) return [];
    const shares = runtime.base.character.cohorts[axis] as Readonly<Record<string, number>>;
    return [{ state, name: runtime.base.name, approval, cells: groups.map(({ cohort }) => ({ cohort, support: support[cohort] ?? 0, share: shares[cohort] ?? 0 })) }];
  });
  return { axis, axisName: COHORT_AXIS_LABELS[axis], groups, rows };
}

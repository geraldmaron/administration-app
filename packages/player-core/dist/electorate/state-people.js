import { COHORT_AXIS, STATE_IDS, cohortsOfAxis } from "@admin/world";
import { COHORT_MOTIVATION, cohortSupport, stateApprovals, stateCohortOpinion } from "@admin/engine";
import { readingBand } from "../reading";
import { COHORT_AXIS_LABELS } from "../polling/crosstabs";
import { stateDemographics } from "./electorate";
// A state's people as its file reads them: size against the other states, the
// composition on every axis, the groups that set it apart, and how those groups
// in this state rate the President. The state figures are the engine's
// estimate (`stateCohortOpinion`): each state's approval split across its
// groups by how far each group's politics follow its state, raked so the
// groups add up to the state and the states to each group's national figure.
// It is a model reading, not a poll, and the screen says so in one line.
/** The one line a screen shows under a state-by-group figure, saying what it is. */
export const STATE_GROUP_METHOD = "Estimated, not polled, by splitting each state's approval among its groups based on how closely each group voted like its state in the 2020 and 2024 Cooperative Election Study (a large voter survey), so the groups add up to the state and the states add up to each group's national figure.";
/** Below this a gap is noise beside the source's own rounding. */
export const STANDOUT_FLOOR = 0.02;
/** A group that is nearly everyone (non-veterans, the U.S.-born) says nothing about who lives here. */
const NEAR_UNIVERSAL = 0.85;
function sizeOf(campaign, id) {
    const rows = STATE_IDS.flatMap((state) => {
        const runtime = campaign.states[state];
        return runtime ? [{ state, population: runtime.population }] : [];
    }).sort((a, b) => b.population - a.population);
    const index = rows.findIndex((row) => row.state === id);
    const row = rows[index];
    if (!row)
        return undefined;
    const total = rows.reduce((sum, entry) => sum + entry.population, 0);
    return { population: row.population, rank: index + 1, of: rows.length, largest: rows[0]?.population ?? row.population, share: total > 0 ? row.population / total : 0 };
}
/** The most distinctive groups: the largest gaps, one per axis, sex left out because its two cells mirror each other. */
export function standoutsOf(axes, count) {
    return axes
        .filter((axis) => axis.axis !== "sex")
        .flatMap((axis) => {
        const best = [...axis.cells].sort((a, b) => Math.abs(b.gap) - Math.abs(a.gap))[0];
        return best && Math.abs(best.gap) >= STANDOUT_FLOOR ? [{ cohort: best.cohort, axis: axis.axis, axisName: axis.name, name: best.name, state: best.state, nation: best.nation, gap: best.gap }] : [];
    })
        .sort((a, b) => Math.abs(b.gap) - Math.abs(a.gap))
        .slice(0, count);
}
const percent = (value) => `${Math.round(value * 100)}%`;
function ratingOf(campaign, id, cohort) {
    const support = stateCohortOpinion(campaign).axes[COHORT_AXIS[cohort]].support[id]?.[cohort];
    if (support === undefined)
        return undefined;
    const national = cohortSupport(campaign, cohort);
    const band = readingBand("standing", support);
    return { support, national, gap: support - national, figure: percent(support), word: band?.word ?? "", stance: band?.stance ?? "neutral" };
}
/** An exact community, including those not selected for the summary's top-six list. */
export function stateGroupRating(campaign, id, cohort) {
    const axis = stateDemographics(campaign, id)?.find((entry) => entry.axis === COHORT_AXIS[cohort]);
    const cell = axis?.cells.find((entry) => entry.cohort === cohort);
    const rating = ratingOf(campaign, id, cohort);
    return axis && cell && rating ? { cohort, axis: axis.axis, axisName: axis.name, name: cell.name, state: cell.state, nation: cell.nation, ...rating } : undefined;
}
function ratingsOf(campaign, id, axes) {
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
export function statePeople(campaign, id) {
    const axes = stateDemographics(campaign, id);
    const size = sizeOf(campaign, id);
    if (!axes || !size)
        return undefined;
    return { size, axes, standouts: standoutsOf(axes, 4), ratings: ratingsOf(campaign, id, axes) };
}
/** Every state against every group of one axis, for a heatmap. */
export function stateGroupGrid(campaign, axis) {
    const fit = stateCohortOpinion(campaign).axes[axis];
    const approvals = stateApprovals(campaign);
    const groups = cohortsOfAxis(axis).map((cohort) => ({ cohort, name: COHORT_MOTIVATION[cohort].name, national: cohortSupport(campaign, cohort) }));
    const rows = STATE_IDS.flatMap((state) => {
        const runtime = campaign.states[state];
        const support = fit.support[state];
        const approval = approvals[state];
        if (!runtime || !support || approval === undefined)
            return [];
        const shares = runtime.base.character.cohorts[axis];
        return [{ state, name: runtime.base.name, approval, cells: groups.map(({ cohort }) => ({ cohort, support: support[cohort] ?? 0, share: shares[cohort] ?? 0 })) }];
    });
    return { axis, axisName: COHORT_AXIS_LABELS[axis], groups, rows };
}

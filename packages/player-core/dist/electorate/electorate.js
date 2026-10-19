import { COHORT_AXES, cohortsOfAxis } from "@admin/world";
import { COHORT_MOTIVATION, nationalCohortShares, selectCohorts, selectMetricSeries, selectOpinionCauses, selectOpinionReading, heaviestCause, OPINION_CAUSE_LABELS, OPINION_DRIVER_MEANINGS, stateApprovals, } from "@admin/engine";
import { STATE_IDS } from "@admin/world";
import { blocTopline } from "./blocs";
import { OPINION_DRIVER_LABELS } from "../format/figures";
import { COHORT_AXIS_LABELS, crosstabs, rankedProblems } from "../polling/crosstabs";
import { opinionTrends } from "../polling/opinion-trends";
import { pollReading } from "../polling/polls";
import { isInheritedRow } from "../record/inheritance";
import { readingBand } from "../reading";
// The electorate, read as a pollster's book: the topline, the six judgments
// behind it, every cut of the country, what each group remembers, the problem
// ranking and the map. Every figure is an engine selector read through; the
// only arithmetic here is a difference between two figures the engine already
// published, and nothing is a series the campaign does not keep.
const percent = (value) => `${Math.round(value * 100)}%`;
function toplineView(campaign) {
    const causes = selectOpinionCauses(campaign);
    const judgments = selectOpinionReading(campaign).map((reading) => {
        const band = readingBand("standing", reading.value);
        const top = causes.find((entry) => entry.driver === reading.driver);
        const cause = top ? heaviestCause(top) : undefined;
        return {
            driver: reading.driver,
            label: OPINION_DRIVER_LABELS[reading.driver],
            meaning: OPINION_DRIVER_MEANINGS[reading.driver],
            value: reading.value,
            figure: percent(reading.value),
            stance: band?.stance ?? "neutral",
            word: band?.word ?? "",
            weight: reading.weight,
            salient: reading.salient,
            ...(cause === undefined ? {} : { cause: OPINION_CAUSE_LABELS[cause.key], causeDetail: cause.detail }),
        };
    });
    const series = selectMetricSeries(campaign, "approval");
    const history = campaign.player.metricHistory;
    const inherited = history.filter((_, index) => isInheritedRow(campaign, index)).length;
    const first = series[inherited];
    const last = series[series.length - 1];
    return {
        poll: pollReading(campaign),
        series,
        inherited,
        ...(first !== undefined && last !== undefined && series.length - inherited > 1 ? { sinceOath: last - first } : {}),
        judgments,
    };
}
/** Groups that remember something of this administration, the most aggrieved first. */
function cohortMemory(campaign) {
    return selectCohorts(campaign)
        .flatMap((standing) => standing.reading === undefined
        ? []
        : [
            {
                cohort: standing.cohort,
                axis: standing.axis,
                axisLabel: COHORT_AXIS_LABELS[standing.axis],
                name: standing.name,
                share: standing.share,
                strain: standing.strain,
                displacement: standing.displacement,
                reading: standing.reading,
            },
        ])
        .sort((a, b) => a.displacement - b.displacement || a.cohort.localeCompare(b.cohort));
}
function stateCells(campaign) {
    const approvals = stateApprovals(campaign);
    const samples = campaign.stateApprovalHistory ?? [];
    return STATE_IDS.flatMap((id) => {
        const approval = approvals[id];
        const runtime = campaign.states[id];
        if (approval === undefined || !runtime)
            return [];
        const band = readingBand("standing", approval);
        const history = samples.flatMap((sample) => {
            const value = sample.approval[id];
            return value === undefined ? [] : [value];
        });
        const earlier = history[history.length - 1];
        return [
            {
                state: id,
                name: runtime.base.name,
                approval,
                figure: percent(approval),
                stance: band?.stance ?? "neutral",
                word: band?.word ?? "",
                ...(earlier === undefined ? {} : { change: approval - earlier }),
                history,
            },
        ];
    });
}
function cutsAverage(cuts) {
    const means = cuts.flatMap((cut) => {
        const total = cut.rows.reduce((sum, row) => sum + (row.share ?? 0), 0);
        return total > 0 ? [cut.rows.reduce((sum, row) => sum + row.support * (row.share ?? 0), 0) / total] : [];
    });
    return means.length === 0 ? 0 : means.reduce((sum, mean) => sum + mean, 0) / means.length;
}
/** The whole book on the electorate this week. */
export function electorateView(campaign) {
    const cuts = crosstabs(campaign);
    return {
        topline: toplineView(campaign),
        problems: rankedProblems(campaign),
        cuts,
        cutsAverage: cutsAverage(cuts),
        blocs: blocTopline(campaign),
        memory: cohortMemory(campaign),
        states: stateCells(campaign),
        trends: opinionTrends(campaign),
    };
}
/**
 * A state's composition on each of the ten axes against the country's
 * population-weighted figure. Undefined for a state the campaign does not carry
 * or whose dataset has no cohort mix.
 */
export function stateDemographics(campaign, id) {
    const mix = campaign.states[id]?.base.character.cohorts;
    if (!mix)
        return undefined;
    const nation = nationalCohortShares(campaign);
    return COHORT_AXES.map((axis) => {
        const shares = mix[axis];
        return {
            axis,
            name: COHORT_AXIS_LABELS[axis],
            cells: cohortsOfAxis(axis).map((cohort) => {
                const state = shares[cohort] ?? 0;
                return { cohort, name: COHORT_MOTIVATION[cohort].name, state, nation: nation[cohort], gap: state - nation[cohort] };
            }),
        };
    });
}

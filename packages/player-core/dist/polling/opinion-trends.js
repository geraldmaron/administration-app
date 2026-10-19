import { COHORT_AXES, cohortsOfAxis } from "@admin/world";
import { COHORT_MOTIVATION, DISPLAY_BLOCS, OPINION_DRIVERS, opinionCourse, } from "@admin/engine";
import { OPINION_DRIVER_LABELS } from "../format/figures";
import { BLOC_NAMES } from "../electorate/bloc-names";
import { crosstabs } from "./crosstabs";
import { recordStart, trendOf } from "./record-trend";
function seriesOf(course, id, name, read) {
    const points = course.flatMap((sample) => {
        const value = read(sample);
        return value === undefined ? [] : [{ turn: sample.turn, value }];
    });
    return { id, name, ...trendOf(points) };
}
function cohortTrendsOf(course) {
    return COHORT_AXES.flatMap((axis) => cohortsOfAxis(axis).map((cohort) => ({
        axis,
        ...seriesOf(course, cohort, COHORT_MOTIVATION[cohort].name, (sample) => sample.cohorts[cohort]),
    })));
}
/** Every observed series of the public, and where the record starts. */
export function opinionTrends(campaign) {
    const course = opinionCourse(campaign);
    const judgment = (driver) => seriesOf(course, driver, OPINION_DRIVER_LABELS[driver], (sample) => sample.judgments[driver]);
    return {
        start: recordStart(campaign, campaign.opinionRecord?.since),
        judgments: OPINION_DRIVERS.map(judgment),
        polarization: seriesOf(course, "polarization", "Polarization", (sample) => sample.polarization),
        cohorts: cohortTrendsOf(course),
        blocs: DISPLAY_BLOCS.map((bloc) => seriesOf(course, bloc, BLOC_NAMES[bloc], (sample) => sample.blocs[bloc])),
    };
}
/**
 * The crosstab cuts as courses, in the order and grouping `crosstabs` draws
 * them this week, so a row and its course are found under the same id.
 */
export function crosstabTrends(campaign) {
    const trends = opinionTrends(campaign);
    const byId = new Map(trends.cohorts.map((series) => [series.id, series]));
    return crosstabs(campaign).map((group) => ({
        id: group.id,
        name: group.name,
        rows: group.rows.flatMap((row) => {
            const series = byId.get(row.id);
            return series ? [series] : [];
        }),
    }));
}

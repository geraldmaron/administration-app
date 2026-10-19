import { COHORT_AXES } from "@admin/world";
import { OPINION_CAUSE_LABELS, OPINION_DRIVER_MEANINGS, heaviestCause, selectCohorts, selectOpinionCauses, selectOpinionReading, } from "@admin/engine";
import { OPINION_DRIVER_LABELS } from "../format/figures";
import { readingBand } from "../reading";
const percent = (value) => `${Math.round(value * 100)}%`;
function rowFor(input) {
    const band = readingBand("standing", input.support);
    return {
        id: input.id,
        name: input.name,
        support: input.support,
        figure: percent(input.support),
        word: band?.word ?? "",
        stance: band?.stance ?? "neutral",
        ...(input.share === undefined ? {} : { share: input.share }),
        ...(input.reading === undefined ? {} : { reading: input.reading }),
    };
}
/** What each of the ten cuts is called above its strip. */
export const COHORT_AXIS_LABELS = {
    age: "By age",
    class: "By household",
    schooling: "By schooling",
    place: "By where they live",
    work: "By what they do",
    race: "By race and ethnicity",
    sex: "By sex",
    nativity: "By where they were born",
    disability: "By disability",
    veteran: "By military service",
};
/**
 * The twenty-nine cells, in ten strips.
 *
 * Declaration order inside a strip rather than sorted, so a strip a player has
 * learned to read stays where it was: a list that reordered itself as support
 * moved would make every reading a search.
 */
function cohortCrosstabs(campaign) {
    const standings = selectCohorts(campaign);
    return COHORT_AXES.map((axis) => ({
        id: axis,
        name: COHORT_AXIS_LABELS[axis],
        rows: standings
            .filter((standing) => standing.axis === axis)
            .map((standing) => rowFor({
            id: standing.cohort,
            name: standing.name,
            support: standing.support,
            share: standing.share,
            ...(standing.reading === undefined ? {} : { reading: standing.reading }),
        })),
    }));
}
/** Every cut of the country, one strip per axis. */
export function crosstabs(campaign) {
    return cohortCrosstabs(campaign);
}
function problemOf(campaign, entry, total) {
    const share = entry.shortfall / total;
    // The problem is named with what is doing it. A judgment drawn with a level
    // and no cause sends the player after the level.
    const causes = selectOpinionCauses(campaign).find((reading) => reading.driver === entry.reading.driver);
    const cause = causes ? heaviestCause(causes) : undefined;
    return {
        driver: entry.reading.driver,
        label: OPINION_DRIVER_LABELS[entry.reading.driver],
        meaning: OPINION_DRIVER_MEANINGS[entry.reading.driver],
        share,
        figure: percent(share),
        salient: entry.reading.salient,
        ...(cause === undefined ? {} : { cause: OPINION_CAUSE_LABELS[cause.key], causeDetail: cause.detail }),
    };
}
/**
 * Every judgment ranked as the most-important-problem question ranks them:
 * the largest weighted shortfall first, each with its share of the week's
 * dissatisfaction. Empty when the country is missing nothing.
 */
export function rankedProblems(campaign) {
    const shortfalls = selectOpinionReading(campaign).map((reading) => ({
        reading,
        shortfall: (1 - reading.value) * reading.weight,
    }));
    const total = shortfalls.reduce((sum, entry) => sum + entry.shortfall, 0);
    if (total <= 0)
        return [];
    return [...shortfalls].sort((a, b) => b.shortfall - a.shortfall).map((entry) => problemOf(campaign, entry, total));
}
/**
 * The most important problem facing the country, which is the oldest question in
 * polling and the one a president is actually answerable for.
 *
 * Read as the largest weighted shortfall: how much of a judgment the country is
 * missing, priced at what the week weighs that judgment at. Not simply the
 * lowest judgment — a reading nobody is thinking about this week is not the
 * country's problem — and not simply the loudest, because a loud judgment the
 * administration is delivering on is not a problem either.
 */
export function mostImportantProblem(campaign) {
    return rankedProblems(campaign)[0];
}

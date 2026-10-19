export function foundingScenarioFamilies() {
    return {};
}
export function selectFamilyRun(campaign, family) {
    return campaign.scenarioFamilies[family];
}
/** Families still running, oldest first. */
export function selectOpenFamilies(campaign) {
    return Object.values(campaign.scenarioFamilies)
        .filter((run) => run.closedTurn === undefined && !run.unanswered)
        .sort((a, b) => a.openedTurn - b.openedTurn || a.family.localeCompare(b.family));
}
/** Families that ended, most recent close first. */
export function selectClosedFamilies(campaign) {
    return Object.values(campaign.scenarioFamilies)
        .filter((run) => run.closedTurn !== undefined)
        .sort((a, b) => (b.closedTurn ?? 0) - (a.closedTurn ?? 0) || a.family.localeCompare(b.family));
}
/**
 * The country this family is about, or nothing where it has not opened.
 *
 * The one read the cast binding needs, and deliberately narrow: a member that
 * asks for the pin and does not get one is not live, which is what stops a
 * follow-up from arriving before the thing it follows.
 */
export function familyCounterpart(campaign, family) {
    const run = campaign.scenarioFamilies[family];
    return run && run.closedTurn === undefined && !run.unanswered ? run.counterpart : undefined;
}
/** Where a running family's opener happened, for its later members to return to. */
export function familyPlace(campaign, family) {
    const run = campaign.scenarioFamilies[family];
    return run && run.closedTurn === undefined && !run.unanswered ? run.place : undefined;
}
/**
 * Where the last answer that set this flag happened, for a scenario gated on
 * the flag. Absent when that answer happened in Washington or abroad, or on a
 * save from before places were kept.
 */
export function flagPlace(campaign, flag) {
    return campaign.flagPlaces?.[flag];
}
/** How long a family has been running, in turns. */
export function familyAge(campaign, family) {
    const run = campaign.scenarioFamilies[family];
    return run ? campaign.turn - run.openedTurn : undefined;
}

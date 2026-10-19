import { selectChairRunner } from "./appointments.js";
import { accountDepartments, instrumentDepartment, scenarioClassDepartments } from "./department-ownership.js";
// The player's government is not a lever the player pulls alone: the seated
// minister who owns an instrument's domain shapes how well an attempt through
// it goes. Competence sways the projected odds — and because resolveAction
// resolves from the same projection, what the minister adds or costs is
// already in the number the player reads, never a hidden bonus on top.
// A charter with a written ownership table (department-ownership.ts) answers
// from it. Every other charter's role ids are authored strings, so domains are
// matched by hint rather than by a fixed id. Both spellings of "defense" appear
// because role ids are dataset identifiers, not player copy.
const DOMAIN_ROLE_HINTS = {
    diplomatic: ["foreign", "state", "external"],
    economic: ["finance", "treasury", "economy", "trade", "commerce"],
    covert: ["intelligence", "interior", "security", "home"],
    military: ["defense", "defense", "war", "military"],
    // Aid is run out of the foreign ministry in most charters, and out of the
    // treasury in the ones that treat it as a line of the budget. Development
    // first, for the charters that seat a minister for it by name.
    assistance: ["development", "aid", "foreign", "state", "external", "finance", "treasury"],
};
/**
 * The seats with standing in a kind of week, in the order their standing runs.
 *
 * `DOMAIN_ROLE_HINTS` answers "who owns this instrument"; this answers "who
 * owns this subject", which is the question every spoken answer turns on and
 * nine replies in ten are spoken. Without it the room was picked by competence
 * alone, so the highest-scoring ministers in the cabinet advised on everything
 * and the Education Secretary had a view on a bomb threat while Defense and
 * Homeland Security stayed out of the meeting.
 *
 * Each entry is a list of hint groups rather than a flat list, because each
 * group resolves to one seat: the group is the set of spellings a charter might
 * hold that office under, and the order of the groups is the order the seats
 * have standing in. Matched by hint for the same reason `DOMAIN_ROLE_HINTS` is
 * — role ids are charter-authored strings, not a fixed enum — and a class whose
 * seats a charter does not hold simply seats fewer of them.
 */
const CLASS_ROLE_HINTS = {
    tragedy: [["homeland"], ["health"], ["transportation"], ["interior", "home", "domestic"]],
    terror: [["defense", "war", "military"], ["homeland"], ["intelligence"], ["attorney", "justice", "law"]],
    unrest: [["homeland"], ["attorney", "justice", "law"], ["interior", "home", "domestic"], ["labor"], ["housing"]],
    disaster: [["homeland"], ["interior", "home", "domestic"], ["health"], ["energy"], ["housing"]],
    "public-health": [["health"], ["homeland"], ["agriculture"]],
    migration: [["homeland"], ["foreign", "state", "external"], ["attorney", "justice", "law"], ["labor"]],
    "foreign-crisis": [["foreign", "state", "external"], ["defense", "war", "military"], ["intelligence"]],
    war: [["defense", "war", "military"], ["foreign", "state", "external"], ["intelligence"], ["veterans"]],
    espionage: [["intelligence"], ["attorney", "justice", "law"], ["defense", "war", "military"]],
    hostage: [["foreign", "state", "external"], ["defense", "war", "military"], ["intelligence"]],
    technology: [["homeland"], ["commerce"], ["intelligence"], ["energy"]],
    economy: [["finance", "treasury", "economy"], ["commerce"], ["labor"]],
    scandal: [["attorney", "justice", "law"], ["finance", "treasury", "economy"]],
    justice: [["attorney", "justice", "law"], ["interior", "home", "domestic"]],
    institution: [["attorney", "justice", "law"], ["defense", "war", "military"], ["interior", "home", "domestic"]],
    culture: [["education"], ["interior", "home", "domestic"], ["attorney", "justice", "law"]],
    death: [["foreign", "state", "external"], ["veterans"], ["interior", "home", "domestic"]],
    triumph: [["finance", "treasury", "economy"], ["foreign", "state", "external"], ["commerce"]],
};
/** The classes a relevance set is declared for, so a check can iterate them without a second copy of the list. */
export const CLASSES_WITH_SEATED_STANDING = Object.keys(CLASS_ROLE_HINTS);
/**
 * The seated chairs a scenario of this class is actually the business of.
 *
 * Deduplicated and ordered: a charter that runs two of the groups out of one
 * office seats that office once, at the highest standing it earned.
 */
export function classRoles(campaign, scenarioClass) {
    const roles = Object.keys(campaign.player.cabinet);
    const tabled = scenarioClassDepartments(campaign.founding.charter, scenarioClass);
    if (tabled)
        return tabled.filter((role) => roles.includes(role));
    const groups = scenarioClass === undefined ? undefined : CLASS_ROLE_HINTS[scenarioClass];
    if (!groups)
        return [];
    return groups.reduce((seated, hints) => {
        const match = matchRole(roles, hints);
        return match === undefined || seated.includes(match) ? seated : [...seated, match];
    }, []);
}
export function matchRole(roles, hints) {
    for (const hint of hints) {
        const match = roles.find((role) => role.toLowerCase().includes(hint));
        if (match)
            return match;
    }
    return undefined;
}
/**
 * The chair that owns an instrument: the department the charter's table names,
 * filled or not, and by hint among the seated chairs where no table is written.
 */
export function domainRole(campaign, instrument) {
    return (instrumentDepartment(campaign.founding.charter, instrument) ??
        matchRole(Object.keys(campaign.player.cabinet), DOMAIN_ROLE_HINTS[instrument]));
}
/**
 * The living minister running this instrument's department, if anyone is:
 * the confirmed Secretary, or the deputy acting in an empty chair. An acting
 * Secretary signs the department's orders, so the department's instrument
 * answers to them too rather than to nobody.
 */
export function ministerFor(campaign, instrument) {
    const role = domainRole(campaign, instrument);
    if (!role)
        return undefined;
    const runner = selectChairRunner(campaign, role);
    return runner && runner.alive ? runner : undefined;
}
/**
 * The secretaries the domestic program is actually run out of.
 *
 * The domestic line is a budget account rather than an instrument, so it has no
 * entry in `DOMAIN_ROLE_HINTS` and never will: nothing on the escalation ladder
 * is delivered through it. It still has a chair, because the money is still
 * spent by a department, and health is first because it is the largest of them
 * by a wide margin in every charter that seats one.
 */
const DOMESTIC_ROLE_HINTS = ["health", "housing", "labor", "education", "veterans"];
/**
 * The chair that spends one budget account, whether or not it is an instrument.
 *
 * The one resolver the appropriation asks, so a screen and the turn phase
 * cannot disagree about who is carrying a line.
 */
export function budgetChair(campaign, account) {
    if (account !== "domestic")
        return ministerFor(campaign, account);
    const tabled = accountDepartments(campaign.founding.charter, account);
    // A split line is carried, on the page, by the living secretary who spends the most of it.
    const roles = tabled
        ? [...tabled].sort((a, b) => b.share - a.share).map((line) => line.role)
        : [matchRole(Object.keys(campaign.player.cabinet), DOMESTIC_ROLE_HINTS)];
    return roles
        .map((role) => (role ? selectChairRunner(campaign, role) : undefined))
        .find((holder) => holder !== undefined && holder.alive);
}
// A chair nobody living holds still has a ministry under it, but one that
// drifts: worse than a mediocre minister, better than none at all existing.
const VACANT_CHAIR_COMPETENCE = 0.3;
// How far competence can move the odds, as a share of the projected chance.
// ±10% relative at the extremes: a real thumb on the scale, never the scale.
const STEWARD_SWAY = 0.2;
/**
 * The multiplier a projection applies for the player's own government. NPC
 * nations run no modeled cabinet, so their attempts pass through unchanged —
 * the player's ministers must never price another nation's moves.
 */
export function stewardSway(campaign, request) {
    if (request.actor !== campaign.founding.nation)
        return 1;
    const steward = ministerFor(campaign, request.instrument);
    const competence = steward?.base.competence ?? VACANT_CHAIR_COMPETENCE;
    return 1 + STEWARD_SWAY * (competence - 0.5);
}

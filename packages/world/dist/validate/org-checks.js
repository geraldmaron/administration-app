import { FOUNDING_DYADS } from "../dataset/dyads.js";
import { ORGANIZATION_SOURCES, organizations as shippedOrganizations } from "../dataset/orgs-cradles.js";
// What the organization registry must hold beyond its shape: a defense scope
// only where the body is a defense body and one read from a treaty text, no
// government inside two customs unions, and a dated source for every shipped
// roster. Members on the roster are the reference checks' job. The sourced
// dyads ride here too, because they are the other half of the founding
// board's authored ties and the rule is the same one: no row without the page
// it was read from and the day.
const LINK = /^https:\/\/\S+$/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const error = (path, message) => ({ kind: "plausibility", path, message });
function scopeErrors(org) {
    const scope = org.defenseScope;
    if (!scope)
        return [];
    const path = `organizations.${org.id}.defenseScope`;
    const errors = [];
    if (org.kind !== "defense")
        errors.push(error(path, `${org.name} is not a defense body, so a scope binds nothing`));
    if (scope.kind === "area" && (scope.area ?? []).length === 0)
        errors.push(error(path, "an area scope names no area"));
    if (scope.kind === "parties-territory" && scope.area !== undefined) {
        errors.push(error(path, "a territorial scope names an area it does not use"));
    }
    if (!LINK.test(scope.source))
        errors.push(error(path, "a scope is read from a treaty text, and names none"));
    return errors;
}
/** A government bound to two common external tariffs would owe two schedules at once. */
function customsUnionErrors(orgs) {
    const seen = new Map();
    const errors = [];
    for (const org of orgs.filter((body) => body.tradeCompetence === "customs-union")) {
        for (const member of org.members) {
            const earlier = seen.get(member);
            if (earlier) {
                errors.push(error(`organizations.${org.id}.members`, `${member} is in two customs unions (${earlier} and ${org.id})`));
            }
            else {
                seen.set(member, org.id);
            }
        }
    }
    return errors;
}
/** The shipped registry's rosters, each with the page it was read from. Checked on the registry itself, whatever dataset is being validated. */
function sourceErrors() {
    return shippedOrganizations.flatMap((org) => {
        const source = ORGANIZATION_SOURCES[org.id];
        const path = `organizations.${org.id}`;
        if (!source)
            return [error(path, `${org.name} names no source for its roster`)];
        return [
            ...(LINK.test(source.source) ? [] : [error(path, `${org.name}'s roster source is not a link`)]),
            ...(DAY.test(source.asOf) ? [] : [error(path, `${org.name}'s roster has no date it was read`)]),
        ];
    });
}
const inRange = (value, low, high) => Number.isFinite(value) && value >= low && value <= high;
/** One sourced pair: refused without a link and an opened date, and read only inside its schema ranges. */
export function dyadErrors(row, index) {
    const path = `dyads.${index}.${row.pair.join("-")}`;
    const errors = [];
    if (!LINK.test(row.source))
        errors.push(error(path, "a sourced pair names no page it was read from"));
    if (!DAY.test(row.opened))
        errors.push(error(path, "a sourced pair has no day its source was opened"));
    if (!(row.pair[0] < row.pair[1]))
        errors.push(error(path, "a pair is written lower id first, once"));
    if (!inRange(row.intensity, 0, 1) || row.intensity === 0)
        errors.push(error(path, "intensity is outside (0, 1]"));
    const levels = row.levels;
    if (levels) {
        const ok = levels.trust.every((v) => inRange(v, -1, 1)) && inRange(levels.tension, 0, 1) && levels.threat.every((v) => inRange(v, 0, 1));
        if (!ok)
            errors.push(error(path, "a level is outside its schema range"));
    }
    return errors;
}
/** The registry's cross-record rules, and the sourced dyads'. */
export function checkOrganizations(dataset) {
    return [
        ...dataset.organizations.flatMap(scopeErrors),
        ...customsUnionErrors(dataset.organizations),
        ...sourceErrors(),
        ...FOUNDING_DYADS.flatMap(dyadErrors),
    ];
}

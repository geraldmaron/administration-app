import { nationNameBank } from "./name-cultures.js";
import { nameCultureFor } from "./people.js";
// Which naming tradition a person's name was drawn from, read back from the
// name itself. A person is named from one tradition, given name and surname
// together, so the tradition is recoverable without storing it: the group
// that carries the surname, preferring one that also carries the given name.
// The face reads it so that a Singh wears a dastar and a covered Hindu
// minister wears a dupatta rather than a hijab.
const indexCache = new Map();
function traditionsOf(nation) {
    const cached = indexCache.get(nation);
    if (cached)
        return cached;
    const bank = nationNameBank(nation, nameCultureFor(nation));
    const built = bank.groups.map((group) => ({
        id: group.id,
        given: new Set([...group.given.masculine, ...group.given.feminine, ...group.given.neutral]),
        surname: new Set(group.surname),
    }));
    indexCache.set(nation, built);
    return built;
}
/**
 * The id of the tradition a name belongs to within its nation's bank, or
 * undefined when the bank is a single unnamed tradition or the name matches
 * none of them (an authored name, or a surname a name form rewrote).
 */
export function nameTraditionOf(name, nation) {
    const traditions = traditionsOf(nation);
    if (traditions.length === 1)
        return traditions[0].id;
    const words = name.trim().split(/\s+/);
    const carriesSurname = traditions.filter((t) => words.some((word) => t.surname.has(word)));
    const both = carriesSurname.find((t) => words.some((word) => t.given.has(word)));
    return (both ?? carriesSurname[0])?.id;
}

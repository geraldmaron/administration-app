import { faceForPerson } from "@admin/world";
import { currentAge } from "../dossier/person-age.js";
const GENOMES = new Map();
// A bound on memory, not on correctness: a cleared cache only costs a rederivation.
const MAX_CACHED = 4000;
function genomeOf(person) {
    const key = `${person.id}|${person.portraitRef}|${person.name}`;
    const cached = GENOMES.get(key);
    if (cached !== undefined)
        return cached ?? undefined;
    const genome = faceForPerson(person);
    if (GENOMES.size >= MAX_CACHED)
        GENOMES.clear();
    GENOMES.set(key, genome ?? null);
    return genome;
}
/** What to draw for this person on this surface, or undefined when they have no face yet and get a monogram. */
export function portraitSpecFor(person, options = {}) {
    const genome = genomeOf(person);
    if (genome === undefined)
        return undefined;
    const age = options.campaign ? currentAge(person, options.campaign) : person.age;
    return {
        key: `${person.id}|${person.portraitRef}|${age}|${options.mood ?? ""}|${options.treatment ?? ""}`,
        genome,
        age,
        ...(options.mood ? { mood: options.mood } : {}),
        ...(options.treatment ? { treatment: options.treatment } : {}),
    };
}
/** One or two initials for a person drawn without a face. */
export function monogramFor(name) {
    const initials = name
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => [...part][0])
        .filter((letter) => letter !== undefined)
        .join("");
    return initials.length > 0 ? initials.toLocaleUpperCase("en-US") : "?";
}

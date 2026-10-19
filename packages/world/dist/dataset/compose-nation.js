import { NationInput } from "../schemas/nation.js";
import { fillSectorMix } from "./sectors.js";
function isPlainObject(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
/** The authored value wherever one is stated; an array is a value, not a list to merge. */
function overlay(base, authored) {
    if (authored === undefined)
        return base;
    if (!isPlainObject(base) || !isPlainObject(authored))
        return authored;
    const keys = new Set([...Object.keys(base), ...Object.keys(authored)]);
    return Object.fromEntries([...keys].map((key) => [key, overlay(base[key], authored[key])]));
}
/**
 * One record from its authored layer and its baked figures.
 *
 * Throws when a record has no figures and does not state its own: that is a
 * country missing from the seed, and a record assembled without numbers would
 * otherwise fail far from the cause, as a schema error about a field nobody wrote.
 */
export function composeNation(draft, figures) {
    if (!figures && !draft.stats) {
        throw new Error(`no baked figures for "${draft.id}" and its record states none of its own — is it in the seed roster?`);
    }
    const stats = overlay(figures?.stats, draft.stats);
    const sectors = draft.sectors ??
        fillSectorMix(stats.trade.topExports, stats.energy.mix, stats.demography.population, stats.economy.unemployment);
    return NationInput.parse({ ...draft, stats, sectors });
}

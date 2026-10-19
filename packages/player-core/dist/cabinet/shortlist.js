import { actingEffects, selectAppointableFor } from "@admin/engine";
import { pricedRows } from "../government/act-price.js";
import { judgeAttribute } from "../government/machine-readings.js";
/** How many names a shortlist sets: enough to choose between, few enough to read on a phone. */
export const SHORTLIST_SIZE = 4;
function readingRows(people) {
    return ["competence", "loyalty"].map((attribute) => ({
        id: attribute,
        label: attribute === "competence" ? "Competence" : "Loyalty",
        cells: people.map((person) => ({ kind: "band", judgment: judgeAttribute(attribute, person[attribute]) })),
    }));
}
/**
 * The acting shortlist for a chair the law lets somebody act in: who could sign
 * for it tomorrow. The bench is the cabinet seat's own, or
 * for an agency the department's above it, which is where a deputy comes from.
 */
export function actingShortlist(campaign, seat, benchRole, limitDays, limit = SHORTLIST_SIZE) {
    const candidates = benchRole ? selectAppointableFor(campaign, benchRole).map((runtime) => runtime.base) : [];
    const people = candidates.filter((person) => actingEffects(campaign, seat, person.id).ok).slice(0, limit);
    const serves = limitDays !== undefined ? `Can serve up to ${limitDays} days unless you send the Senate a nominee` : "Serves until the Senate confirms someone";
    const options = people.map((person) => ({
        id: person.id,
        label: person.name,
        person: person.id,
        name: person.name,
        follows: [`${person.name} fills in without being confirmed. ${serves}.`],
    }));
    return { mode: "acting", options, rows: [...readingRows(people), ...pricedRows(campaign, options)], waiting: "Until someone fills in, nobody is in charge, and the office does its weakest work." };
}

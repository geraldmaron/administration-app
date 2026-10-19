import { byId } from "./registry/build.js";
import { REGULATORS, COMPONENTS } from "./registry/agencies.js";
import { CONSTITUTIONAL, DEPARTMENTS, EXECUTIVE_OFFICES, SEAL_COURT_OF_APPEALS, SEAL_HOUSE, SEAL_SENATE, SEAL_SUPREME_COURT } from "./registry/federal.js";
import { ORGANIZATIONS } from "./registry/international.js";
import { OUTLETS } from "./registry/outlets.js";
import { ARMED_FORCES, INTELLIGENCE, INTELLIGENCE_ALIASES } from "./registry/security.js";
export { DEVICE_IDS, SEAL_COLORS } from "./devices.js";
export { SEAL_COURT_OF_APPEALS, SEAL_HOUSE, SEAL_PRESIDENT, SEAL_SENATE, SEAL_SUPREME_COURT, SEAL_VICE_PRESIDENT, SEAL_WHITE_HOUSE, } from "./registry/federal.js";
/** Every authored emblem, keyed by the id of the body it stands for. */
export const SEALS = byId([
    ...CONSTITUTIONAL,
    ...DEPARTMENTS,
    ...EXECUTIVE_OFFICES,
    ...REGULATORS,
    ...COMPONENTS,
    ...INTELLIGENCE,
    ...ARMED_FORCES,
    ...ORGANIZATIONS,
    ...OUTLETS,
]);
/*
 * Ids that share another body's emblem: the intelligence community's ids
 * for elements the catalog already carries, and every judicial seat, which
 * bears its court's seal rather than one of its own.
 */
function aliasOf(id) {
    if (id in INTELLIGENCE_ALIASES)
        return INTELLIGENCE_ALIASES[id];
    if (id.startsWith("INST-SCOTUS-SEAT-"))
        return SEAL_SUPREME_COURT;
    if (id.startsWith("INST-CIRCUIT-"))
        return SEAL_COURT_OF_APPEALS;
    return undefined;
}
function authored(id) {
    const spec = SEALS[aliasOf(id) ?? id];
    return spec && spec.id !== id ? { ...spec, id } : spec;
}
/** Whether `id` has an authored emblem rather than the generic one. */
export function hasAuthoredSeal(id) {
    return authored(id) !== undefined;
}
export function sealKindOf(id) {
    if (id.startsWith("IC-"))
        return "intelligence";
    if (id.startsWith("INST-SCOTUS") || id.startsWith("INST-CIRCUIT"))
        return "court";
    if (id.startsWith("INST-") || id.startsWith("SEAL-"))
        return "federal";
    if (id.startsWith("ORG-") || id.startsWith("CRADLE-"))
        return "international";
    if (id.startsWith("outlet-"))
        return "outlet";
    return "generic";
}
const MINOR_WORDS = new Set(["of", "the", "and", "for", "on", "in", "a"]);
/** Initials of a name, or the tail of an id when there is no name. */
export function monogramOf(id, name) {
    const source = name
        ? name.split(/[\s-]+/).filter((w) => w && !MINOR_WORDS.has(w.toLowerCase())).map((w) => w[0])
        : [...id.replace(/^(INST|IC|ORG|SEAL|CRADLE|outlet)-/, "").replace(/[^A-Za-z0-9]/g, "")];
    return source.join("").slice(0, 4).toUpperCase() || "?";
}
/*
 * The honest generic emblem: the class of body in its shape and colors,
 * and letters in place of a device, so it never passes as an authored seal.
 */
function fallbackSeal(id, name) {
    const kind = sealKindOf(id);
    const monogram = monogramOf(id, name);
    const base = { id, device: "monogram", monogram };
    switch (kind) {
        case "outlet":
            return { ...base, shape: "masthead", field: "black", rim: "silver", deviceColor: "white", nameplate: { face: "serif", caps: false, rule: "single" } };
        case "international":
            return { ...base, shape: "rosette", field: "teal", rim: "silver", deviceColor: "white" };
        case "intelligence":
            return { ...base, shape: "roundel", field: "black", rim: "silver", deviceColor: "silver" };
        case "court":
            return { ...base, shape: "roundel", field: "black", rim: "gold", deviceColor: "gold" };
        case "federal":
            return { ...base, shape: "roundel", field: "navy", rim: "silver", deviceColor: "white" };
        case "generic":
            return { ...base, shape: "roundel", field: "midnight", rim: "silver", deviceColor: "silver" };
    }
}
/** The emblem for an institution, organization or outlet id; a generic one, by kind, when none is authored. */
export function sealFor(id, name) {
    return authored(id) ?? fallbackSeal(id, name);
}
/** The seal of a chamber of Congress, by the engine's chamber name. */
export function chamberSeal(chamber) {
    return SEALS[chamber === "house" ? SEAL_HOUSE : SEAL_SENATE];
}

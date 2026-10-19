import { dueCases } from "./cases.js";
import { apply } from "./effects.js";
function isCase(id, value) {
    if (typeof value !== "object" || value === null)
        return false;
    const item = value;
    return item.id === id && typeof item.status === "string" && Array.isArray(item.history) && item.history.length > 0;
}
/** Drops entries that cannot be a case. Absence of the registry is left absent. */
export function repairCases(campaign) {
    if (campaign.cases === undefined)
        return campaign;
    const next = {};
    for (const [id, value] of Object.entries(campaign.cases)) {
        if (isCase(id, value))
            next[id] = value;
    }
    const before = Object.keys(campaign.cases).length;
    if (before === Object.keys(next).length)
        return campaign;
    return { ...campaign, cases: next };
}
function deadlinePacket(campaign, effects) {
    return {
        source: "simulate",
        actor: "world",
        turn: campaign.turn,
        narration: { summary: "A deadline passed." },
        effects,
    };
}
/** Applies due defaults. The case stays, with status `defaulted`. The legal sentence is not run. */
export function withDueCaseDefaults(campaign) {
    const effects = dueDefaultEffects(campaign);
    if (effects.length === 0)
        return campaign;
    return apply(campaign, deadlinePacket(campaign, effects));
}
/** World effects for open cases whose deadline is today or earlier. */
export function dueDefaultEffects(campaign) {
    return dueCases(campaign, campaign.calendar)
        .filter((item) => item.allowedDispositions.includes("allow-default"))
        .map((item) => ({
        kind: "case",
        actor: "world",
        transition: {
            id: item.id,
            disposition: { kind: "allow-default" },
            narration: "The deadline passed.",
        },
    }));
}

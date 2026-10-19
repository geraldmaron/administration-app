import { COHORT_MOTIVATION, routeCohorts, routeDomestic } from "@admin/engine";
/** The groups an act lands on, hardest first. Empty when it names no one in particular. */
export function reachByGroup(campaign, signature) {
    const routed = routeDomestic(campaign, signature);
    return routeCohorts(campaign, signature, routed)
        .flatMap((effect) => {
        const strain = effect.addStrain;
        if (!strain)
            return [];
        return [{ cohort: effect.cohort, name: COHORT_MOTIVATION[effect.cohort].name, direction: strain.valence > 0 ? "helps" : "costs", weight: strain.weight }];
    })
        .sort((a, b) => b.weight - a.weight || a.cohort.localeCompare(b.cohort));
}
const LIMIT = 4;
function list(names) {
    return names.length <= 2 ? names.join(" and ") : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
}
/** One sentence for a desk row: who it helps and who it costs, the first few of each. */
export function reachSentence(lines) {
    const helps = lines.filter((l) => l.direction === "helps").map((l) => l.name);
    const costs = lines.filter((l) => l.direction === "costs").map((l) => l.name);
    if (helps.length === 0 && costs.length === 0)
        return undefined;
    const parts = [
        helps.length > 0 ? `Helps ${list(helps.slice(0, LIMIT))}${helps.length > LIMIT ? ` and ${helps.length - LIMIT} more` : ""}` : "",
        costs.length > 0 ? `Costs ${list(costs.slice(0, LIMIT))}${costs.length > LIMIT ? ` and ${costs.length - LIMIT} more` : ""}` : "",
    ].filter(Boolean);
    return `${parts.join(". ")}.`;
}

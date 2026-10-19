import { NationTraits, TRAIT_KEYS } from "@admin/world";
// Turns an authored personality *range* into the one personality a nation has
// for the length of a single campaign. Every draw is keyed by nation and trait
// name, so adding a nation or a trait never shifts anyone else's roll — an
// existing campaign seed keeps producing the world it produced before.
const round3 = (v) => Math.round(v * 1000) / 1000;
function rollAgendas(profile, streams) {
    const remaining = [...profile.candidateAgendas];
    const picked = [];
    const count = Math.min(profile.agendaCount, remaining.length);
    for (let i = 0; i < count; i++) {
        // Weighted draw without replacement: a nation's heavier aims come up more
        // often across campaigns, but none of them is guaranteed.
        const stream = streams.stream("traits", profile.nation, "agenda", i);
        const total = remaining.reduce((sum, a) => sum + a.weight, 0);
        let target = stream.next() * total;
        let index = remaining.length - 1;
        for (let j = 0; j < remaining.length; j++) {
            target -= remaining[j].weight;
            if (target <= 0) {
                index = j;
                break;
            }
        }
        const [chosen] = remaining.splice(index, 1);
        // The aim survives the campaign roll; how hard it is pursued does not.
        const jitter = (streams.stream("traits", profile.nation, "agenda-weight", i).next() - 0.5) * 0.2;
        picked.push({ ...chosen, weight: round3(Math.min(1, Math.max(0, chosen.weight + jitter))) });
    }
    return picked;
}
export function rollNationTraits(profile, streams) {
    const rolled = Object.fromEntries(TRAIT_KEYS.map((key) => {
        const { min, max } = profile.ranges[key];
        const u = streams.stream("traits", profile.nation, key).next();
        return [key, round3(min + u * (max - min))];
    }));
    return NationTraits.parse({ ...rolled, agendas: rollAgendas(profile, streams) });
}
// The campaign-start pass: every nation gets its personality for this run.
// Nations without an authored profile keep their dataset traits unchanged
// rather than being silently randomized.
export function rollWorldTraits(nations, profiles, streams) {
    const byNation = new Map(profiles.map((p) => [p.nation, p]));
    return nations.map((nation) => {
        const profile = byNation.get(nation.id);
        return profile ? { ...nation, traits: rollNationTraits(profile, streams) } : nation;
    });
}

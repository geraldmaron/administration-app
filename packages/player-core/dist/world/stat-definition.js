import { GEO_CONSUMERS, STAT_CONSUMERS, TRAIT_CONSUMERS, metricFor } from "@admin/world";
// The registry names readers by declaration (`packages/engine/src/macro.ts#nextEconomy`);
// a player reads the system, which is the module. A module a player never meets
// (the dataset validator) names nothing, and an engine module with no word of
// its own is the simulation at large.
const SYSTEM_WORDS = {
    bands: "how countries are sorted into groups",
    conditions: "the crises a country can fall into",
    "condition-onset": "the crises a country can fall into",
    macro: "how an economy grows or shrinks",
    governance: "the plans a government carries out",
    policy: "the plans a government carries out",
    "npc-agent": "what a government chooses to do abroad",
    "npc-turn": "how often a government acts",
    propensity: "what a government tends to try",
    instruments: "what your tools as president can do",
    "instruments-military": "what your tools as president can do",
    "instruments-economic": "what your tools as president can do",
    trade: "trade",
    "scenario-cast": "which decisions come to you",
    geography: "the map",
};
const SIMULATION = "the simulation";
const CONSUMERS = [...STAT_CONSUMERS, ...GEO_CONSUMERS, ...TRAIT_CONSUMERS];
function systemOf(site) {
    const file = site.split("#")[0] ?? "";
    const module = (file.split("/").pop() ?? "").replace(/\.tsx?$/, "");
    return SYSTEM_WORDS[module] ?? (file.startsWith("packages/engine/src/") ? SIMULATION : undefined);
}
function readersOf(path) {
    const entry = CONSUMERS.find((consumer) => consumer.path === path);
    if (!entry || !("readBy" in entry))
        return [];
    const systems = entry.readBy.map(systemOf).filter((word) => word !== undefined);
    return [...new Set(systems)];
}
/** The definition of one stats path — `economy.growth`, `politics.regimeStability`. */
export function statDefinition(path) {
    const measures = metricFor(`stats.${path}`)?.description;
    return { path, readBy: readersOf(path), ...(measures ? { measures } : {}) };
}

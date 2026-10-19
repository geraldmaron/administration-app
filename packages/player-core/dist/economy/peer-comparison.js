import { ALL_METRIC_DEFINITIONS, WORLD_REFERENCE_COUNTRIES, checkComparison, valueOf, worldWindow, } from "@admin/world";
import { WINDOW_PRESETS } from "./comparison.js";
export const PEER_MEASURES = [
    "unemployment",
    "inflation",
    "growth",
    "population",
];
const METRIC = {
    unemployment: "wb.unemployment",
    inflation: "wb.inflation",
    growth: "wb.gdp-growth",
    population: "wb.population-growth",
};
/** The countries the reference pack holds, in the order they are offered. */
export const PEER_GROUP = Object.entries(WORLD_REFERENCE_COUNTRIES).map(([id, name]) => ({
    id,
    name,
}));
export const MAX_PEERS = 4;
const yearOf = (month) => month.slice(0, 4);
function windowFor(rate, peers, window) {
    for (const peer of peers) {
        const found = worldWindow(METRIC[rate], peer, yearOf(window.first), yearOf(window.last));
        if (!found.ok)
            return { ...window, available: false, reason: found.reason };
    }
    return { ...window, available: true };
}
/** Peers kept to the pack's countries, without repeats, at most `MAX_PEERS`. */
export function normalizePeers(requested) {
    const known = new Set(PEER_GROUP.map((p) => p.id));
    return [...new Set(requested)]
        .filter((id) => known.has(id))
        .slice(0, MAX_PEERS);
}
export function peerComparisonView(rate, requested, windowId) {
    const peers = normalizePeers(requested);
    const metric = METRIC[rate];
    const definition = ALL_METRIC_DEFINITIONS[metric];
    const windows = WINDOW_PRESETS.map((preset) => windowFor(rate, peers, preset));
    const selected = windows.find((w) => w.id === windowId) ??
        windows.find((w) => w.available) ??
        windows[0];
    const basis = `World Bank ${definition.label.toLowerCase()}, annual: ${definition.definition}`;
    const general = "Countries measure these in different ways and update them later. A gap between two lines comes from two different sources and doesn't say anything about either government.";
    const caution = rate === "population"
        ? `${general} A sudden jump or drop usually means a new census changed the population count, not that people moved in or out.`
        : general;
    const base = { rate, peers, windows, selected, basis, caution };
    if (peers.length < 2)
        return {
            ...base,
            series: [],
            unavailable: "Pick at least 2 countries.",
        };
    if (!selected.available)
        return {
            ...base,
            series: [],
            unavailable: selected.reason ?? "There's no past data for this stretch of time.",
        };
    const verdict = checkComparison(definition, definition);
    if (verdict.status === "incompatible")
        return { ...base, series: [], unavailable: verdict.reason };
    const series = peers.map((peer) => {
        const found = worldWindow(metric, peer, yearOf(selected.first), yearOf(selected.last));
        const rows = found.ok ? found.observations : [];
        return {
            id: peer,
            name: WORLD_REFERENCE_COUNTRIES[peer] ?? peer,
            evidence: rows[0]?.evidence === "estimated-reference" ? "estimated" : "observed",
            points: rows.map((o) => {
                const value = valueOf(o);
                return {
                    year: Number(o.period),
                    label: o.period,
                    value,
                    ...(value === undefined
                        ? { gap: `No figure published for ${o.period}.` }
                        : {}),
                };
            }),
        };
    });
    return { ...base, series };
}

import { deedsWaitedOn, sealedCampaign, withFlags } from "./preview-board.js";
/** A value squarely inside each band, so a board is not balanced on a threshold. */
const INFLATION_AT = { "below-target": 0.005, "near-target": 0.02, elevated: 0.04, high: 0.07 };
const UNEMPLOYMENT_AT = { tight: 0.035, normal: 0.047, slack: 0.065, severe: 0.095 };
const COST_OF_LIVING_MOVE = { easing: -0.02, steady: 0, rising: 0.05, straining: 0.12 };
const CRIME_MOVE = { falling: -0.05, steady: 0, rising: 0.05 };
const COMMODITY_AT = { slumped: 0.75, normal: 1, elevated: 1.25, spiking: 1.6 };
/** Past every early `turn` floor a pulse gate is likely to stand beside. */
const PULSE_BOARD_TURN = 12;
function homeStats(patch) {
    return (campaign) => {
        const id = campaign.founding.nation;
        const runtime = campaign.nations[id];
        if (!runtime)
            return campaign;
        return { ...campaign, nations: { ...campaign.nations, [id]: { ...runtime, stats: patch(runtime.stats, runtime.base.stats) } } };
    };
}
function withCycle(phase) {
    return (campaign) => {
        const id = campaign.founding.nation;
        const cycle = campaign.cycles[id];
        return cycle ? { ...campaign, cycles: { ...campaign.cycles, [id]: { ...cycle, phase } } } : campaign;
    };
}
function withCommodity(commodity, index) {
    return (campaign) => ({ ...campaign, markets: { commodities: { [commodity]: { index } } } });
}
/** Every (gate, band) a batch asks for, as a keyed patch. */
function patchesFor(defs) {
    const out = new Map();
    for (const condition of defs.flatMap((def) => def.conditions)) {
        switch (condition.kind) {
            case "inflationBand":
                for (const band of condition.in)
                    out.set(`inflation:${band}`, homeStats((s) => ({ ...s, economy: { ...s.economy, inflation: INFLATION_AT[band] } })));
                break;
            case "unemploymentBand":
                for (const band of condition.in)
                    out.set(`unemployment:${band}`, homeStats((s) => ({ ...s, economy: { ...s.economy, unemployment: UNEMPLOYMENT_AT[band] } })));
                break;
            case "costOfLivingBand":
                for (const band of condition.in) {
                    out.set(`cost:${band}`, homeStats((s, oath) => ({ ...s, economy: { ...s.economy, costOfLiving: oath.economy.costOfLiving * (1 + COST_OF_LIVING_MOVE[band]) } })));
                }
                break;
            case "crimeTrend":
                for (const trend of condition.in) {
                    out.set(`crime:${trend}`, homeStats((s, oath) => ({ ...s, security: { ...s.security, crimeIndex: Math.min(1, Math.max(0, oath.security.crimeIndex + CRIME_MOVE[trend])) } })));
                }
                break;
            case "cyclePhase":
                for (const phase of condition.in)
                    out.set(`cycle:${phase}`, withCycle(phase));
                break;
            case "commodityBand":
                for (const band of condition.in)
                    out.set(`commodity:${condition.commodity}:${band}`, withCommodity(condition.commodity, COMMODITY_AT[band]));
                break;
            default:
                break;
        }
    }
    return out;
}
const cache = new Map();
/**
 * One board per band the batch gates on. Each carries only its own band, so a
 * scenario gated on two readings at once is reachable only if some board holds
 * both — which a single-reading board never does. That is deliberate: two
 * pulse gates together are a claim about a specific week, and the writer who
 * makes it hands the gate a board that has it, or drops one.
 */
export function pulseBoards(defs) {
    const deeds = deedsWaitedOn(defs);
    return [...patchesFor(defs)].map(([band, patch]) => {
        const key = `${band}|${deeds.key}`;
        const held = cache.get(key);
        if (held)
            return held;
        const built = withFlags(patch({ ...sealedCampaign("preview-pulse"), turn: PULSE_BOARD_TURN }), deeds.flags);
        cache.set(key, built);
        return built;
    });
}

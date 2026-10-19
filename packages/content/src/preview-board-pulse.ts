// Reachability boards for the pulse gates: one board per band a batch asks
// for, carrying the player's country in that band and nothing else unusual.
//
// The canonical boards run nine weeks from a sealed founding, so the economy
// sits where the dataset opened it — inflation near target, a normal labor
// market, prices and crime where the oath found them, the cycle in expansion.
// A gate on any other band would be refused as unreachable for a reason that
// has nothing to do with the scenario. The question a board answers is only
// "does a board exist where this is true"; how often a real campaign gets
// there is the balance harness's to measure.
import type { Campaign, CyclePhase, NationRuntime } from "@admin/engine";
import type { ScenarioDef } from "./scenario.js";
import { deedsWaitedOn, sealedCampaign, withFlags } from "./preview-board.js";
import type { CommodityBand, CostOfLivingBand, CrimeTrend, InflationBand, UnemploymentBand } from "./scenario-pulse.js";

/** A value squarely inside each band, so a board is not balanced on a threshold. */
const INFLATION_AT: Readonly<Record<InflationBand, number>> = { "below-target": 0.005, "near-target": 0.02, elevated: 0.04, high: 0.07 };
const UNEMPLOYMENT_AT: Readonly<Record<UnemploymentBand, number>> = { tight: 0.035, normal: 0.047, slack: 0.065, severe: 0.095 };
const COST_OF_LIVING_MOVE: Readonly<Record<CostOfLivingBand, number>> = { easing: -0.02, steady: 0, rising: 0.05, straining: 0.12 };
const CRIME_MOVE: Readonly<Record<CrimeTrend, number>> = { falling: -0.05, steady: 0, rising: 0.05 };
const COMMODITY_AT: Readonly<Record<CommodityBand, number>> = { slumped: 0.75, normal: 1, elevated: 1.25, spiking: 1.6 };

/** Past every early `turn` floor a pulse gate is likely to stand beside. */
const PULSE_BOARD_TURN = 12;

type Patch = (campaign: Campaign) => Campaign;

type Stats = NationRuntime["stats"];

function homeStats(patch: (stats: Stats, oath: NationRuntime["base"]["stats"]) => Stats): Patch {
  return (campaign) => {
    const id = campaign.founding.nation;
    const runtime = campaign.nations[id];
    if (!runtime) return campaign;
    return { ...campaign, nations: { ...campaign.nations, [id]: { ...runtime, stats: patch(runtime.stats, runtime.base.stats) } } };
  };
}

function withCycle(phase: CyclePhase): Patch {
  return (campaign) => {
    const id = campaign.founding.nation;
    const cycle = campaign.cycles[id];
    return cycle ? { ...campaign, cycles: { ...campaign.cycles, [id]: { ...cycle, phase } } } : campaign;
  };
}

function withCommodity(commodity: string, index: number): Patch {
  return (campaign) => ({ ...campaign, markets: { commodities: { [commodity]: { index } } } }) as Campaign;
}

/** Every (gate, band) a batch asks for, as a keyed patch. */
function patchesFor(defs: readonly ScenarioDef[]): ReadonlyMap<string, Patch> {
  const out = new Map<string, Patch>();
  for (const condition of defs.flatMap((def) => def.conditions)) {
    switch (condition.kind) {
      case "inflationBand":
        for (const band of condition.in) out.set(`inflation:${band}`, homeStats((s) => ({ ...s, economy: { ...s.economy, inflation: INFLATION_AT[band] } })));
        break;
      case "unemploymentBand":
        for (const band of condition.in) out.set(`unemployment:${band}`, homeStats((s) => ({ ...s, economy: { ...s.economy, unemployment: UNEMPLOYMENT_AT[band] } })));
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
        for (const phase of condition.in) out.set(`cycle:${phase}`, withCycle(phase));
        break;
      case "commodityBand":
        for (const band of condition.in) out.set(`commodity:${condition.commodity}:${band}`, withCommodity(condition.commodity, COMMODITY_AT[band]));
        break;
      default:
        break;
    }
  }
  return out;
}

const cache = new Map<string, Campaign>();

/**
 * One board per band the batch gates on. Each carries only its own band, so a
 * scenario gated on two readings at once is reachable only if some board holds
 * both — which a single-reading board never does. That is deliberate: two
 * pulse gates together are a claim about a specific week, and the writer who
 * makes it hands the gate a board that has it, or drops one.
 */
export function pulseBoards(defs: readonly ScenarioDef[]): readonly Campaign[] {
  const deeds = deedsWaitedOn(defs);
  return [...patchesFor(defs)].map(([band, patch]) => {
    const key = `${band}|${deeds.key}`;
    const held = cache.get(key);
    if (held) return held;
    const built = withFlags(patch({ ...sealedCampaign("preview-pulse"), turn: PULSE_BOARD_TURN }), deeds.flags);
    cache.set(key, built);
    return built;
  });
}

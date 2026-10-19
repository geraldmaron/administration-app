import { selectNation, type Campaign } from "@admin/engine";
import type { StateId } from "@admin/world";
import type { MetricStance } from "../format/figures";

// The state's pulse: three bands built out of the country's own live figure
// plus the state's authored deviation from it (`character.vitalAnchor`),
// which is what "population-weighted, centered on zero" means — a state that
// carries no deviation reads exactly as the country does, and one that does
// reads that much better or worse. Nothing here is stored or simulated
// per-state; it is combined at read time, the same way a nation's own bands
// are read off its live stats rather than off a second copy of them.

export type StateVitalKey = "jobs" | "prices" | "crime";

export type StateVital = {
  readonly key: StateVitalKey;
  readonly caption: string;
  readonly word: string;
  readonly stance: MetricStance;
};

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function jobsVital(unemployment: number): StateVital {
  const stance: MetricStance = unemployment < 0.05 ? "favorable" : unemployment < 0.08 ? "neutral" : unemployment < 0.15 ? "caution" : "adverse";
  const word = { favorable: "Plenty of work", neutral: "Some people out of work", caution: "Work is scarce", adverse: "Work is very scarce" }[stance];
  return { key: "jobs", caption: "Jobs", word, stance };
}

function pricesVital(costOfLivingIndex: number): StateVital {
  const stance: MetricStance = costOfLivingIndex < 0.9 ? "favorable" : costOfLivingIndex < 1.1 ? "neutral" : costOfLivingIndex < 1.3 ? "caution" : "adverse";
  const word = { favorable: "Cheaper than the country", neutral: "About the national average", caution: "Costlier than the country", adverse: "Far costlier than the country" }[stance];
  return { key: "prices", caption: "Cost of living", word, stance };
}

function crimeVital(crimeIndex: number): StateVital {
  const stance: MetricStance = crimeIndex < 0.25 ? "favorable" : crimeIndex < 0.45 ? "neutral" : crimeIndex < 0.65 ? "caution" : "adverse";
  const word = { favorable: "Quiet", neutral: "Ordinary", caution: "Rising", adverse: "High" }[stance];
  return { key: "crime", caption: "Crime", word, stance };
}

/**
 * A state's pulse: its jobs, its prices and its crime, each the country's own
 * current figure carried through the state's authored deviation from it.
 * Undefined only where the campaign carries no live reading for the nation
 * this presidency governs, which does not happen in a founded campaign.
 */
export function stateVitals(campaign: Campaign, stateId: StateId): readonly StateVital[] | undefined {
  const nation = selectNation(campaign, campaign.founding.nation);
  const runtime = campaign.states[stateId];
  if (!nation || !runtime) return undefined;
  const anchor = runtime.base.character.vitalAnchor;
  const unemployment = clamp01(nation.stats.economy.unemployment + anchor.unemployment);
  const costOfLivingIndex = nation.stats.economy.costOfLiving * (1 + anchor.costOfLiving);
  const crimeIndex = clamp01(nation.stats.security.crimeIndex + anchor.crimeIndex);
  return [jobsVital(unemployment), pricesVital(costOfLivingIndex), crimeVital(crimeIndex)];
}

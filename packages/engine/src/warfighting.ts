// What a nation could actually fight, read off its stats: force index, how
// much of it can be mobilized, how long that can be sustained, and how long
// recovery takes. A derived reading only; nothing here writes campaign state.
import { computeMilitaryMetrics, type Nation, type NationStats } from "@admin/world";

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export type WarfightingMetrics = {
  forceIndex: number;
  mobilizationCap: number;
  sustainability: {
    warDuration: number;
    industrialMobilization: number;
  };
  downtime: number;
};

export type WarfightingAssessment = {
  metrics: WarfightingMetrics;
  tier: 1 | 2 | 3 | 4 | 5;
  label: string;
  verdict: string;
  sustainabilityLabel: string;
  recoveryLabel: string;
  strategicImplications: readonly string[];
  crisisRisk: "critical" | "high" | "moderate" | "low";
};

function tierFrom(value: number): 1 | 2 | 3 | 4 | 5 {
  return Math.min(5, Math.max(1, Math.round(value * 5))) as 1 | 2 | 3 | 4 | 5;
}

function labelForTier(tier: 1 | 2 | 3 | 4 | 5): string {
  switch (tier) {
    case 5: return "Superpower Projection";
    case 4: return "Major Expeditionary";
    case 3: return "Regional Power";
    case 2: return "Limited Defense";
    case 1: return "Minimal Capability";
  }
}

function verdictForTier(tier: 1 | 2 | 3 | 4 | 5): string {
  switch (tier) {
    case 5: return "Can project decisive force globally";
    case 4: return "Can sustain expeditionary operations";
    case 3: return "Dominant in regional conflicts";
    case 2: return "Struggles beyond immediate borders";
    case 1: return "Cannot sustain major operations";
  }
}

function sustainabilityLabel(duration: number): string {
  if (duration >= 0.7) return "Sustainable (12+ months)";
  if (duration >= 0.5) return "Limited (6-12 months)";
  if (duration >= 0.3) return "Short (3-6 months)";
  return "Unsustainable (<3 months)";
}

function recoveryLabel(downtime: number): string {
  if (downtime <= 0.2) return "Rapid (3-6 months)";
  if (downtime <= 0.4) return "Moderate (6-12 months)";
  if (downtime <= 0.6) return "Extended (1-2 years)";
  return "Prolonged (2+ years)";
}

export function assessWarfighting(nation: Nation): WarfightingAssessment {
  const m = nation.stats.military;
  const bands = nation.bands;
  const metrics: WarfightingMetrics = bands.militaryMetrics ?? {
    forceIndex: 0,
    mobilizationCap: 0,
    sustainability: { warDuration: 0, industrialMobilization: 0 },
    downtime: 1,
  };

  const tier = tierFrom(metrics.forceIndex);
  const label = labelForTier(tier);
  const verdict = verdictForTier(tier);
  const sustainLabel = sustainabilityLabel(metrics.sustainability.warDuration);
  const recovery = recoveryLabel(metrics.downtime);

  const implications: string[] = [];

  if (metrics.forceIndex >= 0.7 && metrics.sustainability.warDuration >= 0.6) {
    implications.push("Can fight and sustain a major war without economic collapse");
  }
  if (metrics.forceIndex >= 0.5 && metrics.mobilizationCap >= 0.5) {
    implications.push("Rapid mobilization enables flexible escalation");
  }
  if (metrics.sustainability.warDuration < 0.3) {
    implications.push("Cannot afford a prolonged conflict — limited war chest");
  }
  if (metrics.downtime > 0.6) {
    implications.push("Long recovery period after any major engagement");
  }
  if (m.arsenal.warheads > 0 && m.arsenal.deliveryTriad) {
    implications.push("Nuclear triad provides existential deterrent");
  }
  if (m.basesAbroad >= 3) {
    implications.push("Overseas bases enable power projection beyond region");
  }
  if (m.branchStrength.cyber >= 0.6 && m.branchStrength.space >= 0.5) {
    implications.push("Modern ISR and C4ISR superiority");
  }

  const stability = bands.stabilityBand;
  let crisisRisk: WarfightingAssessment["crisisRisk"] = "low";
  if (stability === "collapsing" && metrics.forceIndex > 0.4) {
    crisisRisk = "critical";
  } else if (stability === "volatile" && metrics.sustainability.warDuration < 0.4) {
    crisisRisk = "high";
  } else if (stability === "fragile" && metrics.sustainability.warDuration < 0.5) {
    crisisRisk = "moderate";
  }

  return {
    metrics,
    tier,
    label,
    verdict,
    sustainabilityLabel: sustainLabel,
    recoveryLabel: recovery,
    strategicImplications: implications,
    crisisRisk,
  };
}

export type ForceProjectionProfile = {
  adjacentConflict: number;
  regionalProjection: number;
  expeditionary: number;
  globalReach: number;
  nuclearDeterrent: boolean;
};

// Keyed on the stats object: a nation's stats are replaced whenever anything
// moves them and never edited in place, so a week that left a country alone
// reuses its reading and a week that bled its readiness computes a fresh one.
const LIVE_METRICS = new WeakMap<NationStats, WarfightingMetrics>();

/**
 * What a nation can fight with this week, off its live stats.
 *
 * The band carries the same computation, taken once at founding, so a force
 * bled of readiness, rebuilt by an appropriation or armed by an ally fought
 * every later week at the strength it was handed. Anything that scores who is
 * winning reads this instead.
 */
export function liveMilitaryMetrics(stats: NationStats): WarfightingMetrics {
  const cached = LIVE_METRICS.get(stats);
  if (cached) return cached;
  const metrics = computeMilitaryMetrics(stats);
  LIVE_METRICS.set(stats, metrics);
  return metrics;
}

/** Where a nation's force can be brought to bear this week, off its live metrics. */
export function forceProjectionProfile(nation: Nation): ForceProjectionProfile {
  const m = nation.stats.military;
  const metrics = liveMilitaryMetrics(nation.stats);

  const adjacent = clamp01(metrics.forceIndex * 1.2);
  const regional = clamp01(metrics.forceIndex * (m.basesAbroad >= 1 ? 1.1 : 0.8));
  const expeditionary = clamp01(metrics.forceIndex * (m.airliftCapacity + m.sealiftCapacity) / 2);
  const global = clamp01(metrics.forceIndex * (m.basesAbroad / 5 + 0.2));

  return {
    adjacentConflict: adjacent,
    regionalProjection: regional,
    expeditionary,
    globalReach: global,
    nuclearDeterrent: m.arsenal.warheads > 0 && m.arsenal.deliveryTriad,
  };
}
/**
 * How well a government's people in the field fight, 0..1: how ready and how
 * well commanded the force is, times the mean of its five branches.
 *
 * Not the force index. That index sums mass, reach and arsenal and clamps the
 * sum, so a 3,000-soldier army and the United States both read near 1, and a
 * war scored on it called every invasion of a small state an even fight. This
 * reading leaves mass out, because the war counts the people actually in the
 * theater separately, and keeps what a person there brings: air cover, ships,
 * networks, satellites, training and readiness.
 */
export function combatQuality(stats: NationStats): number {
  const m = stats.military;
  const usable = (m.readiness + m.doctrineQuality) / 2;
  const b = m.branchStrength;
  return clamp01(usable * ((b.land + b.air + b.naval + b.cyber + b.space) / 5));
}

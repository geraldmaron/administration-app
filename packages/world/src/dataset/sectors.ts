import { ENERGY_MIX_SECTORS, SECTOR_IDS, type SectorId, type SectorMixEntry } from "../schemas/sector.js";

// Player-facing names for the closed 23. Tokens stay kebab-case ids.

export const SECTOR_LABELS: Readonly<Record<SectorId, string>> = {
  auto: "Auto",
  aerospace: "Aerospace",
  semiconductors: "Semiconductors",
  "steel-heavy": "Steel and heavy industry",
  "defense-industrial": "Defense industrial",
  "ports-shipping": "Ports and shipping",
  "telecom-cyber": "Telecom and cyber",
  finance: "Finance",
  "housing-construction": "Housing and construction",
  "public-infrastructure": "Public infrastructure",
  "energy-oil": "Oil",
  "energy-gas": "Gas",
  "energy-nuclear": "Nuclear",
  "energy-renewables": "Renewables",
  agriculture: "Agriculture",
  textiles: "Textiles",
  mining: "Mining",
  chemicals: "Chemicals",
  "food-processing": "Food processing",
  "tourism-hospitality": "Tourism and hospitality",
  healthcare: "Healthcare",
  pharma: "Pharma",
  utilities: "Utilities",
};

const TAILS: readonly SectorId[] = [
  "utilities",
  "healthcare",
  "public-infrastructure",
  "finance",
  "housing-construction",
];

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

/**
 * Build a mix that sums to 1 from what a nation actually exports and burns.
 * Featured sectors (topExports + extra) take the weight; energy.mix adds a
 * fuel slice; the remainder is thin tails so every nation can be hit on
 * utilities or healthcare without inventing a plant.
 */
export function fillSectorMix(
  featured: readonly SectorId[],
  energyMix: Readonly<Record<string, number>>,
  population: number,
  unemployment: number,
  extra: Partial<Record<SectorId, number>> = {},
): SectorMixEntry[] {
  const weights = new Map<SectorId, number>();
  const bump = (id: SectorId, amount: number) => weights.set(id, (weights.get(id) ?? 0) + amount);
  for (const id of featured) bump(id, 0.16);
  for (const [key, share] of Object.entries(energyMix)) {
    if ((ENERGY_MIX_SECTORS as readonly string[]).includes(key) && share > 0) bump(key as SectorId, share * 0.22);
  }
  for (const [id, amount] of Object.entries(extra) as [SectorId, number][]) {
    if (amount > 0) bump(id, amount);
  }

  let featuredSum = [...weights.values()].reduce((sum, value) => sum + value, 0);
  if (featuredSum > 0.82) {
    const scale = 0.82 / featuredSum;
    for (const [id, value] of weights) weights.set(id, value * scale);
    featuredSum = 0.82;
  }
  const remainder = 1 - featuredSum;
  const tails = TAILS.filter((id) => !weights.has(id) || (weights.get(id) ?? 0) < 0.02);
  const tailEach = tails.length > 0 ? remainder / tails.length : 0;
  for (const id of tails) bump(id, tailEach);

  const total = [...weights.values()].reduce((sum, value) => sum + value, 0) || 1;
  const labor = Math.max(1, Math.round(population * 0.48));
  const pressure = clamp01(unemployment * 1.35);
  const entries: SectorMixEntry[] = [];
  let mixLeft = 1;
  let jobsLeft = labor;
  const ordered = SECTOR_IDS.filter((id) => (weights.get(id) ?? 0) > 0);
  for (const [i, id] of ordered.entries()) {
    const raw = (weights.get(id) ?? 0) / total;
    const mix = i === ordered.length - 1 ? round4(mixLeft) : round4(raw);
    mixLeft = round4(mixLeft - mix);
    const employment = i === ordered.length - 1 ? jobsLeft : Math.round(labor * mix);
    jobsLeft -= employment;
    entries.push({
      sector: id,
      mix,
      employment: Math.max(0, employment),
      laborPressure: round4(clamp01(pressure + ((i % 5) - 2) * 0.02)),
    });
  }
  return entries;
}

function round4(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}

export const US_SECTOR_EXTRA: Partial<Record<SectorId, number>> = {
  auto: 0.08,
  aerospace: 0.06,
  semiconductors: 0.07,
  "defense-industrial": 0.05,
  finance: 0.08,
  healthcare: 0.07,
  "energy-oil": 0.05,
  agriculture: 0.04,
  "housing-construction": 0.05,
  "telecom-cyber": 0.04,
};

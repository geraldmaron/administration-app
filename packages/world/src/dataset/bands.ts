import type { Nation, NationArchetype, NationBands, NationStats } from "../schemas/nation.js";
import type { OrgId } from "../schemas/ids.js";
import { debtToGdp } from "./fiscal-identities.js";

// Bands are the targeting surface. Content is written against a band —
// "a volatile resource-exporter at military tier 2" — never against a nation
// id, which is what keeps content cost flat as the roster grows: nation 51
// lands in bands that already exist, so nothing has to be authored for it.
//
// Everything here is derived from stats, never hand-typed. A hand-authored
// band can disagree with the stats beside it; a derived one cannot.

export type BandInput = Pick<Nation, "stats" | "doctrine"> & { memberships: readonly OrgId[] };

const clampTier = (n: number): 1 | 2 | 3 | 4 | 5 =>
  Math.min(5, Math.max(1, Math.round(n))) as 1 | 2 | 3 | 4 | 5;

// A tier from ascending thresholds: the number of thresholds cleared, plus one.
const tierFrom = (value: number, thresholds: readonly number[]): 1 | 2 | 3 | 4 | 5 =>
  clampTier(1 + thresholds.filter((t) => value >= t).length);

const RATING_QUALITY: Record<NationStats["economy"]["sovereignRating"], number> = {
  AAA: 1,
  AA: 0.9,
  A: 0.78,
  BBB: 0.62,
  BB: 0.45,
  B: 0.3,
  CCC: 0.15,
  D: 0,
};

// Raw military weight. Budget and headcount say how much force exists;
// readiness and doctrine quality say how much of it is usable; lift, bases,
// and warheads say how far it reaches. A large unready conscript army and a
// small expeditionary one should not land in the same tier.
export function militaryScore(stats: NationStats): number {
  const m = stats.military;
  const mass = Math.log10(m.budget + 1) / 6 + Math.log10(m.activeHeadcount + m.reserveHeadcount * 0.3 + 1) / 7;
  const usable = (m.readiness + m.doctrineQuality) / 2;
  const branches = Object.values(m.branchStrength).reduce((a, b) => a + b, 0) / 5;
  const reach = (m.airliftCapacity + m.sealiftCapacity) / 2 + Math.min(1, m.basesAbroad / 30) * 0.5;
  const strategic = (m.arsenal.warheads > 0 ? 0.25 : 0) + (m.arsenal.deliveryTriad ? 0.2 : 0);
  return mass * usable * 1.6 + branches * 0.5 + reach * 0.5 + strategic;
}

export function militaryTier(stats: NationStats): NationBands["militaryTier"] {
  return tierFrom(militaryScore(stats), [0.7, 1.3, 1.9, 2.6]);
}

// Wealth is per capita, not aggregate — a populous poor country is a large
// power and a poor one at the same time, and the two bands have to be able to
// disagree. Debt service and rating discount it: paper income a state cannot
// borrow against does not buy options.
export function wealthTier(stats: NationStats): NationBands["wealthTier"] {
  const e = stats.economy;
  // The debt burden is read through the derived identity rather than off a
  // stored ratio: the stock and its denominator are the facts, and the ratio
  // is what falls out of them.
  const burden = debtToGdp(stats);
  const solvency = RATING_QUALITY[e.sovereignRating] * (1 - Math.min(0.35, Math.max(0, burden - 1) * 0.15));
  const reserveCushion = Math.min(0.15, e.reserves / Math.max(1, e.gdp) / 2);
  const effective = e.gdpPerCapita * (0.7 + solvency * 0.3 + reserveCushion);
  return tierFrom(effective, [3_000, 12_000, 28_000, 50_000]);
}

// Aggregate weight in the world: economic size first, then force, then the
// reach to use either. Population is a floor on relevance rather than a
// driver — a large population with nothing behind it is not a power.
export function powerScore(stats: NationStats): number {
  const economic = Math.log10(stats.economy.gdp + 1) / 7.5;
  const force = militaryScore(stats) / 2.4;
  const reach = (stats.softPower.diplomaticReach + stats.softPower.culturalReach) / 2;
  const aidLeverage = Math.min(0.5, stats.softPower.aidGiven / Math.max(1, stats.economy.gdp) * 200);
  const mass = Math.min(1, Math.log10(stats.demography.population + 1) / 9.3);
  return economic * 0.34 + force * 0.32 + reach * 0.2 + aidLeverage * 0.04 + mass * 0.1;
}

export function powerTier(stats: NationStats): NationBands["powerTier"] {
  return tierFrom(powerScore(stats), [0.5, 0.63, 0.75, 0.93]);
}

// Whether the state's writ actually runs, which is the question every band
// consumer is really asking — "could an armed group hold hostages here", not
// "is the politics loud".
//
// The previous formulation subtracted a weighted mean of factionalism,
// protest, insurgency, crime and corruption from a legitimacy term. Factional
// and protest pressure entered at full weight beside insurgency, so an
// ordinary polarized democracy was scored like a state losing provinces: the
// United States, the United Kingdom and France all landed in `fragile`, and
// 28 of the 50 nations then on the roster came out volatile or worse. Content targets these bands,
// so that mis-rating staged a hostage scenario in the American interior.
//
// Three separable things, combined so that failing any one of them pulls the
// whole score down rather than being averaged away:
//
//   holding  — who accepts the government at all
//   writ     — whether it controls its own ground, insurgency first
//   friction — the drag of loud politics, graft, and economic pain
//
// Multiplicative, not subtractive. Subtracting the three saturates at zero for
// a dozen nations at once, throwing away all resolution across the bottom of
// the distribution — Brazil and Yemen would score identically.
export function stabilityScore(stats: NationStats): number {
  const p = stats.politics;
  const s = stats.security;
  const holding = (p.regimeStability * 1.3 + p.legitimacy) / 2.3;
  // Insurgency scales the whole of the state's reach rather than being
  // subtracted from it: a capable security apparatus that does not hold the
  // country is not a partially capable one.
  const writ = clamp01(((s.borderControl + s.counterIntel) / 2) * (1 - s.insurgencyPressure) - s.crimeIndex * 0.15);
  // Economic pain destabilizes, but only past the point where it is unusual:
  // ordinary inflation and ordinary unemployment are not a legitimacy crisis.
  const strain =
    Math.min(0.12, Math.max(0, stats.economy.inflation - 0.08) * 0.6) +
    Math.min(0.1, Math.max(0, stats.economy.unemployment - 0.08) * 0.5);
  // Contention is discounted an order of magnitude below insurgency on
  // purpose. A country arguing with itself in public is doing politics.
  const friction = clamp01(1 - ((p.factionalism + p.protestPressure) / 2) * 0.18 - s.corruptionIndex * 0.22 - strain);
  return clamp01(Math.pow(holding, 0.6) * Math.pow(writ, 0.4) * friction);
}

export function stabilityBand(stats: NationStats): NationBands["stabilityBand"] {
  const score = stabilityScore(stats);
  // Cut so the names mean what they say: `stable` is a state whose writ runs,
  // `fragile` one under real strain that still governs, `volatile` one where
  // control is contested, `collapsing` one that has lost it. Set against the 61
  // authored records (15/17/9/9 across them); across all 196 governments the
  // same cuts give 33/88/55/20, the small and poorly governed states the
  // roster added falling mostly in the middle two.
  if (score >= 0.56) return "stable";
  if (score >= 0.34) return "fragile";
  if (score >= 0.21) return "volatile";
  return "collapsing";
}

// The blocs the world is actually organized around. Alignment is measured
// against these rather than against the player: at dataset time there is no
// player yet, and a nation's standing orientation exists regardless.
const ALIGNED_ORGS = new Set(["ORG-NATO", "ORG-EU", "ORG-CPTPP"]);
const OPPOSED_ORGS = new Set(["ORG-CSTO", "ORG-BRICS"]);
const ALIGNED_POLES = new Set(["USA", "GBR", "FRA", "DEU", "JPN"]);
const OPPOSED_POLES = new Set(["RUS", "CHN", "IRN", "PRK"]);

export function alignmentBand(input: BandInput): NationBands["alignmentBand"] {
  let lean = 0;
  for (const org of input.memberships) {
    if (ALIGNED_ORGS.has(org as string)) lean += 1;
    if (OPPOSED_ORGS.has(org as string)) lean -= 1;
  }
  // Declared pull is weaker evidence than a signed membership, but it is what
  // distinguishes a leaning unaligned state from a genuinely neutral one.
  for (const pull of input.doctrine.alignmentPull) {
    if (ALIGNED_POLES.has(pull as string)) lean += 0.5;
    if (OPPOSED_POLES.has(pull as string)) lean -= 0.5;
  }
  if (lean >= 1.5) return "aligned";
  if (lean >= 0.5) return "leaning-aligned";
  if (lean <= -1.5) return "opposed";
  if (lean <= -0.5) return "leaning-opposed";
  return "neutral";
}

const totalTradeDependence = (stats: NationStats): number =>
  Object.values(stats.trade.tradeDependence).reduce((a, b) => a + b, 0);

// Archetype is the coarsest handle content reaches for, so it is decided last
// and by exception: the specific shapes claim a nation first, and the power
// tiers only catch what is left.
export function archetype(input: BandInput): NationArchetype {
  const { stats } = input;
  const power = powerTier(stats);
  const stability = stabilityBand(stats);
  const tradeIntensity = (stats.trade.exports + stats.trade.imports) / Math.max(1, stats.economy.gdp);
  const energySurplus = stats.energy.production / Math.max(1, stats.energy.consumption);
  const reach = stats.softPower.diplomaticReach;

  if (stats.demography.population < 2_000_000) return "microstate";
  if (stability === "collapsing" || (stats.security.insurgencyPressure > 0.5 && stability === "volatile")) {
    return "post-conflict";
  }
  // A hub's trade dwarfs its own economy because most of it is passing
  // through, which is a different thing from simply exporting a lot.
  if (tradeIntensity > 1.1 && stats.demography.urbanization > 0.7) return "trading-hub";
  if (energySurplus > 1.4 && stats.energy.production > 0) return "resource-exporter";
  if (reach < 0.3 && totalTradeDependence(stats) < 0.4) return "isolationist";
  // Dependence concentrated on few partners, with little weight of its own,
  // is what being somebody's client actually looks like. Wealth is the guard:
  // a rich small state buys its way out of that relationship, so being small
  // and trade-exposed is not on its own enough.
  if (power <= 2 && totalTradeDependence(stats) > 0.6 && wealthTier(stats) <= 3) return "client-state";
  if (power >= 5) return "great-power";
  if (stats.economy.growth > 0.045 && power >= 3) return "rising-power";
  if (power === 4) return "regional-power";
  if (power === 3) return "middle-power";
  // What is left is small. Poor and small is a client in all but name; small
  // and comfortable is simply a minor power that nobody has to court.
  return wealthTier(stats) <= 2 ? "client-state" : "middle-power";
}

// Computed military capability metrics derived from base stats.
// forceIndex: composite of usable force, branches, reach, and strategic assets.
// mobilizationCap: how quickly and how far the nation can expand its military.
// sustainability.warDuration: how long the nation can sustain a major conflict.
// sustainability.industrialMobilization: ability to shift economy to wartime production.
// downtime: recovery time after a conflict, inversely related to readiness and doctrine.
export function computeMilitaryMetrics(stats: NationStats): {
  readonly forceIndex: number;
  readonly mobilizationCap: number;
  readonly sustainability: { readonly warDuration: number; readonly industrialMobilization: number };
  readonly downtime: number;
} {
  const m = stats.military;
  const usable = (m.readiness + m.doctrineQuality) / 2;
  const branches = Object.values(m.branchStrength).reduce((a, b) => a + b, 0) / 5;
  const reach = (m.airliftCapacity + m.sealiftCapacity) / 2 + Math.min(1, m.basesAbroad / 30) * 0.5;
  const strategic = (m.arsenal.warheads > 0 ? 0.25 : 0) + (m.arsenal.deliveryTriad ? 0.2 : 0);
  const forceIndex = clamp01(massScore(stats) * usable * 1.6 + branches * 0.5 + reach * 0.5 + strategic);

  const massFactor = Math.log10(m.budget + 1) / 6 + Math.log10(m.activeHeadcount + m.reserveHeadcount * 0.3 + 1) / 7;
  const mobilizationCap = clamp01(massFactor * (m.readiness + m.doctrineQuality) / 2 + branches * 0.3);

  const warDuration = clamp01(
    (m.budget / Math.max(1, stats.economy.gdp)) * 0.4 +
      usable * 0.3 +
      (m.activeHeadcount / Math.max(1, stats.demography.population)) * 0.3,
  );
  const industrialMobilization = clamp01(
    (stats.economy.gdp / Math.max(1, stats.economy.gdpPerCapita)) / 1000 +
      (m.readiness + m.doctrineQuality) / 4,
  );
  const downtime = clamp01(1 - (m.readiness * 0.5 + m.doctrineQuality * 0.3 + usable * 0.2));

  return { forceIndex, mobilizationCap, sustainability: { warDuration, industrialMobilization }, downtime };
}

function massScore(stats: NationStats): number {
  const m = stats.military;
  return Math.log10(m.budget + 1) / 6 + Math.log10(m.activeHeadcount + m.reserveHeadcount * 0.3 + 1) / 7;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function deriveBands(input: BandInput): NationBands {
  const militaryMetrics = computeMilitaryMetrics(input.stats);
  return {
    archetype: archetype(input),
    powerTier: powerTier(input.stats),
    wealthTier: wealthTier(input.stats),
    alignmentBand: alignmentBand(input),
    stabilityBand: stabilityBand(input.stats),
    militaryTier: militaryTier(input.stats),
    militaryMetrics: militaryMetrics,
  };
}

export function applyBands(nations: readonly Omit<Nation, "bands">[]): Nation[] {
  return nations.map((nation) => ({ ...nation, bands: deriveBands(nation) }));
}

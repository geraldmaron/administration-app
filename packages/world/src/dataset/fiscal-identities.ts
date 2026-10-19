import type { NationStats } from "../schemas/nation.js";

// The fiscal identities the dataset derives rather than stores.
//
// Debt is held as a nominal stock in USD millions because a stored ratio is
// two facts — a debt and a denominator — collapsed into one number that can
// disagree with both of them. That is the defect `bands`, `memberships` and
// `State.population` are all derived to avoid, and it is why the ratio lives
// here as a function of the stock instead of beside it as a second field.
//
// Deflating by `costOfLiving` is what makes inflation erode the real weight of
// the debt without a term for it: the stock is nominal, output is real, so a
// rising price level lowers the ratio on its own arithmetic.
export function debtToGdp(stats: NationStats): number {
  return stats.economy.debt / Math.max(1, stats.economy.gdp * stats.economy.costOfLiving);
}

// What each nation's retired `economy.debtToGdp` field held before the stock
// replaced it. Kept so the migration can be checked rather than asserted: the
// dataset validator recomputes the ratio from the stock and fails if it does
// not land back on the figure that was authored here. It is a one-shot record
// of a conversion, not a live input — nothing reads it but the check.
export const RETIRED_DEBT_TO_GDP: Readonly<Record<string, number>> = {
  // Converted twice: the retired 1.2 was gross debt, and the stock was re-based
  // to debt held by the public, CBO's 1.01 of output.
  USA: 1.01,
  CHN: 0.77,
  DEU: 0.66,
  NGA: 0.4,
  POL: 0.5,
  SAU: 0.25,
  SGP: 1.3,
  IRQ: 0.45,
  PRK: 0.2,
  BLR: 0.4,
  VNM: 0.37,
  ISL: 0.6,
  BRA: 0.85,
  COL: 0.55,
  VEN: 0.3,
  CUB: 0.35,
  CAN: 0.68,
  MEX: 0.48,
  IND: 0.82,
  PAK: 0.75,
  BGD: 0.39,
  AFG: 0.07,
  KAZ: 0.22,
  IRN: 0.3,
  ISR: 0.62,
  ARE: 0.3,
  TUR: 0.32,
  YEM: 0.8,
  SYR: 0.5,
  EGY: 0.95,
  ZAF: 0.74,
  ETH: 0.38,
  COD: 0.16,
  RWA: 0.6,
  MAR: 0.69,
  DZA: 0.5,
  GBR: 1,
  FRA: 1.1,
  ITA: 1.4,
  ESP: 1.1,
  UKR: 0.9,
  RUS: 0.17,
  SWE: 0.32,
  CHE: 0.38,
  HUN: 0.74,
  JPN: 2.5,
  KOR: 0.54,
  TWN: 0.28,
  AUS: 0.5,
  IDN: 0.39,
  NLD: 0.44,
  THA: 0.62,
  PHL: 0.57,
  BEL: 1.05,
  ARG: 0.85,
  NOR: 0.44,
  MYS: 0.65,
  QAT: 0.42,
  IRL: 0.42,
  DNK: 0.3,
  CHL: 0.4,
};

import type { StateId } from "../schemas/state.js";

// Resident population and gross state product for the 51 state rows, in
// STATE_IDS order. `population` is a head count; `grp` is gross state product
// in USD millions, the unit every money field in this dataset uses.
//
// Provenance ("a number can be checked, not trusted"): every figure below is
// approximate, order-of-magnitude-correct public data (US Census Bureau
// Vintage 2023 state population estimates as of July 1, 2023; Bureau of
// Economic Analysis GDP by State, current-dollar 2023), hand-rounded for the
// dataset's units. Treat every value as "plausible for game balance", not as
// a cited figure for any use outside this game: the BEA state series is
// revised on its own schedule and sums to a national total that moves between
// vintages, so the `grp` column here is the published state shares rescaled
// onto this dataset's national GDP rather than the raw releases copied over.
// That rescale is why an individual state's `grp` sits about two percent
// below the BEA print beside it — the relative weights are the real ones.
//
// Both columns are closed against the USA record in nations.ts on purpose:
// the 51 populations sum to exactly `stats.demography.population`
// (334,892,847) and the 51 `grp` values sum to exactly `stats.economy.gdp`
// (27,498,847 USD millions). Rounding never lands on either total on its own,
// so in both columns the residual is folded into California, the largest
// state on each measure: its population carries a -22,048 adjustment and its
// `grp` a -2,395 one. No other row is adjusted, and California stays well
// inside its real order of magnitude on both.

export const STATE_FIGURES: Readonly<Record<StateId, { population: number; grp: number }>> = {
  AL: { population: 5_108_468, grp: 295_000 }, // Alabama
  AK: { population: 733_406, grp: 67_000 }, // Alaska
  AZ: { population: 7_431_344, grp: 497_000 }, // Arizona
  AR: { population: 3_067_732, grp: 171_000 }, // Arkansas
  CA: { population: 38_943_145, grp: 3_900_847 }, // California
  CO: { population: 5_877_610, grp: 515_000 }, // Colorado
  CT: { population: 3_617_176, grp: 343_000 }, // Connecticut
  DE: { population: 1_031_890, grp: 94_000 }, // Delaware
  DC: { population: 678_972, grp: 164_000 }, // District of Columbia
  FL: { population: 22_610_726, grp: 1_612_000 }, // Florida
  GA: { population: 11_029_227, grp: 813_000 }, // Georgia
  HI: { population: 1_435_138, grp: 106_000 }, // Hawaii
  ID: { population: 1_964_726, grp: 116_000 }, // Idaho
  IL: { population: 12_549_689, grp: 1_054_000 }, // Illinois
  IN: { population: 6_862_199, grp: 485_000 }, // Indiana
  IA: { population: 3_207_004, grp: 254_000 }, // Iowa
  KS: { population: 2_940_546, grp: 227_000 }, // Kansas
  KY: { population: 4_526_154, grp: 273_000 }, // Kentucky
  LA: { population: 4_573_749, grp: 309_000 }, // Louisiana
  ME: { population: 1_395_722, grp: 87_000 }, // Maine
  MD: { population: 6_180_253, grp: 501_000 }, // Maryland
  MA: { population: 7_001_399, grp: 715_000 }, // Massachusetts
  MI: { population: 10_037_261, grp: 650_000 }, // Michigan
  MN: { population: 5_737_915, grp: 485_000 }, // Minnesota
  MS: { population: 2_939_690, grp: 149_000 }, // Mississippi
  MO: { population: 6_196_156, grp: 430_000 }, // Missouri
  MT: { population: 1_132_812, grp: 70_000 }, // Montana
  NE: { population: 1_978_379, grp: 174_000 }, // Nebraska
  NV: { population: 3_194_176, grp: 253_000 }, // Nevada
  NH: { population: 1_402_054, grp: 114_000 }, // New Hampshire
  NJ: { population: 9_290_841, grp: 798_000 }, // New Jersey
  NM: { population: 2_114_371, grp: 134_000 }, // New Mexico
  NY: { population: 19_571_216, grp: 2_236_000 }, // New York
  NC: { population: 10_835_491, grp: 785_000 }, // North Carolina
  ND: { population: 783_926, grp: 74_000 }, // North Dakota
  OH: { population: 11_785_935, grp: 878_000 }, // Ohio
  OK: { population: 4_053_824, grp: 255_000 }, // Oklahoma
  OR: { population: 4_233_358, grp: 308_000 }, // Oregon
  PA: { population: 12_961_683, grp: 986_000 }, // Pennsylvania
  RI: { population: 1_095_962, grp: 76_000 }, // Rhode Island
  SC: { population: 5_373_555, grp: 329_000 }, // South Carolina
  SD: { population: 919_318, grp: 72_000 }, // South Dakota
  TN: { population: 7_126_489, grp: 532_000 }, // Tennessee
  TX: { population: 30_503_301, grp: 2_608_000 }, // Texas
  UT: { population: 3_417_734, grp: 285_000 }, // Utah
  VT: { population: 647_464, grp: 43_000 }, // Vermont
  VA: { population: 8_715_698, grp: 732_000 }, // Virginia
  WA: { population: 7_812_880, grp: 860_000 }, // Washington
  WV: { population: 1_770_071, grp: 98_000 }, // West Virginia
  WI: { population: 5_910_955, grp: 440_000 }, // Wisconsin
  WY: { population: 584_057, grp: 46_000 }, // Wyoming
};

// Computed sums, checked against the USA record in nations.ts:
//   population: 334_892_847 === usNation.stats.demography.population — exact.
//   grp:         27_498_847 === usNation.stats.economy.gdp — exact.

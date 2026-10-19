import type { StateId } from "../schemas/state.js";
import type { StateVitalAnchor } from "../schemas/state.js";

// Where each state rests relative to the country on unemployment, crime and
// prices. Three deviations, never absolutes: a state's reading is the national
// figure plus its anchor, so the two levels cannot drift apart and no pass has
// to reconcile 153 numbers against the country every turn.
//
// In its own table for the reason `state-figures.ts` is: these are columns a
// vintage refresh re-bases together, and a refresh should be one file's diff
// rather than 51 edits threaded through the cohort mixes beside them.
//
// Provenance ("a number can be checked, not trusted"): `unemployment` is the
// state's own rate less the national rate (Bureau of Labor Statistics state
// unemployment, 2024 annual averages, in fractions — so -0.01 is one point
// below the country). `crimeIndex` is the state's violent-crime rate read
// against the national rate and rescaled onto the 0..1 index the nation
// carries (FBI Uniform Crime Reporting, 2023). `costOfLiving` is the Bureau of
// Economic Analysis regional price parity less 100, in index points. Every
// figure is approximate and hand-rounded for game balance, not a cited
// statistic.
//
// **Each column is population-weighted centered on zero**, which is why an
// individual figure sits a little off the published gap it came from: the
// residual of centering is spread across every row rather than dumped on one.
// Centering is what stops 153 hand-authored numbers from silently re-baselining
// the whole country, and `state-vital-anchor-centers` in the dataset validator
// holds the three weighted means to 0 ± 0.005.

export const STATE_VITAL_ANCHORS: Readonly<Record<StateId, StateVitalAnchor>> = {
  AL: { unemployment: -0.01, crimeIndex: 0.083, costOfLiving: -0.115 }, // Alabama
  AK: { unemployment: 0.009, crimeIndex: 0.213, costOfLiving: 0.065 }, // Alaska
  AZ: { unemployment: -0.001, crimeIndex: 0.033, costOfLiving: -0.015 }, // Arizona
  AR: { unemployment: -0.004, crimeIndex: 0.133, costOfLiving: -0.125 }, // Arkansas
  CA: { unemployment: 0.013, crimeIndex: 0.043, costOfLiving: 0.135 }, // California
  CO: { unemployment: -0.005, crimeIndex: 0.033, costOfLiving: 0.035 }, // Colorado
  CT: { unemployment: -0.001, crimeIndex: -0.107, costOfLiving: 0.055 }, // Connecticut
  DE: { unemployment: -0.001, crimeIndex: 0.043, costOfLiving: 0.005 }, // Delaware
  DC: { unemployment: 0.015, crimeIndex: 0.293, costOfLiving: 0.135 }, // District of Columbia
  FL: { unemployment: -0.007, crimeIndex: -0.037, costOfLiving: 0.005 }, // Florida
  GA: { unemployment: -0.005, crimeIndex: 0.023, costOfLiving: -0.065 }, // Georgia
  HI: { unemployment: -0.009, crimeIndex: -0.087, costOfLiving: 0.125 }, // Hawaii
  ID: { unemployment: -0.007, crimeIndex: -0.147, costOfLiving: -0.055 }, // Idaho
  IL: { unemployment: 0.009, crimeIndex: 0.013, costOfLiving: 0.015 }, // Illinois
  IN: { unemployment: -0.005, crimeIndex: -0.007, costOfLiving: -0.085 }, // Indiana
  IA: { unemployment: -0.01, crimeIndex: -0.097, costOfLiving: -0.085 }, // Iowa
  KS: { unemployment: -0.008, crimeIndex: -0.007, costOfLiving: -0.095 }, // Kansas
  KY: { unemployment: 0.007, crimeIndex: -0.027, costOfLiving: -0.105 }, // Kentucky
  LA: { unemployment: 0.004, crimeIndex: 0.193, costOfLiving: -0.085 }, // Louisiana
  ME: { unemployment: -0.009, crimeIndex: -0.167, costOfLiving: -0.015 }, // Maine
  MD: { unemployment: -0.011, crimeIndex: 0.063, costOfLiving: 0.065 }, // Maryland
  MA: { unemployment: -0.002, crimeIndex: -0.097, costOfLiving: 0.085 }, // Massachusetts
  MI: { unemployment: 0.005, crimeIndex: 0.063, costOfLiving: -0.065 }, // Michigan
  MN: { unemployment: -0.01, crimeIndex: -0.057, costOfLiving: -0.015 }, // Minnesota
  MS: { unemployment: 0, crimeIndex: 0.053, costOfLiving: -0.125 }, // Mississippi
  MO: { unemployment: -0.007, crimeIndex: 0.093, costOfLiving: -0.085 }, // Missouri
  MT: { unemployment: -0.01, crimeIndex: 0.043, costOfLiving: -0.045 }, // Montana
  NE: { unemployment: -0.014, crimeIndex: -0.057, costOfLiving: -0.085 }, // Nebraska
  NV: { unemployment: 0.015, crimeIndex: 0.103, costOfLiving: -0.015 }, // Nevada
  NH: { unemployment: -0.013, crimeIndex: -0.187, costOfLiving: 0.025 }, // New Hampshire
  NJ: { unemployment: 0.007, crimeIndex: -0.127, costOfLiving: 0.085 }, // New Jersey
  NM: { unemployment: 0.004, crimeIndex: 0.243, costOfLiving: -0.065 }, // New Mexico
  NY: { unemployment: 0.005, crimeIndex: -0.057, costOfLiving: 0.115 }, // New York
  NC: { unemployment: -0.004, crimeIndex: 0.013, costOfLiving: -0.065 }, // North Carolina
  ND: { unemployment: -0.014, crimeIndex: -0.047, costOfLiving: -0.075 }, // North Dakota
  OH: { unemployment: 0.002, crimeIndex: -0.017, costOfLiving: -0.085 }, // Ohio
  OK: { unemployment: -0.005, crimeIndex: 0.063, costOfLiving: -0.105 }, // Oklahoma
  OR: { unemployment: 0.004, crimeIndex: -0.007, costOfLiving: 0.025 }, // Oregon
  PA: { unemployment: 0, crimeIndex: -0.027, costOfLiving: -0.015 }, // Pennsylvania
  RI: { unemployment: -0.004, crimeIndex: -0.117, costOfLiving: 0.025 }, // Rhode Island
  SC: { unemployment: -0.005, crimeIndex: 0.083, costOfLiving: -0.075 }, // South Carolina
  SD: { unemployment: -0.018, crimeIndex: 0.033, costOfLiving: -0.095 }, // South Dakota
  TN: { unemployment: -0.004, crimeIndex: 0.133, costOfLiving: -0.075 }, // Tennessee
  TX: { unemployment: 0.002, crimeIndex: 0.003, costOfLiving: -0.035 }, // Texas
  UT: { unemployment: -0.012, crimeIndex: -0.137, costOfLiving: -0.025 }, // Utah
  VT: { unemployment: -0.017, crimeIndex: -0.187, costOfLiving: 0.005 }, // Vermont
  VA: { unemployment: -0.01, crimeIndex: -0.097, costOfLiving: 0.025 }, // Virginia
  WA: { unemployment: 0.007, crimeIndex: -0.027, costOfLiving: 0.075 }, // Washington
  WV: { unemployment: -0.001, crimeIndex: -0.067, costOfLiving: -0.105 }, // West Virginia
  WI: { unemployment: -0.01, crimeIndex: -0.087, costOfLiving: -0.065 }, // Wisconsin
  WY: { unemployment: -0.01, crimeIndex: -0.097, costOfLiving: -0.065 }, // Wyoming
};


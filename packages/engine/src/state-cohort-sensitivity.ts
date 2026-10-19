import type { CohortId } from "@admin/world";

// How much each group's partisanship follows the state it lives in, beyond what
// the average voter's does. Fitted, not authored by hand.
//
// source: Cooperative Election Study (CES) Common Content, 2020 (Harvard
//   Dataverse doi:10.7910/DVN/E9N6PH, file CES20_Common_OUTPUT_vv.csv, version 4)
//   and 2024 (doi:10.7910/DVN/X11EP6, file CCES24_Common_OUTPUT_vv_topost_final.csv,
//   version 9). Downloaded 2026-10-11 from
//   https://dataverse.harvard.edu/api/access/datafile/4949558 and .../12050325.
// sample: respondents with a validated general-election vote record
//   (CL_2020gvm 1-5; TS_g2024 1-6) who reported a two-party presidential vote
//   (CC20_410 / CC24_410 = 1 or 2), weighted by vvweight_post. 2020: 43,890
//   two-party voters before validation; 2024: 42,028.
// method: for each group, a binomial regression of the group's two-party share
//   in each state-year on the logit of that state-year's two-party share in the
//   same survey (cell trials are Kish effective sizes; 102 state-years; cells
//   under 5 respondents dropped). beta is the slope minus one: zero means the
//   group follows its state exactly as the state's own voters do on average,
//   negative means its politics vary less from state to state, positive more.
//   se is a state-cluster bootstrap (300 resamples of states, both years kept
//   together, fixed seed 20261011). Rounded to three decimals.
// groups: age from birth year; household income under $40,000 is struggling,
//   $150,000 and up affluent (faminc_new); degree is a four-year degree or more;
//   place is urbancity (town and rural area together are rural); work is the
//   respondent's industry when employed or looking (goods: agriculture through
//   manufacturing; frontline: trade, transportation, health care, hospitality,
//   other services, and in 2020 administrative support and waste services;
//   professional: information, finance, real estate, professional and business
//   services, education; public: government and anyone serving now), otherwise
//   outside the workforce; race is Hispanic of
//   any race, then single race; foreign-born is an immigrant to the USA (immstat
//   1 or 2); veteran is "I served previously" (milstat_3).
// limits: the CES asks no disability question, so with-disability is fitted on
//   respondents who describe themselves as permanently disabled for work (employ
//   6), a narrower group than the Census measure the states' shares come from.
//   Asian, Black, Hispanic and foreign-born estimates rest on fewer state-years
//   (49 to 83) and carry the widest errors. Only differences within an axis
//   change a reading: a shift shared by every group of an axis is absorbed by the
//   state intercept when the table is raked. The fitting script is
//   docs/audits/2026-10-11-simulation-depth/state-cohort-sensitivity-fit.py.
//
// A derived figure (DECISIONS 4.11): a screen built on it says it is an estimate.

export type CohortSensitivityEstimate = {
  /** Slope of the group's log-odds on its state's, minus one. */
  readonly beta: number;
  /** Bootstrap standard error of beta, clustered by state. */
  readonly se: number;
  /** State-years with at least five of the group's voters. */
  readonly stateYears: number;
  /** The group's validated two-party voters across both surveys. */
  readonly voters: number;
};

// prettier-ignore
export const STATE_COHORT_SENSITIVITY: Readonly<Record<CohortId, CohortSensitivityEstimate>> = {
  "age-under-35": { beta: -0.159, se: 0.105, stateYears: 100, voters: 7123 },
  "age-35-64": { beta: -0.007, se: 0.032, stateYears: 102, voters: 36472 },
  "age-65-plus": { beta: 0.029, se: 0.064, stateYears: 102, voters: 22648 },
  "income-struggling": { beta: -0.102, se: 0.055, stateYears: 102, voters: 16617 },
  "income-comfortable": { beta: 0.029, se: 0.034, stateYears: 102, voters: 36362 },
  "income-affluent": { beta: 0.137, se: 0.124, stateYears: 99, voters: 7140 },
  "no-degree": { beta: -0.123, se: 0.042, stateYears: 102, voters: 36875 },
  degree: { beta: 0.105, se: 0.069, stateYears: 102, voters: 29368 },
  urban: { beta: -0.081, se: 0.121, stateYears: 101, voters: 15478 },
  suburban: { beta: -0.161, se: 0.077, stateYears: 100, voters: 27608 },
  rural: { beta: -0.087, se: 0.075, stateYears: 100, voters: 22854 },
  "goods-producing": { beta: -0.059, se: 0.12, stateYears: 95, voters: 4003 },
  "frontline-services": { beta: 0.019, se: 0.054, stateYears: 102, voters: 15879 },
  "professional-technical": { beta: -0.076, se: 0.078, stateYears: 102, voters: 11130 },
  "public-and-uniformed": { beta: -0.12, se: 0.161, stateYears: 93, voters: 2198 },
  "not-in-the-workforce": { beta: -0.003, se: 0.033, stateYears: 102, voters: 32795 },
  "race-hispanic": { beta: -0.04, se: 0.204, stateYears: 83, voters: 5047 },
  "race-black": { beta: -0.604, se: 0.257, stateYears: 77, voters: 5427 },
  "race-asian": { beta: -0.561, se: 0.366, stateYears: 49, voters: 1342 },
  "race-white": { beta: 0.056, se: 0.061, stateYears: 102, voters: 51753 },
  "race-other": { beta: 0.056, se: 0.113, stateYears: 89, voters: 2674 },
  "sex-female": { beta: 0.026, se: 0.029, stateYears: 102, voters: 35427 },
  "sex-male": { beta: -0.008, se: 0.031, stateYears: 102, voters: 30647 },
  "foreign-born": { beta: -0.309, se: 0.188, stateYears: 74, voters: 2705 },
  "us-born": { beta: 0.008, se: 0.011, stateYears: 102, voters: 63464 },
  "with-disability": { beta: 0.196, se: 0.115, stateYears: 91, voters: 4550 },
  "no-disability": { beta: -0.005, se: 0.01, stateYears: 102, voters: 61664 },
  veteran: { beta: -0.235, se: 0.076, stateYears: 101, voters: 8638 },
  "non-veteran": { beta: 0.007, se: 0.012, stateYears: 102, voters: 57605 },
};

// Where each group starts: its two-party presidential vote, measured, not
// inferred from who its members are (DECISIONS 5.8, "Partisan baseline").
//
// source: the same CES 2020 and 2024 files, sample and weights as the
//   sensitivities above, the same group definitions, both years pooled (each
//   respondent at its own year's vvweight_post). republican is the group's
//   weighted Republican share of its two-party presidential vote. se is the
//   state-cluster bootstrap error of that share from the same 300 resamples;
//   because a resample also changes which states are in the country, it
//   carries the national swing between samples as well as sampling noise, and
//   is wider than the error on a group's position relative to the others.
//   Rounded to three decimals.
// limits: pooling 2020 (a Democratic win) and 2024 (a Republican one) puts the
//   country near even; only the differences between groups move a reading,
//   because the engine calibrates every axis back onto its own mean.

export type CohortBaselineEstimate = {
  /** The group's Republican share of its two-party presidential vote. */
  readonly republican: number;
  /** Bootstrap standard error of that share, clustered by state. */
  readonly se: number;
};

// prettier-ignore
export const COHORT_PARTISAN_BASELINE: Readonly<Record<CohortId, CohortBaselineEstimate>> = {
  "age-under-35": { republican: 0.348, se: 0.015 },
  "age-35-64": { republican: 0.505, se: 0.018 },
  "age-65-plus": { republican: 0.574, se: 0.017 },
  "income-struggling": { republican: 0.464, se: 0.016 },
  "income-comfortable": { republican: 0.509, se: 0.018 },
  "income-affluent": { republican: 0.428, se: 0.023 },
  "no-degree": { republican: 0.547, se: 0.015 },
  degree: { republican: 0.415, se: 0.021 },
  urban: { republican: 0.349, se: 0.018 },
  suburban: { republican: 0.473, se: 0.017 },
  rural: { republican: 0.616, se: 0.015 },
  "goods-producing": { republican: 0.628, se: 0.02 },
  "frontline-services": { republican: 0.46, se: 0.018 },
  "professional-technical": { republican: 0.405, se: 0.018 },
  "public-and-uniformed": { republican: 0.441, se: 0.025 },
  "not-in-the-workforce": { republican: 0.526, se: 0.017 },
  "race-hispanic": { republican: 0.381, se: 0.02 },
  "race-black": { republican: 0.129, se: 0.01 },
  "race-asian": { republican: 0.315, se: 0.024 },
  "race-white": { republican: 0.569, se: 0.018 },
  "race-other": { republican: 0.537, se: 0.028 },
  "sex-female": { republican: 0.457, se: 0.019 },
  "sex-male": { republican: 0.538, se: 0.016 },
  "foreign-born": { republican: 0.41, se: 0.028 },
  "us-born": { republican: 0.497, se: 0.017 },
  "with-disability": { republican: 0.499, se: 0.022 },
  "no-disability": { republican: 0.493, se: 0.017 },
  veteran: { republican: 0.672, se: 0.012 },
  "non-veteran": { republican: 0.471, se: 0.017 },
};

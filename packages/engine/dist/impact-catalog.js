/**
 * Provisional, because the exposures are country proxies rather than site
 * assessments and only the natural-hazard rows are fitted. What is fitted: each
 * natural hazard's mean deaths and mean loss per significant event, against the
 * costliest four in ten of NOAA's billion-dollar events of that type, 2005 to
 * 2024. What is not: earthquakes (NOAA excludes them and no comparable series
 * was opened), the outbreak, cyber and industrial rows, and strikes.
 */
export const IMPACT_CALIBRATION = {
    status: "provisional",
    basis: "Natural-hazard deaths and losses per event fitted to NOAA NCEI billion-dollar disasters, 2005-2024; other mechanisms are gameplay judgments pending a comparable series.",
    sourceRefs: [
        "NOAA NCEI, U.S. Billion-Dollar Weather and Climate Disasters, events-US-1980-2024.csv (opened 2026-10-25)",
        "NWS, Summary of Natural Hazard Statistics for 2024 and the 80-year fatality table, weather.gov/hazstat (opened 2026-10-25)",
        "OpenFEMA FemaWebDisasterDeclarations v1, 2005-2024 (opened 2026-10-25)",
        "NOAA SPC, 1950-2024_actual_tornadoes.csv (opened 2026-10-25)",
    ],
};
// Fitted per significant event (see IMPACT_CALIBRATION): the mean deaths and
// the mean loss of the costliest four in ten billion-dollar events of each type,
// 2005 to 2024, CPI-adjusted. Severe storms (the tornado row): 16.4 deaths and
// $4.0 billion. Tropical cyclones: 382 and $72 billion. Flooding: 13.3 and $6.5
// billion. Wildfire: 52.8 and $16.1 billion. Winter storms: 80.8 and $9.2
// billion. The drought class: $18.9 billion and 126 deaths, which are heat
// deaths, so the heat row carries the deaths and the drought row the loss.
// The earthquake row is unfitted.
export const NATURAL_IMPACT_PROFILES = {
    earthquake: { fatalityRate: .001, injuryRatio: 5, damageShare: .15, displacementShare: .12, durationDays: 90 },
    flood: { fatalityRate: .0000256, injuryRatio: 4, damageShare: .08, displacementShare: .15, durationDays: 35 },
    cyclone: { fatalityRate: .00015, injuryRatio: 6, damageShare: .19, displacementShare: .2, durationDays: 45 },
    wildfire: { fatalityRate: .0000806, injuryRatio: 8, damageShare: .18, displacementShare: .25, durationDays: 30 },
    drought: { fatalityRate: .000002, injuryRatio: 2, damageShare: .015, displacementShare: .015, durationDays: 120 },
    tornado: { fatalityRate: .000116, injuryRatio: 8, damageShare: .2, displacementShare: .1, durationDays: 35 },
    "winter-storm": { fatalityRate: .000074, injuryRatio: 10, damageShare: .021, displacementShare: .01, durationDays: 10 },
    "heat-wave": { fatalityRate: .000102, injuryRatio: 12, damageShare: .001, displacementShare: .002, durationDays: 14 },
};
/**
 * The footprint: what share of the people in the place an event is filed
 * against are inside it. A tornado's track crosses a few square miles of a
 * metro; a hurricane, a winter storm and a heat wave cover the whole of it; a
 * flood and a fire take a district. Fitted with the profiles above, against the
 * same per-event losses.
 */
export const HAZARD_FOOTPRINT_SHARE = {
    earthquake: .05,
    flood: .158,
    cyclone: 1,
    wildfire: .184,
    drought: .78,
    tornado: .06,
    "winter-storm": 1,
    "heat-wave": 1,
};
export const INDUSTRIAL_IMPACT_PROFILES = {
    fire: { fatalityRate: .002, injuryRatio: 4, damageShare: .3, displacementShare: .12, durationDays: 14 },
    explosion: { fatalityRate: .008, injuryRatio: 6, damageShare: .5, displacementShare: .08, durationDays: 30 },
    "toxic-release": { fatalityRate: .001, injuryRatio: 12, damageShare: .04, displacementShare: .25, durationDays: 21 },
};
export const OUTBREAK_IMPACT_PROFILE = { kind: "outbreak", initialInfected: 10, transmissionPerDay: .22, infectiousDays: 8, latentDays: 3, fatalityFraction: .004, severeFraction: .04, durationDays: 180 };
export const CYBER_IMPACT_PROFILE = { kind: "cyber", initialCompromisedShare: .15, spreadPerDay: .25, restorePerDay: .015, dataExposureShare: .2, durationDays: 28 };

import type { ImpactMechanism, ImpactSpec } from "./impact-event.js";

/** Deliberately marked provisional: tuning data is not empirical evidence. */
export const IMPACT_CALIBRATION: ImpactSpec["calibration"] = {
  status: "provisional", basis: "Aggregate gameplay model, pending calibration against event and recovery datasets.", sourceRefs: [],
};

export type NaturalHazard = Extract<ImpactMechanism, { kind: "natural" }>["hazard"];
type PhysicalProfile = Pick<Extract<ImpactMechanism, { kind: "natural" }>, "fatalityRate" | "injuryRatio" | "damageShare" | "displacementShare" | "durationDays">;
export const NATURAL_IMPACT_PROFILES: Readonly<Record<NaturalHazard, PhysicalProfile>> = {
  earthquake: { fatalityRate: .001, injuryRatio: 5, damageShare: .15, displacementShare: .12, durationDays: 90 },
  flood: { fatalityRate: .00005, injuryRatio: 4, damageShare: .08, displacementShare: .15, durationDays: 35 },
  cyclone: { fatalityRate: .00008, injuryRatio: 6, damageShare: .12, displacementShare: .2, durationDays: 45 },
  wildfire: { fatalityRate: .00006, injuryRatio: 8, damageShare: .18, displacementShare: .25, durationDays: 30 },
  drought: { fatalityRate: .00002, injuryRatio: 2, damageShare: .015, displacementShare: .015, durationDays: 120 },
  tornado: { fatalityRate: .0003, injuryRatio: 8, damageShare: .2, displacementShare: .1, durationDays: 35 },
  "winter-storm": { fatalityRate: .000015, injuryRatio: 10, damageShare: .005, displacementShare: .01, durationDays: 10 },
  "heat-wave": { fatalityRate: .00002, injuryRatio: 12, damageShare: .001, displacementShare: .002, durationDays: 14 },
};
export const INDUSTRIAL_IMPACT_PROFILES = {
  fire: { fatalityRate: .002, injuryRatio: 4, damageShare: .3, displacementShare: .12, durationDays: 14 },
  explosion: { fatalityRate: .008, injuryRatio: 6, damageShare: .5, displacementShare: .08, durationDays: 30 },
  "toxic-release": { fatalityRate: .001, injuryRatio: 12, damageShare: .04, displacementShare: .25, durationDays: 21 },
} as const satisfies Readonly<Record<Extract<ImpactMechanism, { kind: "industrial" }>["hazard"], PhysicalProfile>>;

export const OUTBREAK_IMPACT_PROFILE = { kind: "outbreak", initialInfected: 10, transmissionPerDay: .22, infectiousDays: 8, latentDays: 3, fatalityFraction: .004, severeFraction: .04, durationDays: 180 } as const satisfies ImpactMechanism;
export const CYBER_IMPACT_PROFILE = { kind: "cyber", initialCompromisedShare: .15, spreadPerDay: .25, restorePerDay: .015, dataExposureShare: .2, durationDays: 28 } as const satisfies ImpactMechanism;

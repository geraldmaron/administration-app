import type { ImpactMechanism, ImpactSpec } from "./impact-event.js";
/**
 * Provisional, because the exposures are country proxies rather than site
 * assessments and only the natural-hazard rows are fitted. What is fitted: each
 * natural hazard's mean deaths and mean loss per significant event, against the
 * costliest four in ten of NOAA's billion-dollar events of that type, 2005 to
 * 2024. What is not: earthquakes (NOAA excludes them and no comparable series
 * was opened), the outbreak, cyber and industrial rows, and strikes.
 */
export declare const IMPACT_CALIBRATION: ImpactSpec["calibration"];
export type NaturalHazard = Extract<ImpactMechanism, {
    kind: "natural";
}>["hazard"];
type PhysicalProfile = Pick<Extract<ImpactMechanism, {
    kind: "natural";
}>, "fatalityRate" | "injuryRatio" | "damageShare" | "displacementShare" | "durationDays">;
export declare const NATURAL_IMPACT_PROFILES: Readonly<Record<NaturalHazard, PhysicalProfile>>;
/**
 * The footprint: what share of the people in the place an event is filed
 * against are inside it. A tornado's track crosses a few square miles of a
 * metro; a hurricane, a winter storm and a heat wave cover the whole of it; a
 * flood and a fire take a district. Fitted with the profiles above, against the
 * same per-event losses.
 */
export declare const HAZARD_FOOTPRINT_SHARE: Readonly<Record<NaturalHazard, number>>;
export declare const INDUSTRIAL_IMPACT_PROFILES: {
    readonly fire: {
        readonly fatalityRate: 0.002;
        readonly injuryRatio: 4;
        readonly damageShare: 0.3;
        readonly displacementShare: 0.12;
        readonly durationDays: 14;
    };
    readonly explosion: {
        readonly fatalityRate: 0.008;
        readonly injuryRatio: 6;
        readonly damageShare: 0.5;
        readonly displacementShare: 0.08;
        readonly durationDays: 30;
    };
    readonly "toxic-release": {
        readonly fatalityRate: 0.001;
        readonly injuryRatio: 12;
        readonly damageShare: 0.04;
        readonly displacementShare: 0.25;
        readonly durationDays: 21;
    };
};
export declare const OUTBREAK_IMPACT_PROFILE: {
    readonly kind: "outbreak";
    readonly initialInfected: 10;
    readonly transmissionPerDay: 0.22;
    readonly infectiousDays: 8;
    readonly latentDays: 3;
    readonly fatalityFraction: 0.004;
    readonly severeFraction: 0.04;
    readonly durationDays: 180;
};
export declare const CYBER_IMPACT_PROFILE: {
    readonly kind: "cyber";
    readonly initialCompromisedShare: 0.15;
    readonly spreadPerDay: 0.25;
    readonly restorePerDay: 0.015;
    readonly dataExposureShare: 0.2;
    readonly durationDays: 28;
};
export {};

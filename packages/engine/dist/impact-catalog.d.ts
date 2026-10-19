import type { ImpactMechanism, ImpactSpec } from "./impact-event.js";
/** Deliberately marked provisional: tuning data is not empirical evidence. */
export declare const IMPACT_CALIBRATION: ImpactSpec["calibration"];
export type NaturalHazard = Extract<ImpactMechanism, {
    kind: "natural";
}>["hazard"];
type PhysicalProfile = Pick<Extract<ImpactMechanism, {
    kind: "natural";
}>, "fatalityRate" | "injuryRatio" | "damageShare" | "displacementShare" | "durationDays">;
export declare const NATURAL_IMPACT_PROFILES: Readonly<Record<NaturalHazard, PhysicalProfile>>;
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

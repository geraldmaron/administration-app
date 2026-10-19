import { type Nation, type NationStats } from "@admin/world";
export type WarfightingMetrics = {
    forceIndex: number;
    mobilizationCap: number;
    sustainability: {
        warDuration: number;
        industrialMobilization: number;
    };
    downtime: number;
};
export type WarfightingAssessment = {
    metrics: WarfightingMetrics;
    tier: 1 | 2 | 3 | 4 | 5;
    label: string;
    verdict: string;
    sustainabilityLabel: string;
    recoveryLabel: string;
    strategicImplications: readonly string[];
    crisisRisk: "critical" | "high" | "moderate" | "low";
};
export declare function assessWarfighting(nation: Nation): WarfightingAssessment;
export type ForceProjectionProfile = {
    adjacentConflict: number;
    regionalProjection: number;
    expeditionary: number;
    globalReach: number;
    nuclearDeterrent: boolean;
};
/**
 * What a nation can fight with this week, off its live stats.
 *
 * The band carries the same computation, taken once at founding, so a force
 * bled of readiness, rebuilt by an appropriation or armed by an ally fought
 * every later week at the strength it was handed. Anything that scores who is
 * winning reads this instead.
 */
export declare function liveMilitaryMetrics(stats: NationStats): WarfightingMetrics;
/** Where a nation's force can be brought to bear this week, off its live metrics. */
export declare function forceProjectionProfile(nation: Nation): ForceProjectionProfile;
/**
 * How well a government's people in the field fight, 0..1: how ready and how
 * well commanded the force is, times the mean of its five branches.
 *
 * Not the force index. That index sums mass, reach and arsenal and clamps the
 * sum, so a 3,000-soldier army and the United States both read near 1, and a
 * war scored on it called every invasion of a small state an even fight. This
 * reading leaves mass out, because the war counts the people actually in the
 * theater separately, and keeps what a person there brings: air cover, ships,
 * networks, satellites, training and readiness.
 */
export declare function combatQuality(stats: NationStats): number;

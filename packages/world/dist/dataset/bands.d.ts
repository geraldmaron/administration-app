import type { Nation, NationArchetype, NationBands, NationStats } from "../schemas/nation.js";
import type { OrgId } from "../schemas/ids.js";
export type BandInput = Pick<Nation, "stats" | "doctrine"> & {
    memberships: readonly OrgId[];
};
export declare function militaryScore(stats: NationStats): number;
export declare function militaryTier(stats: NationStats): NationBands["militaryTier"];
export declare function wealthTier(stats: NationStats): NationBands["wealthTier"];
export declare function powerScore(stats: NationStats): number;
export declare function powerTier(stats: NationStats): NationBands["powerTier"];
export declare function stabilityScore(stats: NationStats): number;
export declare function stabilityBand(stats: NationStats): NationBands["stabilityBand"];
export declare function alignmentBand(input: BandInput): NationBands["alignmentBand"];
export declare function archetype(input: BandInput): NationArchetype;
export declare function computeMilitaryMetrics(stats: NationStats): {
    readonly forceIndex: number;
    readonly mobilizationCap: number;
    readonly sustainability: {
        readonly warDuration: number;
        readonly industrialMobilization: number;
    };
    readonly downtime: number;
};
export declare function deriveBands(input: BandInput): NationBands;
export declare function applyBands(nations: readonly Omit<Nation, "bands">[]): Nation[];

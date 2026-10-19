import { type ComposedPackage, type ForcePackageSpec } from "./force-packages.js";
export type CommitmentLevel = "limited" | "standard" | "reinforced";
export type PackageBrief = {
    readonly specId: string;
    readonly purpose: string;
    readonly effect: string;
    readonly componentsProse: string;
    readonly strategicCost: string;
    readonly authorityNote: string;
    readonly riskNote: string;
};
export type AssistancePackageBrief = {
    readonly rung: 1 | 2 | 3 | 4 | 5;
    readonly purpose: string;
    readonly recipients: string;
    readonly mechanism: string;
    readonly costFraming: string;
};
export type MilitaryObjective = "reassure" | "deter" | "evacuate" | "protect-shipping" | "embargo" | "strike" | "air-defense" | "humanitarian" | "surveillance" | "defend-partner" | "prepare-combat" | "sustain";
export declare const ASSISTANCE_PACKAGE_BRIEFS: readonly AssistancePackageBrief[];
/** Map presidential commitment level to a count inside what composeForcePackages already bounded. */
export declare function resolvePackageCount(composed: ComposedPackage, level: CommitmentLevel): number;
export declare function packageBrief(spec: ForcePackageSpec): PackageBrief;
export declare function objectivesForPackage(specId: string): readonly MilitaryObjective[];
/** Every FORCE_PACKAGE_SPECS id must have a brief before ship. */
export declare function allPackageBriefs(): readonly PackageBrief[];

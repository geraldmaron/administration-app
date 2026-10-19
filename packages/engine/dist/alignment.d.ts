import type { AlignmentVector, NationRuntime } from "./state.js";
export declare function accumulateAlignment(current: AlignmentVector, pull: Partial<AlignmentVector>): AlignmentVector;
export declare function alignmentAffinity(alignment: AlignmentVector, stance: Partial<AlignmentVector>): number;
export declare function nationImpliedStance(nation: NationRuntime): Partial<AlignmentVector>;
export declare function npcTrustAffinity(alignment: AlignmentVector, nation: NationRuntime): number;
export type AlignmentStance = Partial<AlignmentVector>;
export declare function factionApproval(alignment: AlignmentVector, stance: AlignmentStance): number;
export declare function removalPressureFromAlignment(alignment: AlignmentVector, expectedAlignment: AlignmentStance): number;

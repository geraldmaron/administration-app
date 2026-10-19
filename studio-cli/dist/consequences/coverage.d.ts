import { ConsequenceInstrument, ConsequenceRungBand, ConsequenceValence, type ConsequenceDef } from "@admin/content";
export type CoverageCell = {
    readonly instrument: ConsequenceInstrument;
    readonly band: ConsequenceRungBand;
    readonly valence: ConsequenceValence;
    readonly core: number;
    readonly corpus: number;
    readonly total: number;
    /** Whether anything in the cell is unconditioned — the floor the draw can always reach. */
    readonly guaranteed: boolean;
};
export declare function consequenceCoverage(corpus?: readonly ConsequenceDef[]): readonly CoverageCell[];
export declare function formatCoverage(cells: readonly CoverageCell[]): string;

import type { Campaign } from "./state.js";
export declare const DIVERGENCE_FACETS: readonly ["traits", "relationships", "people", "events"];
export type DivergenceFacet = (typeof DIVERGENCE_FACETS)[number];
export type DivergenceReport = {
    readonly score: number;
    readonly byFacet: Readonly<Record<DivergenceFacet, number>>;
    readonly turn: number;
};
export declare function measureDivergence(a: Campaign, b: Campaign): DivergenceReport;

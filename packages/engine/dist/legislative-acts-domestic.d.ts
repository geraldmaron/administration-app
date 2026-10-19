import type { LegislativeAct } from "./legislative-acts.js";
export declare const DOMESTIC_ACTS: readonly LegislativeAct[];
/** Authored narrower provisions retain each bill's identity while changing its policy and price. */
export declare const TARGETED_DOMESTIC_ACTS: Readonly<Record<string, LegislativeAct>>;

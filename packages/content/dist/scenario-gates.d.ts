import { type Campaign } from "@admin/engine";
import { type StateId } from "@admin/world";
import type { ScenarioCondition } from "./scenario.js";
type LocusLike = {
    readonly state?: StateId;
};
/** Signed net mark weight for a stateGrievance gate. */
export declare function stateGrievanceMet(campaign: Campaign, condition: Extract<ScenarioCondition, {
    kind: "stateGrievance";
}>, locus: LocusLike | undefined): boolean;
/** Signed net strain weight for a cohortStrain gate. */
export declare function cohortStrainMet(campaign: Campaign, condition: Extract<ScenarioCondition, {
    kind: "cohortStrain";
}>): boolean;
export {};

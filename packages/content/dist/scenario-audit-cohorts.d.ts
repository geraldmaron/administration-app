import type { ScenarioDef } from "./scenario.js";
type FindingSink = {
    push(finding: {
        readonly kind: string;
        readonly severity: "error" | "warning";
        readonly scenario: string;
        readonly message: string;
    }): void;
};
export type { FindingSink };
/** borneBy one-group with no cohorts is a group the prose cannot name. */
export declare function auditUnnamedGroupToll(def: ScenarioDef, findings: FindingSink): void;
/**
 * A thousands/mass toll confined to cohorts whose combined national share is
 * under 5% is a declaration that does not describe itself.
 */
export declare function auditCohortTollImplausible(def: ScenarioDef, findings: FindingSink): void;
/**
 * A cohortStrain gate naming a cause slug no reply writes. Warning until the
 * corpus carries enough causes for the rule to harden.
 */
export declare function auditDeadCohortGate(defs: readonly ScenarioDef[], findings: FindingSink): void;
/** A domestic week with locus.state whose replies never route. */
export declare function auditUnroutedDomesticAct(def: ScenarioDef, findings: FindingSink): void;
/** A stateGrievance gate naming a signature slug no reply in the batch writes. */
export declare function auditDeadGrievanceGate(defs: readonly ScenarioDef[], findings: FindingSink): void;
export declare function auditStateGrievance(def: ScenarioDef, findings: FindingSink): void;
/**
 * An event that happens in one place, priced as if it happened everywhere.
 * A locus at the capital is exempt: that is the seat of the decision, not the
 * place it lands.
 *
 * A domestic signature routes by the country's economy and values: it moves
 * every state that clears the floor. That is right for a tariff and wrong for a
 * flood on one river: a scenario whose locus is a place at home, and whose
 * reply declares a national signature without also moving that place's own
 * lean (`gazetteer.stateLean`), tells the player the whole country answered a
 * question only one state was asked. A warning, because a national echo of a
 * local event is sometimes the point — it should be a decision, beside the
 * local effect rather than instead of it.
 */
export declare function auditUnplacedDomesticSignature(def: ScenarioDef, findings: FindingSink): void;

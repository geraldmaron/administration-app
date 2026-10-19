import type { ScenarioDef } from "./scenario.js";
import { type ScenarioFinding } from "./scenario-audit-contract.js";
import type { FindingSink } from "./scenario-audit-cohorts.js";
/** A premise the scenario states and its own gates would not enforce. */
export declare function auditPremiseGates(defs: readonly ScenarioDef[], findings: FindingSink): void;
/** Wording that contradicts, or floats free of, what the cast and the place actually bind. */
export declare function auditScenarioBinding(defs: readonly ScenarioDef[], findings: FindingSink): void;
/** The readings that would gate this scenario's class, or undefined when the class turns on no single board state. */
export declare function classReadings(def: ScenarioDef): string | undefined;
/** Whether the scenario's own conditions read any of the board state its class turns on. */
export declare function readsClassState(def: ScenarioDef): boolean;
/** Whether the scenario's class turns on a board state it does not read, so only a declared premise can account for it. */
export declare function needsClassPremise(def: ScenarioDef): boolean;
/**
 * A scenario in a state-dependent class that reads none of that state and
 * declares no premise. An error for anything new; the ids that shipped before
 * the rule are listed in `PREMISE_DEBT` and may only leave it.
 */
export declare function auditPremiseDeclared(def: ScenarioDef, findings: ScenarioFinding[]): void;
/** `{{ourTariffSector}}` reads the counterpart's retaliation, so it needs a trade-measure cast or a family that pinned one. */
export declare function auditTariffToken(def: ScenarioDef, findings: ScenarioFinding[]): void;
/** The per-scenario premise and binding errors, as one call for the audit's main pass. */
export declare function auditPremiseBinding(def: ScenarioDef, findings: ScenarioFinding[]): void;
/** `{{sharedOrganization}}` renders only from a membership gate; without one it prints as a raw brace. */
export declare function auditOrganizationToken(def: ScenarioDef, findings: ScenarioFinding[]): void;
/** The doctrine's own floors for orienting a President: context present, four particulars on a week that matters. */
export declare function auditContextFloors(defs: readonly ScenarioDef[], findings: FindingSink): void;
/** The kinds this family raises, so a batch can count them as a work list rather than refuse on them. */
export declare const PREMISE_FINDING_KINDS: ReadonlySet<string>;
export type PremiseFinding = {
    readonly kind: string;
    readonly severity: "warning";
    readonly scenario: string;
    readonly message: string;
};
/**
 * The whole family over a batch. Deliberately not part of `auditScenarios`: the
 * bundled packs and the publish gate assert their warning budgets, and this
 * family exists to measure the corpus before any budget is set for it.
 */
export declare function auditPremiseAndContext(defs: readonly ScenarioDef[]): readonly PremiseFinding[];

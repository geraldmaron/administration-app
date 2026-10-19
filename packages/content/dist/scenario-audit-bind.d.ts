import type { ScenarioDef } from "./scenario.js";
import type { ScenarioFinding } from "./scenario-audit-contract.js";
/** Push the binding findings for a batch. */
export declare function auditBindings(defs: readonly ScenarioDef[], findings: ScenarioFinding[]): void;

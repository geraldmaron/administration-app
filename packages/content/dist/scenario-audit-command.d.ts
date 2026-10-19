import type { ScenarioDef } from "./scenario.js";
import type { ScenarioFinding } from "./scenario-audit-contract.js";
/**
 * An authored command must be tied to exactly the record the binder pins, and
 * a reply's words must state the trade act its command or rung carries.
 */
export declare function auditScenarioCommands(def: ScenarioDef, findings: ScenarioFinding[]): void;

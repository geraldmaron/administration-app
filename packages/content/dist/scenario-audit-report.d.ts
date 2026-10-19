import type { ScenarioDef } from "./scenario.js";
import { type ScenarioFinding } from "./scenario-audit-contract.js";
/** A report decision may only claim what its selected issued product contains. */
export declare function auditCollectionReport(def: ScenarioDef, findings: ScenarioFinding[]): void;

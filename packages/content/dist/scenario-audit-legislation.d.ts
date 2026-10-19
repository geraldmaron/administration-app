import type { ScenarioDef } from "./scenario.js";
import type { ScenarioFinding } from "./scenario-audit-contract.js";
/** A transmitted bill is a real administration proposal, gated on its live calendar slot. */
export declare function auditLegislativeTransmission(def: ScenarioDef, findings: ScenarioFinding[]): void;

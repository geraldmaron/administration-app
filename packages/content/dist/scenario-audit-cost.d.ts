import type { ScenarioDef } from "./scenario.js";
import type { ScenarioFinding } from "./scenario-audit-contract.js";
/** How far a stated basis may sit from its band's anchor before the band reads as the wrong door. */
export declare const BASIS_BAND_TOLERANCE = 10;
/**
 * A basis with no band, or a basis an order of magnitude away from its band's
 * anchor. Four hundred drivers paid for six months of waiting is a few million
 * dollars; declared `supplemental`, it says Congress voted a city's water
 * system for it. The warning names the band whose anchor is nearest.
 */
export declare function auditFinancialBasis(def: ScenarioDef, findings: ScenarioFinding[]): void;

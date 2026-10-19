import type { ScenarioDef } from "./scenario.js";
import { type ScenarioFinding } from "./scenario-audit-contract.js";
/**
 * The corpus half of the phrase index: every run carried by at least
 * `PHRASE_INDEX_FLOOR` of these scenarios, with its carrier count.
 *
 * Exported because the store builds this at publish time, where the whole
 * corpus is already in memory for the union audit, and writes it beside the
 * flag and overlap sidecars.
 */
export declare function phraseCarrierIndex(defs: readonly ScenarioDef[]): Map<string, number>;
export declare function auditStockPhrasing(defs: readonly ScenarioDef[], corpusCarriers: ReadonlyMap<string, number>, findings: ScenarioFinding[]): void;

import { NearDuplicateIndex } from "./corpus/near-duplicate.js";
import { type ScenarioDef } from "./scenario.js";
export * from "./scenario-audit-contract.js";
export { statedTollIn } from "./scenario-audit-impact.js";
export * from "./scenario-audit-time.js";
import { type CorpusContext, type ScenarioFinding } from "./scenario-audit-contract.js";
export declare function auditScenario(def: ScenarioDef): ScenarioFinding[];
export { phraseCarrierIndex } from "./scenario-audit-phrasing.js";
/**
 * A scenario's phrasing fingerprint: overlapping word triples across every
 * passage, placeholders stripped. Exported because the corpus store persists a
 * sketch of exactly this set — two implementations would silently stop
 * agreeing, and a duplicate check whose sketches disagree finds nothing.
 */
export declare function scenarioShingles(def: ScenarioDef): ReadonlySet<string>;
/** The near-duplicate index for a corpus, ready to be asked what a new batch collides with. */
export declare function corpusOverlapIndex(defs: readonly ScenarioDef[]): NearDuplicateIndex;
/**
 * Audit a whole batch. `knownFlags` is the governance memory the packs already
 * installed can write — a batch is validated against the world it will land
 * in, not as if it were the only content that exists.
 */
export declare function auditScenarios(defs: readonly ScenarioDef[], knownFlags?: readonly string[], corpus?: CorpusContext): ScenarioFinding[];
/** Whether a set of findings is shippable: warnings inform, errors stop. */
export declare function auditPasses(findings: readonly ScenarioFinding[]): boolean;

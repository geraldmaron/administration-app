import { NearDuplicateIndex } from "./corpus/near-duplicate.js";
import type { ConsequenceDef } from "./consequence.js";
import { type TimeFindingKind } from "./scenario-audit-time.js";
import { type Passage, type PassageFindingKind, type PassageSeverity } from "./passage-audit.js";
export type ConsequenceFindingKind = PassageFindingKind | "consequence-unknown-placeholder" | "unknown-risk-id" | "risk-affinity-off-failure" | "inert-consequence" | "costless-upside" | "valence-magnitude-inversion" | "consequence-flag-never-set" | "duplicate-consequence-id" | "coverage-cell-empty" | "coverage-cell-gated" | "coverage-cell-thin" | "reveal-cell-uncovered" | "reveal-without-the-check" | "template-overlap" | TimeFindingKind;
export type ConsequenceFinding = {
    readonly kind: ConsequenceFindingKind;
    readonly severity: PassageSeverity;
    /** The card the finding is about, or the matrix cell for a coverage rule. */
    readonly consequence: string;
    readonly message: string;
};
/** Every line on a card. All of it is on screen the moment the act resolves. */
export declare function cardPassages(def: ConsequenceDef): readonly Passage[];
export declare function consequenceHarm(def: ConsequenceDef): number;
export declare function auditConsequence(def: ConsequenceDef): ConsequenceFinding[];
/**
 * The corpus a batch lands in, mirroring the scenario audit's: indexes rather
 * than bodies, so validating against a large pool costs the batch's size.
 */
export type ConsequenceCorpusContext = {
    readonly installedIds?: Iterable<string>;
    readonly overlapIndex?: NearDuplicateIndex;
    /** The cards already shipped, which is what makes a batch's coverage the corpus's coverage. */
    readonly installed?: readonly ConsequenceDef[];
};
/** A card's phrasing fingerprint: overlapping word triples across its prose, placeholders stripped. */
export declare function consequenceShingles(def: ConsequenceDef): ReadonlySet<string>;
/**
 * Audit a whole batch. `knownFlags` is the governance memory the content
 * already installed can write, and `corpus.installed` the cards already
 * shipped — coverage is judged over the pool a player will actually draw from,
 * not over the batch in isolation.
 */
export declare function auditConsequences(defs: readonly ConsequenceDef[], knownFlags?: readonly string[], corpus?: ConsequenceCorpusContext): ConsequenceFinding[];
/** Whether a set of findings is shippable: warnings inform, errors stop. */
export declare function consequenceAuditPasses(findings: readonly ConsequenceFinding[]): boolean;

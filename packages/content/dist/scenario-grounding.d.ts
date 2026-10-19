import type { ScenarioDef } from "./scenario.js";
import type { FindingSink } from "./scenario-audit-cohorts.js";
export type GroundingFindingKind = "decapitated-opening" | "particulars-floor" | "foreign-cast-no-transmission" | "critical-prices-no-life" | "hardcoded-assembly" | "gate-on-nothing" | "condition-vocabulary-spread" | "unmoored-price";
/**
 * The grounding family, as a set. Exported for the one caller that needs to
 * separate these findings from the rest: shipped content that predates the
 * rules carries grounding debt the upgrade wave owns, and a pack test still
 * has to refuse every *other* finding rather than loosening to "no errors".
 */
export declare const GROUNDING_FINDING_KINDS: ReadonlySet<GroundingFindingKind>;
/**
 * The first sentence of the player's week, beginning mid-clause.
 *
 * Doctrine §6.1 bans it outright: 34 of 303 shipped scenarios open on a
 * lowercase word, the residue of a pass that deleted the article §10 forbids
 * as a stock opener instead of rewriting the sentence that needed it. The
 * message says "rewrite" rather than "capitalize" because capitalizing is the
 * defect wearing a hat — "Levee went in the night" is not a sentence either.
 *
 * The capitalized variant ("Facility stays open", "Man who negotiated") and
 * the one that hides behind a demonym ("{{counterpartAdjective}} coast guard
 * is holding six trawlers", which renders "French coast guard is holding")
 * are read by `strippedHead`, which asks only what two short word lists can
 * answer, so "Baltimore's port authority has..." and "Backup generators
 * failed" pass.
 */
export declare function auditDecapitatedOpening(def: ScenarioDef, findings: FindingSink): void;
/**
 * The opening words of a sentence whose first phrase is a singular count noun
 * with its determiner stripped, or undefined. The head is the first listed
 * count noun within reach, after at most a couple of modifiers; it convicts
 * the sentence only when a clause starts straight after it, so a plural or a
 * compound it modifies ("Refinery workers voted", "Ship procurement is") is
 * left alone.
 */
export declare function strippedHead(sentence: string): string | undefined;
export declare function auditParticularsFloor(def: ScenarioDef, findings: FindingSink): void;
/**
 * A foreign counterpart the player only ever hears paraphrased.
 *
 * §6.1: "a foreign cast without a transmission is a warning at routine and
 * serious, and a defect at critical." The relay is the corpus's strongest
 * single device where it exists, and 40 of 118 foreign-cast scenarios do
 * without it.
 */
export declare function auditForeignCastTransmission(def: ScenarioDef, findings: FindingSink): void;
/**
 * A critical week structurally indistinguishable from a routine one.
 *
 * 36 of 50 shipped criticals price no human life at all, which is severity
 * carried entirely by prose intensity and by nothing the engine can see. A
 * warning, not an error: a critical constitutional or fiscal week can be
 * genuinely bloodless, and the escape is exactly that — the week declares an
 * institutional or financial consequence instead, and a reader judges whether
 * that is the honest reading.
 */
export declare function auditCriticalPricesLife(def: ScenarioDef, findings: FindingSink): void;
/**
 * Doctrine §10 requires American vocabulary on the player's own government.
 * The `parliamentary-vocabulary` rule catches "the minister", "the chair" and
 * "parliament"; it does not catch this literal, which is 20 occurrences across
 * 12 shipped scenarios. A transmission is exempt whole, on the same grounds it
 * is exempt from the parliamentary rule: a foreign government naming its own
 * legislature is the correct thing for it to say.
 */
export declare function auditHardcodedAssembly(def: ScenarioDef, findings: FindingSink): void;
/**
 * A week the director can deal to any President in any state of any campaign.
 *
 * 123 of 303 shipped scenarios are in that position. §6.2 rule 2 makes it a
 * defect *with one honest exception*: some weeks genuinely should deal
 * anywhere, and forcing a gate onto a quiet routine culture week manufactures
 * a false dependency the fiction cannot support.
 *
 * The doctrine puts that declaration in the brief and the review record, not
 * in the JSON — "silence is not a declaration" — so there is no schema field
 * to escape through and this rule does not invent one. What it accepts instead
 * is the weaker in-file evidence that somebody thought about the board: one
 * condition that is not an early turn floor, or a weight boost, which reads
 * live state to decide when this week rises. A warning at routine and serious,
 * because the exception is real and a batch is allowed two or three; an error
 * at critical, because a critical week bound to nothing is the anti-exemplar
 * §6.2 names by name.
 */
export declare function auditGateOnNothing(def: ScenarioDef, findings: FindingSink): void;
/**
 * A batch that gated on the clock and called it gating on the board.
 *
 * 193 of the corpus's 216 conditions (89%) are `turn` or `flag`, and five
 * kinds in the schema — `alignment`, `removalPressure`, `stateGrievance`,
 * `cohortStrain` and `institutionState`, the richest gate the game has — are
 * used zero times. §6.2 rule 3 asks for the spread at batch scale rather than
 * per scenario, because any individual week is allowed to gate on a flag.
 */
export declare function auditConditionVocabularySpread(defs: readonly ScenarioDef[], findings: FindingSink): void;
/**
 * A metric that moves with no mechanism in the fiction.
 *
 * The clean mechanical case, and the one doctrine §2 already calls
 * "unsupported in practice": `cost.militaryReadiness` on a scenario whose
 * prose contains no military language anywhere — subject, context, pressures,
 * opening, transmission, replies, rejoinders, remembered lines or press. 151
 * of 911 shipped replies do it, on culture grants and orchestra contracts, and
 * the Record is then unable to name the cause of the swing (§6 rule 12).
 *
 * A warning rather than an error because the lexicon is a proxy for a reader:
 * a scenario can carry the mechanism in a sentence no word list will match.
 * The fix is almost always deletion — take the metric off — and the supported
 * path for a week that really did commit forces is
 * `impact.institutional: ["forces-committed"]`.
 */
export declare function auditUnmooredPrice(def: ScenarioDef, findings: FindingSink): void;
/** Every per-scenario grounding rule, in the order a reader would meet them. */
export declare function auditGrounding(def: ScenarioDef, findings: FindingSink): void;
/** Every batch-level grounding rule. */
export declare function auditGroundingBatch(defs: readonly ScenarioDef[], findings: FindingSink): void;
/**
 * A condition waiting on a flag nothing ever writes: an arc reader that is
 * authored, shipped, and permanently undealable.
 *
 * The audit's highest-value finding — 13 flag names read by 24 shipped
 * scenarios — and §6.2 rule 4's second half: a batch "checks that every flag
 * it reads is set by something the game can actually load." The union it
 * checks against is the batch itself, the packs the caller says are installed,
 * and the bundled pack, which ships with every install: two of the audit's
 * thirteen orphans turned out to be set by `packs/core.ts` all along, and a
 * rule that could not see the binary would have called them dead.
 *
 * The inverse (a flag written that nothing reads) is deliberately not a rule.
 * Packs compose: a reply stamps governance memory so that some later pack can
 * gate on it, and demanding the reader already exist would make writing the
 * setter first an offense. Measured against the bundled pack, that rule fired
 * thirty-one times on content that is entirely correct.
 */
export declare function auditFlagEconomy(defs: readonly ScenarioDef[], knownFlags: ReadonlySet<string>, findings: FindingSink): void;
/**
 * Every flag a set of scenarios writes. Exported so a caller assembling the
 * "known flags" union for `flag-condition-never-set` — the rule that catches
 * an arc reader waiting on a flag nothing sets — can include a pack it holds
 * without re-deriving the traversal. The bundled core pack is folded in by the
 * audit itself; this is for the packs a caller loads off disk.
 */
export declare function flagsSetBy(defs: readonly ScenarioDef[]): ReadonlySet<string>;

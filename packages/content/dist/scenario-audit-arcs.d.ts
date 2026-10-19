import type { ScenarioDef } from "./scenario.js";
import type { FindingSink } from "./scenario-audit-cohorts.js";
/**
 * An arc has exactly one door in, and every later beat has to be behind it.
 *
 * A family pins its country at the opener, so a beat whose family never opens
 * binds to nothing and is unreachable content — the same defect class as a
 * condition nothing can satisfy, one layer up. Two openers is the other half:
 * whichever fires second lands as a beat against the first one's country, so
 * the scenario is dealt about a nation it was not written for.
 *
 * Checked against the corpus as well as the batch, because an arc is normally
 * written across several batches and an opener that shipped last month is a
 * perfectly good door.
 */
export declare function auditFamilies(defs: readonly ScenarioDef[], installed: Iterable<string> | undefined, findings: FindingSink, installedCloses?: Iterable<string>): void;
/**
 * A setter whose branches do not all come back.
 *
 * This is the defect the arc cell introduces, and nothing else catches it.
 * `callback-concentration` counts how many scenarios read one deed;
 * `promised-follow-up-unread` catches a reply that announced a process and got
 * nothing. Neither can see the shape underneath a chain: a three-reply setter
 * whose readers all hang off the *same* reply. Every individual rule passes.
 * The batch reads flags, so `island-pack` and `flag-economy-imbalance` are
 * quiet. And the player who picked either of the other two doors gets no
 * follow-up at all, which is a game that rewards guessing which answer the
 * writer was most interested in.
 *
 * The rule only speaks about scenarios the batch has *already decided to
 * remember*: it fires when at least one of a scenario's reply flags is read and
 * at least one other is read by nobody, batch or corpus. A setter nothing reads
 * yet is not a defect — packs compose, and demanding the reader already exist
 * would make writing the setter first an offense, which is exactly why the
 * inverse of `flag-condition-never-set` is deliberately not a rule.
 *
 * A warning, not an error: writing every branch its own reader multiplies the
 * work, and there are real batches where one branch genuinely deserves the
 * follow-up and the others genuinely end. The finding names the dead branch so
 * that judgment is made deliberately rather than by accident.
 */
export declare function auditArcBranchCoverage(defs: readonly ScenarioDef[], corpusReads: ReadonlySet<string>, findings: FindingSink): void;

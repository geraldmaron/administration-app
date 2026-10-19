import { ScenarioDef, ScenarioTopicTag, type CorpusContext } from "@admin/content";
import type { JobFile } from "../jobs/job-file.js";
/**
 * The three kinds of in-place revision the harness runs, each with its own
 * allowed-change contract enforced by `preservationFindings`. A scenario is
 * never regenerated to add a field, retime its commit-window prose, or move
 * a gate — it is handed back with exactly that change and nothing else.
 */
export type RevisionKind = "scenario-upgrade" | "scenario-retime" | "scenario-regate" | "scenario-bind" | "scenario-rejoin" | "scenario-arc" | "scenario-repair";
/** Every job kind this file's preservation contract knows how to check. */
export declare const REVISION_KINDS: ReadonlySet<string>;
/**
 * The preservation contract, as a list of paths that must survive untouched.
 *
 * Held as data rather than as a hand-written comparison so the gate's message
 * can name the field that moved, and so a field added to `ScenarioDef` later
 * fails loudly here (see `preservationFindings`) instead of being silently
 * rewritable.
 */
export declare const PRESERVED_KEYS: readonly ["id", "class", "severity", "dilemmaShape", "motifs", "intelConfidence", "subject", "cast", "conditions", "weight", "boosts", "once", "family", "setPiece", "locus", "particulars", "scene", "opening", "transmission", "topics", "entities", "subjects", "eraAssumption", "staleAfter", "retired"];
/** Keys the upgrade is allowed to introduce. Everything else is preserved. */
export declare const ADDED_KEYS: Set<string>;
/**
 * Findings the session driver's courtesy check leaves to the gate, by kind of
 * revision. The courtesy check sees the revised scenario and never the
 * original, so it cannot tell a defect the revision introduced from one the
 * shipped scenario already carried in a field this kind may not touch. The
 * gate can, and waives the inherited ones: showing them to a session is
 * showing it a finding whose only fix the preservation contract refuses.
 *
 * - Time findings, for every kind but a retime, whose own job they are.
 * - The two family-pairing findings, for an arc revision: a family is a pair,
 *   judged corpus-wide once both halves are written back.
 */
export declare function courtesyWaived(kind: string, findingKind: string): boolean;
/**
 * What the revision changed that it was not allowed to change, for the given
 * revision kind. Empty means the revision is exactly the allowed change and
 * nothing else. Every other check the corpus runs — schema, audit,
 * near-duplicate — still applies on top of this; this one exists because none
 * of those can tell a rewritten scenario from a revised one.
 *
 * `kind` defaults to `scenario-upgrade` so every existing caller — the upgrade
 * gate, the upgrade tests — is unchanged by this becoming kind-aware.
 */
export declare function preservationFindings(original: ScenarioDef, revised: ScenarioDef, kind?: RevisionKind): readonly string[];
/**
 * What a scenario is still missing, so a run can be pointed at the ones that
 * need it rather than at all 303 — and so a second pass over a partly upgraded
 * corpus does no work twice.
 */
export declare function needsUpgrade(def: ScenarioDef): boolean;
/**
 * The corpus an upgrade is judged against: the shipped pool minus the two
 * indexes that are guaranteed to refuse a correct upgrade.
 *
 * `installedIds` refuses a re-used id, and an upgrade's id is required to be
 * exactly the one already shipped. `overlapIndex` refuses a near-duplicate of
 * the corpus, and the nearest thing in that corpus is this scenario's own
 * shipped self, whose opening and particulars the upgrade may not touch.
 *
 * `phraseCarriers` and `readFlags` are kept, which is why this is a
 * subtraction rather than an empty context: the pass adds a couple of hundred
 * words of new prose per scenario, and stock-phrasing over the shipped pool is
 * exactly the check new prose needs.
 *
 * Shared by the runner's gate and the session driver's courtesy validator so
 * the two cannot disagree about what a clean upgrade is — a disagreement whose
 * only symptom is a session rewriting a scenario to satisfy a finding the gate
 * was never going to raise.
 */
export declare function upgradeCorpusContext(scenarios: CorpusContext | undefined): CorpusContext | undefined;
export declare function buildUpgradeBrief(original: ScenarioDef): string;
export type UpgradeSelection = {
    readonly pending: readonly ScenarioDef[];
    /**
     * Pending scenarios `--before` left out because they carry no `staleAfter`
     * to compare against — reported so a caller can say so, rather than the
     * count going silent.
     */
    readonly undated: number;
};
/**
 * Narrow an already-pending set by `--topic` and/or `--before`.
 *
 * `--topic` reads `topics`, the same closed vocabulary `auditTopicTags`
 * enforces: an untagged scenario is unclassified, not a member of every
 * topic, so it is simply not selected rather than matched by default.
 *
 * `--before` reads `staleAfter`, which only content with `eraAssumption:
 * "dated"` carries (see `scenario-topics.ts`). A pool mixes dated and
 * evergreen content, and a date filter over both has no honest answer for
 * the evergreen half — matching it would be wrong in one direction, dropping
 * it silently is wrong in the other. So `--before` selects only dated
 * content whose `staleAfter` falls before the cutoff, and every scenario it
 * left out for having no date at all is counted in `undated` instead of
 * disappearing into "not selected" the same way a merely off-topic one does.
 */
export declare function selectUpgradeCandidates(pending: readonly ScenarioDef[], topic?: ScenarioTopicTag, before?: string): UpgradeSelection;
/**
 * One item per scenario, deliberately.
 *
 * A batch of ten in one prompt is cheaper and is how generation runs, but the
 * failure modes differ: a generation batch that comes back short has produced
 * nine good scenarios, while an upgrade batch that comes back short has
 * dropped a shipped one on the floor. One item per scenario means the journal
 * names exactly which scenarios were upgraded, and a resumed run cannot
 * re-upgrade one that already was.
 */
export declare function upgradeJob(id: string, driver: JobFile["driver"], originals: readonly ScenarioDef[]): JobFile;

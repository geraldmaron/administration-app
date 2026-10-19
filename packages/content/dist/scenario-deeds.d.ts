import { type ScenarioDef, type ScenarioReply } from "./scenario.js";
export declare const DESK_FLAG_PREFIX: string;
/**
 * Flags the engine sets and clears from the state of the board rather than
 * stamping for a deed. A hostile press is recomputed every week, so a scenario
 * may wait on it, but no reply ever writes it and it carries no age.
 */
export declare const ENGINE_STATE_FLAGS: ReadonlySet<string>;
/**
 * Whether a flag is stamped by the engine rather than authored. Lives here, with
 * the metrics that count what content remembers of content: a scenario gating on
 * `desk:closed:3`, on another scenario's fired marker, or on a deed the engine
 * resolved is reading bookkeeping, not somebody's authored deed, and counting it
 * would inflate every ratio below with flags no writer ever chose — a deed flag
 * in particular can never appear in a `sets` array at all (`WritableFlag`
 * refuses it), so treating it as unwritten-by-content here would flag every
 * legitimate deed gate as unsatisfiable. The audit's flag rules take the same
 * view from here, so the line between an authored deed and engine bookkeeping is
 * drawn once.
 */
export declare function engineOwnedFlag(flag: string, ids: ReadonlySet<string>): boolean;
export type DeedsRemembered = {
    /** Distinct authored flags the replies stamp. */
    readonly set: readonly string[];
    /** Distinct authored flags the conditions gate on. */
    readonly read: readonly string[];
    /**
     * The flags read that the document reading them does not itself stamp: a
     * deed written somewhere else and answered here, which is the number that
     * says a batch joined the corpus rather than landing beside it. Asked of a
     * whole corpus at once there is no "elsewhere" left, and what remains is the
     * orphan reads `flag-condition-never-set` reports as errors.
     */
    readonly answered: readonly string[];
    /** Flags read over flags set, zero when nothing is set. */
    readonly ratio: number;
};
/**
 * What a batch remembers. Engine-owned flags are excluded from both halves:
 * they are bookkeeping every scenario could read, and counting them would make
 * a pool that remembers nothing look like one that remembers plenty.
 */
export declare function deedsRemembered(defs: readonly ScenarioDef[]): DeedsRemembered;
/**
 * The corpus-level view: the same metric over several batches, unioned rather
 * than averaged. A ratio per file says nothing on its own — one document
 * reading another document's flag is exactly the case a per-file number cannot
 * see, and `answered` stays each part's own answer so a flag one file stamps
 * and another reads still counts as a deed answered from outside.
 */
export declare function mergeDeeds(parts: readonly DeedsRemembered[]): DeedsRemembered;
/**
 * One door out of a week: a reply that stamps something, and what it left the
 * player holding.
 *
 * `remembered` and `rejoinder` ride along because they are what a reader is
 * actually written against — the sentence the campaign keeps, and the beat the
 * room played after the player committed. A writer answering a dead branch from
 * the flag id alone cannot tell whether they are extending that aftermath or
 * quietly contradicting it.
 */
export type ArcBranch = {
    readonly reply: string;
    readonly tone: ScenarioReply["tone"];
    readonly text: string;
    readonly flags: readonly string[];
    readonly remembered?: string;
    readonly rejoinder?: string;
};
/** A setter and its doors, split by whether anything in the pool answers each one. */
export type Arc = {
    readonly scenario: string;
    readonly class: ScenarioDef["class"];
    readonly subject: string;
    readonly answered: readonly ArcBranch[];
    readonly dead: readonly ArcBranch[];
};
/**
 * Every arc in a pool, sorted into the three states a chain can be in.
 *
 * `arc-branch-unread` reports only the middle one, and for a good reason — a
 * setter nothing has answered yet is not a defect, because packs compose. But
 * that makes the warning count a poor measure of the flag economy: closing a
 * promise *raises* it, since answering one branch moves an arc out of `silent`
 * and into `lopsided` where the rule can finally see it. The ledger reports all
 * three so the shape of the pool is legible without reading the rise as damage.
 */
export type ArcLedger = {
    /** At least one branch answered and at least one dead — what a player experiences as unfairness. */
    readonly lopsided: readonly Arc[];
    /** No branch answered at all. A volume problem, invisible to the audit by design. */
    readonly silent: readonly Arc[];
    /** Every branch answered. */
    readonly whole: readonly Arc[];
    /** Dead branches across the lopsided arcs — the reader worklist's length. */
    readonly deadBranches: number;
};
/**
 * An arc is a scenario with at least two branches: one door is a decision the
 * week ends on, and there is no unfairness in a week that ends the same way
 * however it is answered.
 *
 * `corpusReads` is the pool a batch is joining. Omitted, an arc is judged
 * against the documents in hand, which is right for a standalone directory and
 * wrong for anything measured against the shipped corpus.
 */
export declare function arcLedger(defs: readonly ScenarioDef[], corpusReads?: ReadonlySet<string>): ArcLedger;
/** One hop of an upstream chain: the reply that set a flag a later scenario reads. */
export type ArcUpstreamNode = {
    readonly scenario: string;
    readonly class: ScenarioDef["class"];
    readonly subject: string;
    readonly reply: string;
    readonly flag: string;
};
/**
 * Every generation upstream of a scenario or flag, oldest cause last.
 *
 * `--dir`'s downstream ledger asks "what does this leave dead"; retiring a
 * scenario asks the opposite question first — "what made this reachable at
 * all", so a continuity editor tracing a reader back to its cause does not
 * have to eyeball flag names across the whole corpus by hand. `generations[0]`
 * is the immediate setters; `generations[1]` is what set *those* setters'
 * conditions, and so on, so a chain several batches deep still prints in one
 * call instead of one manual lookup per hop.
 *
 * `roots` are flags nothing in the pool sets — either engine bookkeeping
 * already filtered out of the chain, or a flag this pool never authored,
 * which is the same "orphan read" `flag-condition-never-set` already treats
 * as an error, surfaced here as where the chain runs out rather than a fault.
 */
export type ArcUpstreamChain = {
    readonly from: string;
    readonly generations: readonly (readonly ArcUpstreamNode[])[];
    readonly roots: readonly string[];
};
/**
 * Walks a scenario or flag back to its setters, one generation at a time.
 *
 * A cycle (two scenarios each reading a flag the other's reply sets) is
 * possible in principle and would otherwise loop forever, so a scenario is
 * only ever added to the frontier once — its second appearance is where the
 * chain stops rather than where it repeats itself.
 */
export declare function arcUpstream(defs: readonly ScenarioDef[], from: string): ArcUpstreamChain;
/**
 * Whether removing a scenario from the pool orphans a live reader.
 *
 * The retire verb deletes a document; nothing else in the pipeline notices
 * that a flag it alone stamped is still gated on somewhere downstream, and
 * `flag-condition-never-set` only runs against the pool that is left *after*
 * the deletion, by which time the file is already gone. This is the
 * before/after in one call: run it before the delete, not after.
 */
export type ArcDeletionImpact = {
    readonly scenario: string;
    readonly safe: boolean;
    readonly orphans: readonly string[];
};
export declare function arcDeletionImpact(defs: readonly ScenarioDef[], scenario: string): ArcDeletionImpact;
/** The stat line a validate run prints. One line, no verdict — there is no threshold yet. */
export declare function formatDeeds(remembered: DeedsRemembered): string;

import type { HarnessCorpus } from "../corpus/harness-corpus.js";
import { z } from "zod";
import { PersonaId } from "../personas/index.js";
export type ReviewTier = "flagged" | "sampled" | "clean";
export type ReviewDecisionState = "pending" | "approve" | "reject";
export type ReviewDecisionBase = {
    sourcePath: string;
    decision: ReviewDecisionState;
    /** A bare approve is not useful six months later when someone asks why an item is in the pool. */
    note: string;
    /**
     * Why this item is in front of a human at all. A batch of thousands cannot
     * be read line by line — insisting on it is how a review becomes a rubber
     * stamp, which is worse than an honest sample. "flagged" is anything the
     * gate warned about or the corpus says is near-duplicate; "sampled" is the
     * seeded audit share of everything else; "clean" carries no obligation and
     * ships on the gate alone.
     */
    tier: ReviewTier;
    /** Warnings the gate raised, so a reviewer sees what drew attention without re-running it. */
    flags: string[];
    /**
     * The director this item was generated under, read back from the job file.
     * Recorded per decision so approve and reject rates can be read per persona
     * — which is the only way to find out that one director's register is
     * quietly costing more rewrites than the other two.
     */
    persona?: PersonaId;
};
/** A decision as it appears on disk, where the id field is named for its content type. */
export type ReviewDecisionOf<K extends string> = ReviewDecisionBase & {
    [P in K]: string;
};
/**
 * The owner accepting a self-reviewed batch deliberately.
 *
 * The independence check cannot verify identity and never could — it asks, and
 * trusts the answer. What it *can* do is make every way past it leave a trace.
 * A bare flag typed at publish time says only that somebody typed it; this says
 * who decided, when, and what they were weighing. That is the difference
 * between an exception and a hole, and it is the whole reason this exists as a
 * record rather than as a second flag.
 *
 * It does not clear the provisional mark. The batch really was reviewed by the
 * session that wrote it and the corpus should keep saying so forever; what the
 * authorization changes is whether that fact blocks the publish.
 */
export type OwnerAuthorization = {
    /** Who accepted it. A name, not a role — "the owner" is not a signature. */
    authorizedBy: string;
    /** What they were weighing. The next person to ask why this shipped reads this line. */
    reason: string;
    at: string;
};
export type ReviewFileOf<K extends string> = {
    runId: string;
    reviewedAt: string;
    reviewer: string;
    reviewerIsAuthor: boolean | null;
    /** Present only when the owner accepted a self-review deliberately. Null is the honest default. */
    ownerAuthorization?: OwnerAuthorization | null;
    /** The share of unflagged items drawn for the audit sample, recorded so a shipped batch says how hard it was actually looked at. */
    sampleRate: number;
    decisions: ReviewDecisionOf<K>[];
};
export type ReviewSchemas<K extends string> = {
    readonly Decision: z.ZodType<ReviewDecisionOf<K>, unknown>;
    readonly File: z.ZodType<ReviewFileOf<K>, unknown>;
};
/**
 * The record schema, with the id field named for the content type. The cast is
 * the price of a computed key: zod cannot carry a generic key through to a
 * literal property type, and the alternative — a neutral `itemId` on disk —
 * would rename the field in every review record that already exists.
 */
export declare function reviewSchemas<K extends string>(idKey: K): ReviewSchemas<K>;
/** The floor an owner's self-review authorization reason is held to — see `OwnerAuthorizationSchema` below. */
export declare const MIN_NOTE = 20;
/**
 * A reason at least this long is owed when an owner authorizes shipping a
 * batch they also reviewed themselves — that is the larger claim, so it does
 * not get to be the cheaper sentence — "ok" and "fine" are what this rejects.
 */
export declare const OwnerAuthorizationSchema: z.ZodObject<{
    authorizedBy: z.ZodString;
    reason: z.ZodString;
    at: z.ZodString;
}, z.core.$strip>;
/**
 * How much of an unflagged batch a human still reads. Small batches are read
 * in full because there is no reason not to; past that the sample floors at a
 * rate that keeps the absolute number of items a person sees roughly constant
 * as batches grow, so a ten-thousand-item batch is a day's reading rather than
 * a quarter's.
 */
export declare const FULL_REVIEW_CEILING = 40;
export declare function sampleRateFor(count: number): number;
/** Deterministic per (runId, itemId): the same batch always samples the same items, and nobody can reroll for a friendlier draw. */
export declare function sampled(runId: string, itemId: string, rate: number): boolean;
export type ReviewPaths = {
    readonly workDir: string;
    readonly reviewDir: string;
    readonly progressPath: string;
    readonly jobPath: string;
};
export declare function reviewPathsFor(jobsDir: string, reviewsDir: string, jobId: string): ReviewPaths;
/** A finding normalized across content types, so the tier split does not care whose audit produced it. */
export type ReviewFinding = {
    readonly id: string;
    readonly severity: string;
    readonly message: string;
    /** The rule that raised it, so a re-gate can exempt what the job gate already exempts. */
    readonly kind?: string;
};
export type ReviewGateResult = {
    readonly ok: boolean;
    readonly shapeErrors: readonly string[];
    readonly findings: readonly ReviewFinding[];
};
/** Everything about a content type the review actually needs. Anything not here is not content-specific. */
export type ReviewKind<Def, K extends string> = {
    readonly idKey: K;
    /** What one of these is called in the messages a reviewer reads. */
    readonly noun: string;
    /** The array key the shipped manifest carries the bodies under. */
    readonly manifestKey: string;
    readonly def: z.ZodType<Def>;
    readonly idOf: (def: Def) => string;
    readonly protocol: string;
    /**
     * Takes the corpus for the same reason the runner's gate does: a scenario
     * waiting on a flag an earlier batch stamped is legitimate, and a gate
     * without the vocabulary calls it unreachable. Here that error would both
     * mis-triage the review — flagging exactly the cross-batch callbacks a
     * reviewer should be glad to see — and refuse the publish outright.
     */
    readonly gate: (file: string, defs: readonly Def[], corpus?: HarnessCorpus) => ReviewGateResult;
};
export type DoneItem<Def> = {
    readonly def: Def;
    readonly sourcePath: string;
    readonly itemId: string;
};
/**
 * Every item in a journaled-done job item, keyed by id, with its source file
 * and the job item it came out of. Exported for any caller — CLI or a UI — that
 * needs the same "what's actually shippable" view the review does.
 */
export declare function doneItems<Def, K extends string>(kind: ReviewKind<Def, K>, paths: ReviewPaths): Promise<Map<string, DoneItem<Def>>>;
export type ScaffoldOutcome = {
    readonly ok: true;
    readonly count: number;
    readonly reviewPath: string;
} | {
    readonly ok: false;
    readonly reason: string;
};
/**
 * Write a fresh review.json, one pending decision per journaled-done item.
 * Pure data plus the two file writes — no console output — so a caller with
 * its own presentation (the CLI, a UI) renders the outcome its own way rather
 * than parsing log lines back out.
 */
export declare function scaffoldReview<Def, K extends string>(kind: ReviewKind<Def, K>, jobId: string, paths: ReviewPaths, corpus?: HarnessCorpus): Promise<ScaffoldOutcome>;
/** Why the record cannot ship yet, or nothing. Exported for the finish path and its tests. */
export declare function recordDefects<K extends string>(idKey: K, record: ReviewFileOf<K>, known: ReadonlySet<string>): readonly string[];
export type PersonaTally = Record<string, {
    shipped: number;
    rejected: number;
}>;
/** Shipped and rejected counts per director, over the decisions that name one. */
export declare function personaTally<K extends string>(idKey: K, decisions: readonly ReviewDecisionOf<K>[], approvedIds: ReadonlySet<string>): PersonaTally;
export type FinishOutcome = {
    readonly ok: true;
    readonly shippedCount: number;
    readonly rejectedCount: number;
    readonly provisional: boolean;
    readonly ownerAuthorization: OwnerAuthorization | null;
    readonly shippedPath: string;
} | {
    readonly ok: false;
    readonly defects: readonly string[];
};
/**
 * Re-check a filled-in review.json and, if it holds up, emit shipped.json.
 * Pure data in, pure outcome out — the two file reads/writes are the only
 * effects, and the gate re-check happens here so every caller shares the same
 * "did the files change since acceptance" guarantee rather than reimplementing it.
 */
export declare function finishReview<Def, K extends string>(kind: ReviewKind<Def, K>, jobId: string, paths: ReviewPaths, corpus?: HarnessCorpus): Promise<FinishOutcome>;
/**
 * Read `--owner-review "<reason>"` off the argv, with the authorizer's name
 * from `--as <name>` or the repo's git identity.
 *
 * The name is resolved rather than asked for because a prompt would be answered
 * by whatever is driving the terminal, which may be an agent — and an agent
 * signing the owner's name to an exception is the exact failure this whole
 * control exists to prevent. git config is the identity the commit will carry
 * anyway, so it is the one already on the hook.
 */
export declare function ownerReviewFrom(args: readonly string[], identity: () => string | undefined): OwnerAuthorization | {
    readonly error: string;
} | undefined;
/** Write the owner's acceptance onto an existing review record, before it is finished. */
export declare function stampOwnerAuthorization<K extends string>(idKey: K, paths: ReviewPaths, authorization: OwnerAuthorization): Promise<void>;
/** Scaffold on first contact, finish once a record exists. CLI-shaped: prints and returns an exit code. */
export declare function reviewJob<Def, K extends string>(kind: ReviewKind<Def, K>, jobId: string, paths: ReviewPaths, publishCommand: string, ownerAuthorization?: OwnerAuthorization, corpus?: HarnessCorpus): Promise<number>;
export type PublishGuard = 
/** Notices are printed on a pass — the ways past the check are not silent. */
{
    readonly ok: true;
    readonly notices?: readonly string[];
} | {
    readonly ok: false;
    readonly messages: readonly string[];
};
/**
 * The one check the whole handshake exists to make good on. `review` marks a
 * batch provisional when the reviewing session is the one that wrote it, and
 * says publish gates should treat it as unreviewed. Saying so and not enforcing
 * it is how a self-reviewed batch reaches the corpus every later batch is
 * judged against — the one place where unreviewed prose does not merely ship,
 * it sets the standard.
 *
 * Independence here is between sessions, not people: a batch reviewed by a
 * session that did not draft it has had a reader with no stake in the draft's
 * survival, which is the whole of what the second pass buys. That is available
 * to a solo author, so the gate is one to satisfy rather than route around.
 * There are two ways past it and they are not the same thing. An owner
 * authorization recorded on the batch names who accepted it and why, and rides
 * with the content into the corpus forever. `--allow-provisional` is typed at
 * the terminal, leaves nothing behind, and exists for the case the corpus has
 * before it has anything: a floor to publish before any review can run at all.
 * The first is the one to reach for, and the second now says so when used.
 *
 * It lives here, once, for both content types deliberately. A second copy is a
 * second thing to weaken, and the copy that gets weakened is never the one
 * anybody is looking at.
 */
export declare function guardProvisional(jobId: string, provisional: boolean | undefined, args: readonly string[], reviewCommand: string, ownerAuthorization?: OwnerAuthorization | null): PublishGuard;

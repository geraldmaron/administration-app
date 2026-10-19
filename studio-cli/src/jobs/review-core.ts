import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import type { HarnessCorpus } from "../corpus/harness-corpus.js";
import { z } from "zod";
import { readCompletedItemIds } from "./runner.js";
import { JobFile } from "./job-file.js";
import { PersonaId } from "../personas/index.js";
import { REVISION_KINDS, upgradeCorpusContext } from "../scenarios/upgrade.js";
import { shippedErrorKeys } from "../scenarios/validate.js";

// The review pass, as the same file handshake generation uses: the CLI
// scaffolds a record, any session fills it in, the CLI checks it and emits the
// hand-off. The point of the shape is separation — the batch's author and its
// reviewer can be different sessions in different tools, and the artifact
// records who judged what, with what reasons, either way.
//
// What the CLI can enforce, it does: every item decided, every decision noted,
// the reviewer named, and every approved item's *current* on-disk content
// re-cleared through the gate — an output file can be edited after the journal
// accepted it, and the journal never looks back. What it cannot verify is
// identity: nothing here can prove the reviewer is not the author. So it asks,
// and an author-reviewed batch ships marked provisional rather than being
// refused — a self-review is a real thing worth recording, it is just not the
// same thing as a review.
//
// None of that reasoning is about what the batch contains. The tier split, the
// audit draw, the note floor, the provisional mark and the publish refusal it
// feeds are properties of *reviewing*, so they are written once here and a
// content type supplies only what is genuinely its own: its schema, how an id
// is read off it, its gate, and the protocol a reviewer is handed. Two copies
// of this file would mean two copies of the independence check, and the second
// copy is the one that quietly drifts.

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
export type ReviewDecisionOf<K extends string> = ReviewDecisionBase & { [P in K]: string };

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
export function reviewSchemas<K extends string>(idKey: K): ReviewSchemas<K> {
  const Decision = z.object({
    [idKey]: z.string().min(1),
    sourcePath: z.string().min(1),
    decision: z.enum(["pending", "approve", "reject"]),
    note: z.string().trim(),
    tier: z.enum(["flagged", "sampled", "clean"]).default("clean"),
    flags: z.array(z.string()).default([]),
    persona: PersonaId.optional(),
  }) as unknown as z.ZodType<ReviewDecisionOf<K>, unknown>;
  const File = z.object({
    runId: z.string().min(1),
    reviewedAt: z.string().min(1),
    reviewer: z.string().trim(),
    reviewerIsAuthor: z.boolean().nullable(),
    ownerAuthorization: OwnerAuthorizationSchema.nullable().optional(),
    sampleRate: z.number().min(0).max(1).default(1),
    decisions: z.array(Decision).min(1),
  }) as unknown as z.ZodType<ReviewFileOf<K>, unknown>;
  return { Decision, File };
}

/** The floor an owner's self-review authorization reason is held to — see `OwnerAuthorizationSchema` below. */
export const MIN_NOTE = 20;

/**
 * A reason at least this long is owed when an owner authorizes shipping a
 * batch they also reviewed themselves — that is the larger claim, so it does
 * not get to be the cheaper sentence — "ok" and "fine" are what this rejects.
 */
export const OwnerAuthorizationSchema = z.object({
  authorizedBy: z.string().trim().min(1),
  reason: z.string().trim().min(MIN_NOTE),
  at: z.string().min(1),
});

/**
 * How much of an unflagged batch a human still reads. Small batches are read
 * in full because there is no reason not to; past that the sample floors at a
 * rate that keeps the absolute number of items a person sees roughly constant
 * as batches grow, so a ten-thousand-item batch is a day's reading rather than
 * a quarter's.
 */
export const FULL_REVIEW_CEILING = 40;
const MIN_SAMPLE = 40;

export function sampleRateFor(count: number): number {
  if (count <= FULL_REVIEW_CEILING) return 1;
  return Math.min(1, Math.max(MIN_SAMPLE / count, 0.02));
}

/** Deterministic per (runId, itemId): the same batch always samples the same items, and nobody can reroll for a friendlier draw. */
export function sampled(runId: string, itemId: string, rate: number): boolean {
  let hash = 0x811c9dc5;
  for (const char of `${runId}:${itemId}`) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return (hash >>> 8) / 0x1000000 < rate;
}

export type ReviewPaths = {
  readonly workDir: string;
  readonly reviewDir: string;
  readonly progressPath: string;
  readonly jobPath: string;
};

export function reviewPathsFor(jobsDir: string, reviewsDir: string, jobId: string): ReviewPaths {
  return {
    workDir: path.join(jobsDir, "work", jobId),
    reviewDir: path.join(reviewsDir, jobId),
    progressPath: path.join(jobsDir, `${jobId}.progress.jsonl`),
    jobPath: path.join(jobsDir, `${jobId}.json`),
  };
}

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

export type DoneItem<Def> = { readonly def: Def; readonly sourcePath: string; readonly itemId: string };

/**
 * Every item in a journaled-done job item, keyed by id, with its source file
 * and the job item it came out of. Exported for any caller — CLI or a UI — that
 * needs the same "what's actually shippable" view the review does.
 */
export async function doneItems<Def, K extends string>(
  kind: ReviewKind<Def, K>,
  paths: ReviewPaths,
): Promise<Map<string, DoneItem<Def>>> {
  const done = await readCompletedItemIds(paths.progressPath);
  const out = new Map<string, DoneItem<Def>>();
  // A job that has been registered and never run has no work directory, which
  // is a fact about it and not a failure to read one: it has journaled nothing
  // done, so it has no done items. Throwing here took the studio console's home
  // page down with a 500 for every operator who wrote a job file before running
  // it — the caller's own empty-set path is the correct answer.
  const entries = await readdir(paths.workDir).catch((error: NodeJS.ErrnoException) => {
    if (error.code === "ENOENT") return [] as string[];
    throw error;
  });
  for (const entry of entries.filter((name) => name.endsWith(".out.json")).sort()) {
    const itemId = entry.replace(/\.out\.json$/, "");
    if (!done.has(itemId)) continue;
    const sourcePath = path.join(paths.workDir, entry);
    // A batch item writes an array and an upgrade item writes the one object it
    // was handed, so the lone object is wrapped rather than refused: the output
    // the gate already journaled done cannot be unreadable to the review that
    // follows it.
    const raw: unknown = JSON.parse(await readFile(sourcePath, "utf8"));
    for (const def of z.array(kind.def).parse(Array.isArray(raw) ? raw : [raw])) {
      out.set(kind.idOf(def), { def, sourcePath, itemId });
    }
  }
  return out;
}

/**
 * The director each job item was generated under. Read from the job file
 * rather than re-derived from the class, because the routing map may have
 * moved since the batch ran and the job file is what actually happened. A
 * batch written before personas existed simply has none, and reviews the same
 * way it always did.
 */
async function personaByItem(jobPath: string): Promise<Map<string, PersonaId>> {
  const out = new Map<string, PersonaId>();
  if (!existsSync(jobPath)) return out;
  const job = JobFile.parse(JSON.parse(await readFile(jobPath, "utf8")));
  for (const item of job.items) {
    const parsed = PersonaId.safeParse(item.payload.persona);
    if (parsed.success) out.set(item.id, parsed.data);
  }
  return out;
}

export type ScaffoldOutcome =
  | { readonly ok: true; readonly count: number; readonly reviewPath: string }
  | { readonly ok: false; readonly reason: string };

/**
 * Write a fresh review.json, one pending decision per journaled-done item.
 * Pure data plus the two file writes — no console output — so a caller with
 * its own presentation (the CLI, a UI) renders the outcome its own way rather
 * than parsing log lines back out.
 */
export async function scaffoldReview<Def, K extends string>(
  kind: ReviewKind<Def, K>,
  jobId: string,
  paths: ReviewPaths,
  corpus?: HarnessCorpus,
): Promise<ScaffoldOutcome> {
  const items = await doneItems(kind, paths);
  if (items.size === 0) {
    return { ok: false, reason: "nothing journaled done yet — run the job to completion first" };
  }
  // What the gate already said about each item decides who has to read it.
  // Re-running the audit here rather than trusting the journal is deliberate:
  // an output file can be edited after the journal accepted it.
  const defs = [...items.values()].map((entry) => entry.def);
  const warningsById = new Map<string, string[]>();
  for (const finding of kind.gate(paths.workDir, defs, corpus).findings) {
    const existing = warningsById.get(finding.id);
    if (existing) existing.push(finding.message);
    else warningsById.set(finding.id, [finding.message]);
  }

  const personas = await personaByItem(paths.jobPath);
  const rate = sampleRateFor(items.size);
  const record: ReviewFileOf<K> = {
    runId: jobId,
    reviewedAt: new Date().toISOString(),
    reviewer: "",
    reviewerIsAuthor: null,
    ownerAuthorization: null,
    sampleRate: rate,
    decisions: [...items.entries()].map(([id, { sourcePath, itemId }]) => {
      const flags = warningsById.get(id) ?? [];
      const tier: ReviewTier = flags.length > 0 ? "flagged" : sampled(jobId, id, rate) ? "sampled" : "clean";
      const persona = personas.get(itemId);
      return {
        [kind.idKey]: id,
        sourcePath,
        decision: "pending",
        note: "",
        tier,
        flags,
        ...(persona ? { persona } : {}),
      } as ReviewDecisionOf<K>;
    }),
  };
  await mkdir(paths.reviewDir, { recursive: true });
  const reviewPath = path.join(paths.reviewDir, "review.json");
  await writeFile(reviewPath, `${JSON.stringify(record, null, 2)}\n`, "utf8");
  await writeFile(path.join(paths.reviewDir, "README.md"), kind.protocol, "utf8");
  return { ok: true, count: items.size, reviewPath };
}

/** Why the record cannot ship yet, or nothing. Exported for the finish path and its tests. */
export function recordDefects<K extends string>(
  idKey: K,
  record: ReviewFileOf<K>,
  known: ReadonlySet<string>,
): readonly string[] {
  const defects: string[] = [];
  if (record.reviewer.length === 0) defects.push("reviewer is empty — a review nobody signed is not a review");
  if (record.reviewerIsAuthor === null) defects.push("reviewerIsAuthor is unanswered — say whether this session wrote the batch");
  for (const decision of record.decisions) {
    const id = decision[idKey];
    if (!known.has(id)) defects.push(`${id}: not in this job's journaled-done output`);
    // A clean item ships on the gate. Only what the gate flagged and what the
    // sample drew is owed a human answer — asking for ten thousand of them
    // buys a rubber stamp, not a judgment.
    if (decision.tier === "clean") continue;
    if (decision.decision === "pending") defects.push(`${id} (${decision.tier}): still pending`);
  }
  const undecided = [...known].filter((id) => !record.decisions.some((decision) => decision[idKey] === id));
  for (const id of undecided) defects.push(`${id}: journaled done but absent from the review`);
  return defects;
}

export type PersonaTally = Record<string, { shipped: number; rejected: number }>;

/** Shipped and rejected counts per director, over the decisions that name one. */
export function personaTally<K extends string>(
  idKey: K,
  decisions: readonly ReviewDecisionOf<K>[],
  approvedIds: ReadonlySet<string>,
): PersonaTally {
  const tally: PersonaTally = {};
  for (const decision of decisions) {
    if (!decision.persona) continue;
    const entry = (tally[decision.persona] ??= { shipped: 0, rejected: 0 });
    if (approvedIds.has(decision[idKey])) entry.shipped += 1;
    else entry.rejected += 1;
  }
  return tally;
}

export type FinishOutcome = {
  readonly ok: true;
  readonly shippedCount: number;
  readonly rejectedCount: number;
  readonly provisional: boolean;
  readonly ownerAuthorization: OwnerAuthorization | null;
  readonly shippedPath: string;
} | { readonly ok: false; readonly defects: readonly string[] };

/**
 * Re-check a filled-in review.json and, if it holds up, emit shipped.json.
 * Pure data in, pure outcome out — the two file reads/writes are the only
 * effects, and the gate re-check happens here so every caller shares the same
 * "did the files change since acceptance" guarantee rather than reimplementing it.
 */
export async function finishReview<Def, K extends string>(
  kind: ReviewKind<Def, K>,
  jobId: string,
  paths: ReviewPaths,
  corpus?: HarnessCorpus,
): Promise<FinishOutcome> {
  const reviewPath = path.join(paths.reviewDir, "review.json");
  const schemas = reviewSchemas(kind.idKey);
  const record = schemas.File.parse(JSON.parse(await readFile(reviewPath, "utf8")));
  const items = await doneItems(kind, paths);

  const defects = recordDefects(kind.idKey, record, new Set(items.keys()));
  if (defects.length > 0) return { ok: false, defects };

  // The journal accepted these files once; nothing rechecks an edit made
  // since. Approval is the moment they become a shipping artifact, so the
  // current content clears the gate here or the review does not finish.
  // A clean item ships unless a human went out of their way to reject it;
  // a flagged or sampled one ships only on an explicit approve.
  const approved = record.decisions.filter((decision) =>
    decision.decision === "approve" || (decision.tier === "clean" && decision.decision !== "reject"),
  );
  const defs = approved.map((decision) => items.get(decision[kind.idKey])!.def);
  const regression = defs.length > 0 ? regate(kind, reviewPath, defs, await exemptFor(paths.jobPath, corpus), corpus) : undefined;
  if (regression) return { ok: false, defects: regression };

  const provisional = record.reviewerIsAuthor === true;
  const ownerAuthorization = record.ownerAuthorization ?? null;
  const shippedPath = path.join(paths.reviewDir, "shipped.json");
  const approvedIds = new Set(approved.map((decision) => decision[kind.idKey]));
  await writeFile(shippedPath, `${JSON.stringify(manifest(kind, jobId, record, approvedIds, defs), null, 2)}\n`, "utf8");
  return {
    ok: true,
    shippedCount: defs.length,
    rejectedCount: record.decisions.length - approved.length,
    provisional,
    ownerAuthorization,
    shippedPath,
  };
}

/**
 * Findings the re-gate may not enforce, decided by what the job produced.
 *
 * An upgrade's job gate already exempts `unreachable-scenario`, because
 * reachability rides on `conditions` and `cast` and an upgrade may not touch
 * either. Enforcing it here instead would put the same batch in a state no
 * action clears: the writing cannot be improved into reachability, and
 * rejecting the item sends it back to the next wave to be refused again.
 *
 * `scenario-retime`, `scenario-regate` and `scenario-bind` are the same handshake
 * over the same shipped pool, so they take the same branch. This re-gate calls the content
 * type's plain document gate — not the job-kind-aware one in `jobs/gate.ts` —
 * which cannot tell an inherited defect from one the revision just introduced.
 * A retime or a regate almost never touches every commit-time field on a
 * scenario, so whatever it left alone still carries whatever the corpus
 * already shipped, error-tier flash-forwards included; refusing the approval
 * over a defect the batch did not cause and was not asked to fix would refuse
 * exactly the items the retime and regate passes exist to revise. The job gate in
 * `jobs/gate.ts` is the one that actually holds a *changed* field to zero time
 * findings (`:94-99` there); this is only the finishing re-check, and it is
 * told to look past the same two things at this coarser, kind-only grain.
 */
type Exemption = {
  /** Finding kinds the re-check does not enforce for this job's kind. */
  readonly kinds: ReadonlySet<string>;
  /** Errors a revised scenario's shipped original already carried, keyed kind and message. */
  readonly inherited: ReadonlySet<string>;
};

const NO_EXEMPTION: Exemption = { kinds: new Set(), inherited: new Set() };

async function exemptFor(jobPath: string, corpus?: HarnessCorpus): Promise<Exemption> {
  if (!existsSync(jobPath)) return NO_EXEMPTION;
  const job = await readFile(jobPath, "utf8")
    .then((text) => JobFile.parse(JSON.parse(text)))
    .catch(() => undefined);
  if (job === undefined || !REVISION_KINDS.has(job.kind)) return NO_EXEMPTION;
  if (job.kind === "scenario-repair") return NO_EXEMPTION;
  // The same waivers the job gate grants, so an item the gate journaled done
  // is not refused at the finish for a defect it was forbidden to fix: the
  // family pairing an arc revision is judged on corpus-wide, and the errors the
  // shipped original already carried in fields the kind may not touch.
  const kinds = new Set(["unreachable-scenario", "commit-time-flash-forward", "commit-time-elapsed"]);
  if (job.kind === "scenario-arc") for (const pairing of ["family-without-opener", "family-without-close"]) kinds.add(pairing);
  const scenarios = upgradeCorpusContext(corpus?.scenarios);
  const inherited = new Set(job.items.flatMap((item) => [...shippedErrorKeys(item.id, item.payload.original, scenarios, corpus?.scenarioFlags)]));
  return { kinds, inherited };
}

function regate<Def, K extends string>(
  kind: ReviewKind<Def, K>,
  reviewPath: string,
  defs: readonly Def[],
  exempt: Exemption,
  corpus?: HarnessCorpus,
): readonly string[] | undefined {
  const validation = kind.gate(reviewPath, defs, corpus);
  const errors = validation.findings.filter(
    (finding) =>
      finding.severity === "error" &&
      !(finding.kind !== undefined && exempt.kinds.has(finding.kind)) &&
      !exempt.inherited.has(`${finding.kind}|${finding.message}`),
  );
  if (validation.shapeErrors.length === 0 && errors.length === 0) return undefined;
  return [
    `an approved ${kind.noun} no longer clears the gate — the files changed since acceptance:`,
    ...validation.shapeErrors,
    ...errors.map((finding) => finding.message),
  ];
}

function manifest<Def, K extends string>(
  kind: ReviewKind<Def, K>,
  jobId: string,
  record: ReviewFileOf<K>,
  approvedIds: ReadonlySet<string>,
  defs: readonly Def[],
): Record<string, unknown> {
  const read = record.decisions.filter((decision) => decision.tier !== "clean").length;
  return {
    runId: jobId,
    reviewer: record.reviewer,
    // The mark stays true whatever the owner decided. An authorization says the
    // batch may ship anyway, not that it was reviewed independently, and the
    // corpus every later batch is judged against should never lose that
    // distinction just because somebody was in a hurry once.
    provisional: record.reviewerIsAuthor === true,
    ownerAuthorization: record.ownerAuthorization ?? null,
    // How hard this batch was actually looked at, on the record with it. A
    // batch shipped on a two-percent sample is a different claim from one read
    // end to end, and shipped.json is where that stops being tacit.
    coverage: { sampleRate: record.sampleRate, humanRead: read, total: record.decisions.length },
    // Shipped and rejected per director. Three registers are only worth having
    // if it can be seen which one is working, and the shipped manifest is where
    // that becomes a number rather than an impression.
    personas: personaTally(kind.idKey, record.decisions, approvedIds),
    [kind.manifestKey]: defs,
  };
}

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
export function ownerReviewFrom(args: readonly string[], identity: () => string | undefined): OwnerAuthorization | { readonly error: string } | undefined {
  const at = args.indexOf("--owner-review");
  if (at === -1) return undefined;
  const reason = args[at + 1];
  if (!reason || reason.startsWith("--")) {
    return { error: '--owner-review needs a reason: --owner-review "why this ships unreviewed"' };
  }
  const named = args.indexOf("--as");
  const authorizedBy = named === -1 ? identity() : args[named + 1];
  if (!authorizedBy) {
    return { error: "--owner-review needs a name: set git config user.name, or pass --as <name>" };
  }
  const parsed = OwnerAuthorizationSchema.safeParse({ authorizedBy, reason, at: new Date().toISOString() });
  if (!parsed.success) {
    return { error: `--owner-review reason must be at least ${MIN_NOTE} characters — say what you are weighing` };
  }
  return parsed.data;
}

/** Write the owner's acceptance onto an existing review record, before it is finished. */
export async function stampOwnerAuthorization<K extends string>(
  idKey: K,
  paths: ReviewPaths,
  authorization: OwnerAuthorization,
): Promise<void> {
  const reviewPath = path.join(paths.reviewDir, "review.json");
  const record = reviewSchemas(idKey).File.parse(JSON.parse(await readFile(reviewPath, "utf8")));
  const next = { ...record, ownerAuthorization: authorization };
  await writeFile(reviewPath, `${JSON.stringify(next, null, 2)}\n`, "utf8");
}

/** Scaffold on first contact, finish once a record exists. CLI-shaped: prints and returns an exit code. */
export async function reviewJob<Def, K extends string>(
  kind: ReviewKind<Def, K>,
  jobId: string,
  paths: ReviewPaths,
  publishCommand: string,
  ownerAuthorization?: OwnerAuthorization,
  corpus?: HarnessCorpus,
): Promise<number> {
  if (!existsSync(path.join(paths.reviewDir, "review.json"))) {
    const outcome = await scaffoldReview(kind, jobId, paths, corpus);
    if (!outcome.ok) {
      console.log(`${jobId}: ${outcome.reason}`);
      return 1;
    }
    console.log(`${jobId}: scaffolded ${outcome.count} decision(s) in ${outcome.reviewPath}`);
    console.log("hand it to a reviewer session — ideally not the one that wrote the batch — then run this again");
    return 0;
  }

  if (ownerAuthorization) await stampOwnerAuthorization(kind.idKey, paths, ownerAuthorization);

  const outcome = await finishReview(kind, jobId, paths, corpus);
  if (!outcome.ok) {
    console.log(`${jobId}: review is not finishable — ${outcome.defects.length} defect(s):`);
    for (const defect of outcome.defects) console.log(`  ${defect}`);
    return 1;
  }
  console.log(`${jobId}: shipped ${outcome.shippedCount} ${kind.noun}(s), rejected ${outcome.rejectedCount} — ${outcome.shippedPath}`);
  if (outcome.provisional && outcome.ownerAuthorization) {
    // Both facts, in this order. The batch is still provisional; it is just no
    // longer blocked, and the reader should see the weaker claim first.
    console.log(`PROVISIONAL: the reviewing session also wrote the batch — that stays on the record permanently.`);
    console.log(`AUTHORIZED by ${outcome.ownerAuthorization.authorizedBy}: ${outcome.ownerAuthorization.reason}`);
    console.log(`\`${publishCommand}\` will accept it and print the same.`);
  } else if (outcome.provisional) {
    console.log(`PROVISIONAL: the reviewing session also wrote the batch, so nothing here has been read by anything without a stake in it.`);
    console.log(`\`${publishCommand}\` will refuse it. Re-run this from a session that did not draft the batch to clear the mark,`);
    console.log(`or, as the owner, re-run with --owner-review "<why>" to accept it deliberately and on the record.`);
  }
  return 0;
}

export type PublishGuard =
  /** Notices are printed on a pass — the ways past the check are not silent. */
  | { readonly ok: true; readonly notices?: readonly string[] }
  | { readonly ok: false; readonly messages: readonly string[] };

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
export function guardProvisional(
  jobId: string,
  provisional: boolean | undefined,
  args: readonly string[],
  reviewCommand: string,
  ownerAuthorization?: OwnerAuthorization | null,
): PublishGuard {
  if (!provisional) return { ok: true };
  if (ownerAuthorization) {
    return {
      ok: true,
      notices: [
        `${jobId}: publishing a self-reviewed batch on ${ownerAuthorization.authorizedBy}'s authorization (${ownerAuthorization.at}).`,
        `  reason: ${ownerAuthorization.reason}`,
        "  it stays marked provisional in the corpus — authorized is not reviewed.",
      ],
    };
  }
  if (args.includes("--allow-provisional")) {
    return {
      ok: true,
      notices: [
        `${jobId}: published unreviewed on a bare --allow-provisional, which records nothing about who decided or why.`,
        `  prefer \`${reviewCommand} ${jobId} --owner-review "<reason>"\`, which puts that on the batch.`,
      ],
    };
  }
  return {
    ok: false,
    messages: [
      `${jobId}: shipped.json is marked provisional — the session that reviewed it also wrote it, so nothing in it has been read by anything without a stake in it.`,
      `Re-run \`${reviewCommand} ${jobId}\` from a session that did not draft the batch (see skills/content-review),`,
      `or, if you are the owner and are accepting it deliberately, \`${reviewCommand} ${jobId} --owner-review "<why>"\` — which records the decision on the batch.`,
    ],
  };
}

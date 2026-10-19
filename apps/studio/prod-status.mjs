import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CORE_SCENARIOS } from "@admin/content";
import { corpusPathsFor, readCorpusIndex } from "@admin/studio-cli/dist/corpus/shard-store.js";

/**
 * What a player can actually reach, and what is only on this machine.
 *
 * The console could already list the bundled floor and the local corpus
 * directory side by side, which reads as an answer to "what is in production"
 * and is not one. A directory on an operator's laptop is evidence that
 * something was published locally; it is not evidence that any build carries
 * it. The two disagree exactly when it matters most — after a publish that was
 * never baked — and a console that conflates them will tell you a scenario is
 * live on the day you most need to know it is not.
 *
 * The player has no content service to ask: it plays the corpus baked into the
 * build and nothing else. So what is live is read off the committed bake,
 * scenario by scenario, rather than off what this checkout's corpus happens to
 * contain. When the bake cannot be read the answer is `unverified` with the
 * reason attached — never an implied zero, and never a fall back to the local
 * corpus, because "I could not read it" and "there is nothing there" are
 * different facts and only one of them is safe to act on.
 */

// Resolved from this file rather than from the working directory. The dev
// server chdirs to the repo root at boot, so every console module reading
// "content/..." relative works when served and silently reads nothing when
// called from anywhere else — including from its own tests, where an empty
// catch turns "wrong directory" into "nothing published".
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const JOBS_DIR = path.join(REPO_ROOT, "content", "jobs");
const REVIEWS_DIR = path.join(REPO_ROOT, "content", "reviews");
const CORPUS_DIR = path.join(REPO_ROOT, "content", "corpus");
const BAKE_PATH = path.join(REPO_ROOT, "packages", "player-core", "src", "content", "bundled-corpus.generated.ts");

/**
 * The scenario ids one shard body carries, from its JSON string literal.
 *
 * `corpus build` writes each body with `JSON.stringify`, so the literal parses
 * back to the exact bytes the binary holds, one scenario document per line.
 */
function bakedIds(literal) {
  return JSON.parse(literal)
    .split("\n")
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line).id);
}

/**
 * The corpus baked into this checkout's build, read as text.
 *
 * Read off the generated module rather than imported, the way
 * verify-bundled-corpus-current reads it, so the answer tracks the committed
 * source and not whichever dist was last built.
 */
export async function bakedCorpus(bakePath = BAKE_PATH) {
  let source;
  try {
    source = await fs.readFile(bakePath, "utf8");
  } catch (cause) {
    return { status: "unverified", reason: `the bake at ${bakePath} could not be read: ${cause?.message ?? cause}` };
  }
  const setId = /BUNDLED_CONTENT_SET_ID = "([^"]+)"/.exec(source)?.[1];
  const revision = /BUNDLED_MANIFEST_REVISION = (\d+)/.exec(source)?.[1];
  if (!setId || revision === undefined) {
    return { status: "unverified", reason: `the bake at ${bakePath} declares no content set id and revision` };
  }
  const literals = [...source.matchAll(/^\s+jsonl: (".*"),$/gm)].map((match) => match[1]);
  const shardCount = [...source.matchAll(/^\s+shardId: "[^"]+",$/gm)].length;
  // A generator that changed its layout would otherwise read as a bake with
  // nothing in it, which is the implied zero this module exists to refuse.
  if (literals.length !== shardCount) {
    return { status: "unverified", reason: `the bake at ${bakePath} names ${shardCount} shard(s) and this console read ${literals.length} bodies` };
  }
  try {
    const ids = literals.flatMap(bakedIds);
    return { status: "live", setId, revision: Number(revision), shardCount, ids };
  } catch (cause) {
    return { status: "unverified", reason: `the bake at ${bakePath} carries a shard that does not parse: ${cause?.message ?? cause}` };
  }
}

/**
 * Everything the generation loop has produced that is not in a pack yet,
 * grouped by the only distinction that decides what happens to it next: has a
 * human judged it, and did that judgment let it ship.
 */
export async function draftInventory(roots = {}) {
  const jobsDir = roots.jobsDir ?? JOBS_DIR;
  const reviewsDir = roots.reviewsDir ?? REVIEWS_DIR;

  let jobFiles = [];
  try {
    jobFiles = (await fs.readdir(jobsDir)).filter((name) => name.endsWith(".json"));
  } catch {
    return { jobs: [], totals: { journaled: 0, notScaffolded: 0, awaitingReview: 0, approved: 0, rejected: 0 } };
  }

  const jobs = [];
  for (const file of jobFiles) {
    const jobId = file.replace(/\.json$/, "");
    const job = await readJson(path.join(jobsDir, file));
    if (!job || job.kind !== "scenario-batch") continue;

    const journaled = await journaledIds(jobId, jobsDir);
    const review = await readJson(path.join(reviewsDir, jobId, "review.json"));
    const shipped = await readJson(path.join(reviewsDir, jobId, "shipped.json"));

    const decisions = review?.decisions ?? [];
    const approved = decisions.filter((d) => d.decision === "approve").length;
    const rejected = decisions.filter((d) => d.decision === "reject").length;

    // A "clean" item ships on the gate with no human decision — counting it as
    // "awaiting review" is what made this figure disagree with the command
    // center's "owed a decision" tile, which already excludes clean items.
    // Both now count the same thing: pending items a tier actually flagged or
    // sampled for a human. Pre-scaffold there is no tier yet, so every
    // journaled item honestly awaits review — that is not the same state and
    // is not folded into this count.
    const pendingNeedsHuman = decisions.filter((d) => (d.tier ?? "clean") !== "clean" && d.decision === "pending").length;

    jobs.push({
      jobId,
      journaled: journaled.length,
      reviewed: decisions.length > 0,
      approved,
      rejected,
      // shipped.json carries whole scenario documents, not ids — the count is
      // the only thing this view needs from it, so it never builds a set.
      shippedCount: shipped?.scenarios?.length ?? 0,
      // Journaled but review has never even been scaffolded: the state the
      // console had no name for, and the one that quietly accumulates.
      notScaffolded: decisions.length === 0 ? journaled.length : 0,
      awaitingReview: decisions.length === 0 ? journaled.length : pendingNeedsHuman,
    });
  }

  const totals = jobs.reduce(
    (acc, job) => ({
      journaled: acc.journaled + job.journaled,
      notScaffolded: acc.notScaffolded + job.notScaffolded,
      awaitingReview: acc.awaitingReview + job.awaitingReview,
      approved: acc.approved + job.approved,
      rejected: acc.rejected + job.rejected,
    }),
    { journaled: 0, notScaffolded: 0, awaitingReview: 0, approved: 0, rejected: 0 },
  );

  return { jobs: jobs.sort((a, b) => a.jobId.localeCompare(b.jobId)), totals };
}

/**
 * The whole picture, in the four states a scenario can actually be in.
 *
 * `staged` is the one worth naming: published into this checkout's corpus and
 * not carried by the bake. It is the state a publish leaves behind when
 * `corpus build` never ran, and it looks identical to "live" in any view that
 * reads only the corpus.
 */
export async function contentStatus(roots = {}) {
  const live = await bakedCorpus(roots.bakePath);
  const localCorpus = await readCorpusIndex(corpusPathsFor(roots.corpusDir ?? CORPUS_DIR)).catch(() => []);
  const drafts = await draftInventory(roots);

  const liveIds = live.status === "live" ? new Set(live.ids) : undefined;

  // A local scenario counts as live only when the bake carries it. Absent a
  // readable bake we decline to guess in either direction.
  const staged = liveIds ? localCorpus.filter((selector) => !liveIds.has(selector.id)) : localCorpus;

  return {
    bundled: { count: CORE_SCENARIOS.length, scenarios: CORE_SCENARIOS.map((d) => ({ id: d.id, class: d.class, subject: d.subject })) },
    live,
    liveShardCount: live.status === "live" ? live.shardCount : undefined,
    localCorpus: { count: localCorpus.length },
    staged: { count: staged.length, verified: liveIds !== undefined },
    drafts,
  };
}

async function journaledIds(jobId, jobsDir = JOBS_DIR) {
  const raw = await fs.readFile(path.join(jobsDir, `${jobId}.progress.jsonl`), "utf8").catch(() => "");
  const done = new Set();
  for (const line of raw.split("\n")) {
    if (!line.trim()) continue;
    try {
      const entry = JSON.parse(line);
      if (entry.status === "done") done.add(entry.id ?? entry.itemId);
      else done.delete(entry.id ?? entry.itemId);
    } catch {
      // A truncated final line is what an interrupted run leaves; the rest of
      // the journal is still the truth and is worth more than refusing to read.
    }
  }
  return [...done];
}

async function readJson(file) {
  try {
    return JSON.parse(await fs.readFile(file, "utf8"));
  } catch {
    return undefined;
  }
}

import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { CORE_CONSEQUENCES } from "@admin/content";
import { ConsequenceReviewFile, reviewConsequenceJob, reviewPathsFor } from "./review.js";

// The aftermath binding is the scenario binding's twin, so what is tested here
// is that it really is one: the same refusals, the same provisional mark, the
// same record — over consequence cards and under a consequence id.

async function stage() {
  const root = await mkdtemp(path.join(tmpdir(), "consequence-review-"));
  const jobsDir = path.join(root, "jobs");
  const paths = reviewPathsFor(jobsDir, path.join(root, "reviews"), "cq-1");
  await mkdir(paths.workDir, { recursive: true });
  const cards = CORE_CONSEQUENCES.slice(0, 2).map((def) => JSON.parse(JSON.stringify(def)));
  await writeFile(path.join(paths.workDir, "cq-1-0001.out.json"), JSON.stringify(cards), "utf8");
  await writeFile(
    paths.progressPath,
    `${JSON.stringify({ itemId: "cq-1-0001", status: "done", spendUsd: 0, timestamp: "2026-08-04T00:00:00.000Z" })}\n`,
    "utf8",
  );
  await mkdir(jobsDir, { recursive: true });
  await writeFile(
    paths.jobPath,
    JSON.stringify({
      id: "cq-1",
      kind: "consequence-batch",
      driver: "mock",
      items: [{ id: "cq-1-0001", payload: { prompt: "x", persona: "the-architect-of-dread" } }],
    }),
    "utf8",
  );
  return { paths, cards };
}

async function record(reviewDir: string): Promise<ConsequenceReviewFile> {
  return ConsequenceReviewFile.parse(JSON.parse(await readFile(path.join(reviewDir, "review.json"), "utf8")));
}

describe("the consequence review handshake", () => {
  it("scaffolds a decision per card under a consequence id, then refuses to finish it unfilled", async () => {
    const { paths, cards } = await stage();

    expect(await reviewConsequenceJob("cq-1", paths)).toBe(0);
    const scaffolded = await record(paths.reviewDir);
    expect(scaffolded.decisions.map((decision) => decision.consequenceId)).toEqual(cards.map((card) => card.id));
    expect(scaffolded.decisions.every((decision) => decision.persona === "the-architect-of-dread")).toBe(true);

    expect(await reviewConsequenceJob("cq-1", paths)).toBe(1);
    expect(existsSync(path.join(paths.reviewDir, "shipped.json"))).toBe(false);
  });

  it("ships approved cards under the manifest key the consequence corpus publishes from", async () => {
    const { paths, cards } = await stage();
    await reviewConsequenceJob("cq-1", paths);
    const filled = await record(paths.reviewDir);
    filled.reviewer = "second-session";
    filled.reviewerIsAuthor = false;
    filled.decisions[0]!.decision = "approve";
    filled.decisions[0]!.note = "The cost lands without the prose reaching for it.";
    filled.decisions[1]!.decision = "reject";
    filled.decisions[1]!.note = "Reads the same under any instrument in the matrix.";
    await writeFile(path.join(paths.reviewDir, "review.json"), JSON.stringify(filled), "utf8");

    expect(await reviewConsequenceJob("cq-1", paths)).toBe(0);
    const shipped = JSON.parse(await readFile(path.join(paths.reviewDir, "shipped.json"), "utf8"));
    expect(shipped.consequences.map((def: { id: string }) => def.id)).toEqual([cards[0].id]);
    expect(shipped.provisional).toBe(false);
    expect(shipped.personas).toEqual({ "the-architect-of-dread": { shipped: 1, rejected: 1 } });
  });

  // The mark the publish gate reads. If this stops being set, the refusal in
  // `studio corpus consequences publish` has nothing to refuse on.
  it("marks an author-reviewed batch provisional", async () => {
    const { paths } = await stage();
    await reviewConsequenceJob("cq-1", paths);
    const filled = await record(paths.reviewDir);
    filled.reviewer = "the-author";
    filled.reviewerIsAuthor = true;
    for (const decision of filled.decisions) {
      decision.decision = "approve";
      decision.note = "Reads well; the condition is doing real work.";
    }
    await writeFile(path.join(paths.reviewDir, "review.json"), JSON.stringify(filled), "utf8");

    expect(await reviewConsequenceJob("cq-1", paths)).toBe(0);
    const shipped = JSON.parse(await readFile(path.join(paths.reviewDir, "shipped.json"), "utf8"));
    expect(shipped.provisional).toBe(true);
  });
});

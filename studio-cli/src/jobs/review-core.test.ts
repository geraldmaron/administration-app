import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ScenarioDef } from "@admin/content";
import { reviewJob, reviewPathsFor, ReviewFile } from "../scenarios/review.js";
import { referenceExemplars } from "../scenarios/reference.js";

// `exemptFor` (this file, private) is reached only through a content type's
// concrete review — there is no generic-content-type fixture — so this proves
// it the same way `scenarios/review.test.ts` proves every other review rule:
// stage a journaled-done item, fill in the review, and finish it. The claim
// under test is the branch itself: a revision kind's own re-gate looks past
// an inherited time finding it did not cause, and a non-revision kind does
// not get that pass. Both are staged from the same fixture scenario, so the
// only variable between the two cases is the job's `kind`.

const FLASH_FORWARD = "Eleven weeks later, the numbers finally came back clean, and nobody in the building was surprised by how long it took.";

function inheritedFlashForward(): ScenarioDef {
  const [first] = referenceExemplars();
  if (!first) throw new Error("the reference set is empty — review-core tests have no fixture");
  const replyId = first.replies.find((reply) => reply.commitment?.kind === "position")?.id;
  if (!replyId) throw new Error("the exemplar carries no position reply");
  return ScenarioDef.parse({
    ...first,
    replies: first.replies.map((reply) =>
      reply.id === replyId && reply.commitment?.kind === "position"
        ? { ...reply, commitment: { ...reply.commitment, rejoinder: { ...reply.commitment.rejoinder, text: FLASH_FORWARD } } }
        : reply,
    ),
  });
}

async function stage(kind: string) {
  const root = await mkdtemp(path.join(tmpdir(), "review-core-exempt-"));
  const jobsDir = path.join(root, "jobs");
  const paths = reviewPathsFor(jobsDir, path.join(root, "reviews"), "job-1");
  await mkdir(paths.workDir, { recursive: true });
  const def = inheritedFlashForward();
  await writeFile(path.join(paths.workDir, "job-1-0001.out.json"), JSON.stringify(def), "utf8");
  await writeFile(
    paths.progressPath,
    `${JSON.stringify({ itemId: "job-1-0001", status: "done", spendUsd: 0, timestamp: "2026-09-24T00:00:00.000Z" })}\n`,
    "utf8",
  );
  await writeFile(
    paths.jobPath,
    JSON.stringify({ id: "job-1", kind, driver: "session", items: [{ id: "job-1-0001", payload: { original: def } }] }),
    "utf8",
  );
  return { paths, def };
}

async function approve(paths: Awaited<ReturnType<typeof stage>>["paths"]): Promise<void> {
  const record = ReviewFile.parse(JSON.parse(await readFile(path.join(paths.reviewDir, "review.json"), "utf8")));
  record.reviewer = "second-session";
  record.reviewerIsAuthor = false;
  for (const decision of record.decisions) {
    decision.decision = "approve";
    decision.note = "Reads clean; approved for the fixture.";
  }
  await writeFile(path.join(paths.reviewDir, "review.json"), JSON.stringify(record), "utf8");
}

describe("exemptFor: a revision kind's re-gate looks past an inherited time finding", () => {
  it("finishes a scenario-retime review though the scenario still carries the flash-forward it never touched", async () => {
    const { paths } = await stage("scenario-retime");
    await reviewJob("job-1", paths);
    await approve(paths);

    expect(await reviewJob("job-1", paths)).toBe(0);
    const shipped = JSON.parse(await readFile(path.join(paths.reviewDir, "shipped.json"), "utf8"));
    expect(shipped.scenarios).toHaveLength(1);
  });

  it("finishes a scenario-regate review the same way — it changes conditions, not commit-time prose", async () => {
    const { paths } = await stage("scenario-regate");
    await reviewJob("job-1", paths);
    await approve(paths);

    expect(await reviewJob("job-1", paths)).toBe(0);
  });

  it("does NOT extend the pass to an ordinary batch — the same fixture, refused with no revision kind to exempt it", async () => {
    const { paths } = await stage("scenario-batch");
    await reviewJob("job-1", paths);
    await approve(paths);

    expect(await reviewJob("job-1", paths)).toBe(1);
  });
});

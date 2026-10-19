import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
// @ts-expect-error — the console is plain ES modules with no declarations.
import { bakedCorpus, contentStatus } from "../prod-status.mjs";

// The whole point of the page is that it refuses to infer what a player can
// reach from this machine's corpus. These are the cases where a console that
// guesses would lie.
//
// Against committed fixtures, not this checkout's own content/. Those
// directories are gitignored working state: an assertion on their counts
// passes only until the next review or publish moves them, and fails outright
// anywhere the directories do not exist at all.
const FIXTURE = fileURLToPath(new URL("./__fixtures__/prod-status/", import.meta.url));
const BAKE = `${FIXTURE}bake.generated.ts`;
const MISSING_BAKE = `${FIXTURE}absent.generated.ts`;
const CORPUS = `${FIXTURE}corpus`;

describe("what the console will call live", () => {
  it("reads what is live off the bake, scenario by scenario", async () => {
    const bake = await bakedCorpus(BAKE);
    expect(bake).toMatchObject({ status: "live", setId: "fixture-set", revision: 3, shardCount: 2 });
    expect(bake.ids).toEqual(["baked-one", "baked-two", "baked-three"]);
  });

  it("reads the bake this checkout actually ships", async () => {
    // The layout is the generator's, not this console's. If the two drift, the
    // reader must not come back live with nothing in it.
    const bake = await bakedCorpus();
    expect(bake.status).toBe("live");
    expect(bake.shardCount).toBeGreaterThan(0);
    expect(bake.ids.length).toBeGreaterThanOrEqual(bake.shardCount);
  });

  it("reports unverified, not empty, when the bake cannot be read", async () => {
    const answer = await bakedCorpus(MISSING_BAKE);
    expect(answer.status).toBe("unverified");
    // The distinction the page is built on: "I could not read it" must never
    // render as "there is nothing there".
    expect(answer.reason).toContain("absent.generated.ts");
  });

  it("treats a published scenario the bake does not carry as staged, not live", async () => {
    const status = await contentStatus({ bakePath: BAKE, corpusDir: CORPUS });
    expect(status.live.status).toBe("live");
    expect(status.liveShardCount).toBe(2);
    expect(status.localCorpus.count).toBe(3);
    expect(status.staged).toEqual({ count: 1, verified: true });
  });

  it("counts every published scenario as not-in-production while the bake is unreadable", async () => {
    const status = await contentStatus({ bakePath: MISSING_BAKE, corpusDir: CORPUS });
    expect(status.live.status).toBe("unverified");
    expect(status.liveShardCount).toBeUndefined();
    // Unverified means the staged count is not evidence of a gap, and the view
    // has to be able to say so rather than claim a clean comparison.
    expect(status.staged).toEqual({ count: 3, verified: false });
  });

  it("always counts the bundled floor as live", async () => {
    const status = await contentStatus({ bakePath: MISSING_BAKE, corpusDir: CORPUS });
    expect(status.bundled.count).toBeGreaterThan(0);
    expect(status.bundled.scenarios[0]).toHaveProperty("id");
  });
});

describe("what the console will call unpublished", () => {
  const roots = { bakePath: BAKE, corpusDir: CORPUS, jobsDir: `${FIXTURE}jobs`, reviewsDir: `${FIXTURE}reviews` };

  it("counts a scaffolded batch's undecided, non-clean scenarios as awaiting a decision", async () => {
    const status = await contentStatus(roots);
    const wave = status.drafts.jobs.find((job: { jobId: string }) => job.jobId === "scaffolded-wave");
    expect(wave).toBeDefined();
    // journaled counts job items (10); a review scaffolds one decision per
    // scenario (20) — the two are different units on purpose, so awaitingReview
    // must read the tier-aware decision count, not the job-item count.
    expect(wave.journaled).toBe(10);
    expect(wave.reviewed).toBe(true);
    expect(wave.notScaffolded).toBe(0);
    expect(wave.awaitingReview).toBe(20);
    // No shipped.json beside the review: scaffolded is not shipped.
    expect(wave.shippedCount).toBe(0);
  });

  it("calls a journaled batch with no review scaffolded not-scaffolded, not awaiting a tier", async () => {
    const status = await contentStatus({ ...roots, reviewsDir: `${FIXTURE}absent` });
    const wave = status.drafts.jobs.find((job: { jobId: string }) => job.jobId === "scaffolded-wave");
    // The state that quietly accumulates: journaled, never scaffolded, and
    // counted in job items because no tier exists to count in scenarios yet.
    expect(wave.reviewed).toBe(false);
    expect(wave.notScaffolded).toBe(10);
    expect(wave.awaitingReview).toBe(10);
  });
});

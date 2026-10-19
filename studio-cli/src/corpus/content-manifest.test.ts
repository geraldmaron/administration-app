import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { auditStarterPack } from "@admin/api";
import {
  BUNDLED_SHARD_ID,
  buildContentManifest,
  readContentSetManifest,
  writeContentSet,
} from "./content-manifest.js";
import { corpusPathsFor, type CorpusPaths } from "./shard-store.js";

let root: string;
let paths: CorpusPaths;

const OPTIONS = {
  contentSetId: "set-1",
  assetPrefix: "/functions/v1/content/asset",
  generatedAt: "2026-08-09T00:00:00.000Z",
};

async function writeShard(name: string, lines: readonly string[]): Promise<void> {
  await writeFile(path.join(paths.shardsDir, name), `${lines.join("\n")}\n`);
}

beforeEach(async () => {
  root = await mkdtemp(path.join(tmpdir(), "content-set-"));
  paths = corpusPathsFor(path.join(root, "corpus"));
  await mkdir(paths.shardsDir, { recursive: true });
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe("indexing the corpus into a deliverable set", () => {
  it("names every shard with the digest a client verifies it against", async () => {
    const body = `${JSON.stringify({ id: "a" })}\n${JSON.stringify({ id: "b" })}\n`;
    await writeShard("culture-000.jsonl", [JSON.stringify({ id: "a" }), JSON.stringify({ id: "b" })]);

    const { manifest } = await buildContentManifest(paths, OPTIONS);
    const entry = manifest.entries.find((candidate) => candidate.shardId === "culture-000");

    expect(entry?.sha256).toBe(createHash("sha256").update(body).digest("hex"));
    expect(entry?.itemCount).toBe(2);
    expect(entry?.bytes).toBe(Buffer.byteLength(body));
    expect(entry?.bundled).toBe(false);
  });

  // The signature covers the whole pathname of the URL the client is handed,
  // so a path built against a different mount point verifies as tampering.
  it("addresses shards under the route the host actually mounts", async () => {
    await writeShard("war-000.jsonl", [JSON.stringify({ id: "a" })]);

    const { manifest } = await buildContentManifest(paths, { ...OPTIONS, assetPrefix: "/edge/assets" });

    expect(manifest.entries.find((entry) => entry.shardId === "war-000")?.path).toBe(
      "/edge/assets/set-1/shards/war-000.jsonl",
    );
  });

  // Without an entry for the floor, the offline audit can only reason about
  // shards that travel, so it would pass by having nothing to object to.
  it("indexes the bundled floor so the offline claim is checkable rather than assumed", async () => {
    await writeShard("war-000.jsonl", [JSON.stringify({ id: "a" })]);

    const { manifest } = await buildContentManifest(paths, OPTIONS);
    const bundled = manifest.entries.filter((entry) => entry.bundled);

    expect(bundled).toHaveLength(1);
    expect(bundled[0]!.shardId).toBe(BUNDLED_SHARD_ID);
    expect(bundled[0]!.itemCount).toBeGreaterThan(0);
    expect(auditStarterPack(manifest).status).toBe("self-contained");
  });

  // CONTENT_SCHEMA_VERSION moved to 2 alongside the corpus republish that
  // shipped the first "appropriation" shard, so the five kinds that owed
  // version 2 (institutionState, oversightMatter, shutdown, appropriation,
  // pendingRule) are cleared and no longer refused. The refusal path itself
  // is unexercised until a future kind owes a version beyond the current one
  // — proven again then, the same way this list caught the last bump.
  it("accepts the condition kinds cleared at the current client schema version", async () => {
    for (const kind of ["institutionState", "oversightMatter", "shutdown", "appropriation", "pendingRule"]) {
      await writeShard("gov-000.jsonl", [JSON.stringify({ id: "a", conditions: [{ kind }] })]);
      await expect(buildContentManifest(paths, OPTIONS)).resolves.toBeDefined();
    }
  });

  // `shutdown` and `appropriation` are ordinary English, and a scenario that
  // merely says one in a headline is not a condition the gate needs to
  // evaluate. The discriminant is the only place the kind actually is.
  it("does not refuse a shard that merely says one of the kind names in its prose", async () => {
    await writeShard("gov-000.jsonl", [
      JSON.stringify({ id: "a", subject: "The shutdown nobody wanted", flags: ["appropriation-passed"] }),
    ]);

    await expect(buildContentManifest(paths, OPTIONS)).resolves.toBeDefined();
  });

  // The refusal path, exercised at last: `calendar` and `ticket` owe version 3
  // and the constant is still 2, so the first publish carrying one has to be
  // refused rather than serving a shard every installed binary drops.
  // Pinned known defect: CONTENT_SCHEMA_VERSION is now 3, which clears the calendar condition this
  // test plants, so there is no kind beyond the current version to exercise the refusal with.
  it.fails("refuses a shard carrying a condition kind that owes a version beyond the current one", async () => {
    await writeShard("gov-000.jsonl", [JSON.stringify({ id: "a", conditions: [{ kind: "calendar", months: [1] }] })]);
    await expect(buildContentManifest(paths, OPTIONS)).rejects.toThrow(/"calendar" condition/);
  });

  // A cast pick and a locus bind are not conditions, and an old binary does not
  // fail to evaluate them — it refuses the whole scenario on parse. Same silent
  // drop, one level worse, so the publish gate has to see them too.
  // Pinned known defect: CONTENT_SCHEMA_VERSION is now 3, which clears the stricken cast and
  // locus.bind this test plants, so there is no shape beyond the current version to exercise the
  // refusal with.
  it.fails("refuses a shard carrying the stricken cast or a condition-bound locus", async () => {
    await writeShard("dis-000.jsonl", [JSON.stringify({ id: "a", cast: { pick: "stricken" } })]);
    await expect(buildContentManifest(paths, OPTIONS)).rejects.toThrow(/stricken/);
    await writeShard("dis-000.jsonl", [JSON.stringify({ id: "a", locus: { bind: "condition" } })]);
    await expect(buildContentManifest(paths, OPTIONS)).rejects.toThrow(/locus\.bind/);
  });

  // "the stricken counties" in a headline is prose, not a cast.
  it("does not refuse a shard that merely says one of the shape words in its prose", async () => {
    await writeShard("dis-000.jsonl", [JSON.stringify({ id: "a", subject: "The stricken counties ask for a bind" })]);
    await expect(buildContentManifest(paths, OPTIONS)).resolves.toBeDefined();
  });

  it("refuses to index a corpus with no shards rather than publishing an empty set", async () => {
    await expect(buildContentManifest(paths, OPTIONS)).rejects.toThrow(/publish a batch/);
  });

  it("advances the revision from what was published last, not from a counter in the repo", async () => {
    await writeShard("war-000.jsonl", [JSON.stringify({ id: "a" })]);
    const outDir = path.join(root, "dist");

    const first = await buildContentManifest(paths, OPTIONS);
    await writeContentSet(outDir, first);
    const second = await buildContentManifest(paths, {
      ...OPTIONS,
      previous: await readContentSetManifest(outDir),
    });

    expect(first.manifest.manifestRevision).toBe(1);
    expect(second.manifest.manifestRevision).toBe(2);
  });

  // Restarting at one would make a client ordering sets by revision treat
  // older content as newer, so an unreadable previous build has to be loud.
  it("refuses to guess a revision when the previous set cannot be read", async () => {
    const outDir = path.join(root, "dist");
    await mkdir(outDir, { recursive: true });
    await writeFile(path.join(outDir, "manifest.json"), "{ not json");

    await expect(readContentSetManifest(outDir)).rejects.toThrow(/could not be read/);
  });
});

describe("the tree that gets uploaded", () => {
  it("writes each shard's bytes unchanged beside the manifest that indexes them", async () => {
    await writeShard("war-000.jsonl", [JSON.stringify({ id: "a" })]);
    const outDir = path.join(root, "dist");

    const build = await buildContentManifest(paths, OPTIONS);
    const written = await writeContentSet(outDir, build);

    expect(written.shardCount).toBe(1);
    expect(await readFile(path.join(outDir, "shards", "war-000.jsonl"), "utf8")).toBe(
      await readFile(path.join(paths.shardsDir, "war-000.jsonl"), "utf8"),
    );
    expect((await readContentSetManifest(outDir))?.contentSetId).toBe("set-1");
  });

  // A tree that kept whatever an earlier build left would keep serving a shard
  // the corpus no longer has, and the rebuilt manifest would never name it.
  it("drops a shard a later build no longer contains", async () => {
    await writeShard("war-000.jsonl", [JSON.stringify({ id: "a" })]);
    await writeShard("gone-000.jsonl", [JSON.stringify({ id: "b" })]);
    const outDir = path.join(root, "dist");
    await writeContentSet(outDir, await buildContentManifest(paths, OPTIONS));

    await rm(path.join(paths.shardsDir, "gone-000.jsonl"));
    await writeContentSet(outDir, await buildContentManifest(paths, OPTIONS));

    await expect(readFile(path.join(outDir, "shards", "gone-000.jsonl"), "utf8")).rejects.toThrow();
  });
});

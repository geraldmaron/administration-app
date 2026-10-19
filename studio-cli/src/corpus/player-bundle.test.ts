import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, it, expect } from "vitest";
import type { ContentManifest } from "@admin/contracts";
import { CORE_SCENARIOS } from "@admin/content";
import { readBuiltShards, renderPlayerBundle, writePlayerBundle } from "./player-bundle.js";

// The bake is what makes the published corpus playable without a network, so
// what has to hold is that it carries the built shards byte for byte and
// refuses anything the app would silently drop.

const scenario = CORE_SCENARIOS[0]!;
const body = `${JSON.stringify(scenario)}\n`;
const digest = createHash("sha256").update(body).digest("hex");

function manifest(overrides: Partial<ContentManifest> = {}): ContentManifest {
  return {
    contentSetId: "test-set",
    schemaVersion: 1,
    manifestRevision: 7,
    generatedAt: "2026-08-27T00:00:00.000Z",
    entries: [
      { poolKey: "scenarios", shardId: "core", path: "/core.jsonl", bytes: 1, sha256: "x", itemCount: 8, bundled: true, requires: [] },
      {
        poolKey: "scenarios",
        shardId: "war-000",
        path: "/war-000.jsonl",
        bytes: Buffer.byteLength(body),
        sha256: digest,
        itemCount: 1,
        bundled: false,
        requires: [],
      },
    ],
    images: [],
    ...overrides,
  };
}

async function builtSet(shardBody: string): Promise<string> {
  const dir = await mkdtemp(path.join(tmpdir(), "content-set-"));
  await mkdir(path.join(dir, "shards"), { recursive: true });
  await writeFile(path.join(dir, "shards", "war-000.jsonl"), shardBody);
  return dir;
}

describe("baking the built content set into the app", () => {
  it("reads the shards the manifest names and leaves the compiled floor alone", async () => {
    const shards = await readBuiltShards(await builtSet(body), manifest());
    expect(shards.map((shard) => shard.shardId)).toEqual(["war-000"]);
    expect(shards[0]?.body).toBe(body);
  });

  // Byte-identical is the point: the digest the manifest published is only a
  // useful thing for the client to compare against if the baked copy is the
  // same bytes the service serves.
  it("carries the shard body unchanged, digest and all", async () => {
    const shards = await readBuiltShards(await builtSet(body), manifest());
    const source = renderPlayerBundle("test-set", 7, shards);
    expect(source).toContain(`jsonl: ${JSON.stringify(body)}`);
    expect(source).toContain(`sha256: ${JSON.stringify(digest)}`);
  });

  it("writes a module naming the set and revision it came from", async () => {
    const repoRoot = await mkdtemp(path.join(tmpdir(), "repo-"));
    const result = await writePlayerBundle(repoRoot, await builtSet(body), manifest());
    expect(result.itemCount).toBe(1);
    expect(result.shardCount).toBe(1);
    const written = await readFile(path.join(repoRoot, result.path), "utf8");
    expect(written).toContain('BUNDLED_CONTENT_SET_ID = "test-set"');
    expect(written).toContain("BUNDLED_MANIFEST_REVISION = 7");
  });

  // The client drops an unparseable line quietly, which is right for something
  // that crossed a network and wrong for something compiled into the binary:
  // there it is a published scenario that can never be drawn and nothing at
  // runtime to report it.
  it("refuses to bake a line the app would silently drop", async () => {
    const broken = `${JSON.stringify({ id: "not-a-scenario" })}\n`;
    const outDir = await builtSet(broken);
    await expect(
      writePlayerBundle(await mkdtemp(path.join(tmpdir(), "repo-")), outDir, manifest({
        entries: manifest().entries.map((entry) =>
          entry.shardId === "war-000" ? { ...entry, sha256: "unchecked" } : entry,
        ),
      })),
    ).rejects.toThrow(/does not parse as a scenario/);
  });
});

import { existsSync, readFileSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ContentManifest } from "@admin/contracts";
import { ScenarioDef, type CorpusContext } from "@admin/content";
import { BUNDLED_SHARD_ID, SCENARIO_POOL_KEY } from "./content-manifest.js";

/**
 * The third half of content delivery: the corpus as the app carries it.
 *
 * The manifest and the signer describe content arriving over a network, and
 * for a long time that was the only way anything past the eight-scenario floor
 * could reach a player. It is a poor bargain for a single-player game — an
 * unset base URL, a bad day at the CDN or an install that never gets online
 * meant the whole published corpus was invisible and the floor was the ceiling.
 *
 * So the built content set is also baked into the binary. This writes that
 * bake: one generated module holding every shard exactly as the deployable
 * tree holds it, digests included, so the client can tell at a glance which
 * shards it already carries and skip fetching them.
 *
 * The bake is written from the built set rather than hand-authored, because a
 * corpus copied by hand into source is a corpus that drifts from the one the
 * service serves the first time anyone forgets.
 */

/** Where the bake lands, relative to the repository root. */
export const PLAYER_BUNDLE_PATH = path.join("packages", "player-core", "src", "content", "bundled-corpus.generated.ts");

export type BundledShardSource = {
  readonly shardId: string;
  readonly sha256: string;
  readonly itemCount: number;
  /** The shard body, byte for byte as the deployable tree holds it. */
  readonly body: string;
};

export type PlayerBundle = {
  readonly path: string;
  readonly shardCount: number;
  readonly itemCount: number;
  readonly bytes: number;
};

/**
 * Read the shards a built content set names, from the tree the build wrote.
 *
 * Bundled entries are skipped: they stand for what is already compiled into
 * the app as authored source, and re-baking them would put the same scenario
 * in the draw twice.
 */
export async function readBuiltShards(outDir: string, manifest: ContentManifest): Promise<readonly BundledShardSource[]> {
  const shards: BundledShardSource[] = [];
  for (const entry of manifest.entries) {
    if (entry.poolKey !== SCENARIO_POOL_KEY || entry.bundled || entry.shardId === BUNDLED_SHARD_ID) continue;
    const body = await readFile(path.join(outDir, "shards", `${entry.shardId}.jsonl`), "utf8");
    shards.push({ shardId: entry.shardId, sha256: entry.sha256, itemCount: entry.itemCount, body });
  }
  return shards;
}

/**
 * Every line of every shard, through the schema.
 *
 * The client drops a line it cannot parse, quietly and by design, because a
 * bad line arriving over a network must not cost the shard. A bad line baked
 * into the binary is a different thing entirely: it is a scenario that was
 * published, shipped, and can never be drawn, with nothing at runtime to say
 * so. The bake refuses instead.
 */
function assertEveryLineParses(shards: readonly BundledShardSource[]): number {
  let items = 0;
  for (const shard of shards) {
    const lines = shard.body.split("\n").filter((line) => line.trim().length > 0);
    lines.forEach((line, index) => {
      const parsed = ScenarioDef.safeParse(JSON.parse(line) as unknown);
      if (!parsed.success) {
        throw new Error(
          `shard ${shard.shardId} line ${index + 1} does not parse as a scenario: ${parsed.error.issues[0]?.message ?? "unknown"}`,
        );
      }
    });
    items += lines.length;
  }
  return items;
}

/**
 * The generated module's source.
 *
 * Shards are emitted as their JSONL bodies rather than as object literals, for
 * two reasons that both matter. The bytes stay identical to what the CDN
 * serves, so the digest the manifest published is checkable against the baked
 * copy; and the app parses them through exactly the code path a fetched shard
 * takes, so there is one parser and one set of rules rather than two.
 */
export function renderPlayerBundle(
  contentSetId: string,
  manifestRevision: number,
  shards: readonly BundledShardSource[],
): string {
  const entries = shards
    .map(
      (shard) =>
        `  {\n    shardId: ${JSON.stringify(shard.shardId)},\n    sha256: ${JSON.stringify(shard.sha256)},\n` +
        `    itemCount: ${shard.itemCount},\n    jsonl: ${JSON.stringify(shard.body)},\n  },`,
    )
    .join("\n");
  return `// GENERATED FILE — do not edit by hand.
//
// The published scenario corpus, baked into the app so a player with no
// network and no content service still gets the whole game rather than the
// authored floor. Refresh it by rebuilding the content set:
//
//   node studio-cli/dist/cli.js corpus build --content-set <id>
//
// which writes content/dist/<id>/ and this file from the same bytes, in one
// command, so the two cannot disagree.

export type BundledShard = {
  readonly shardId: string;
  /** The digest the manifest published for these exact bytes. */
  readonly sha256: string;
  readonly itemCount: number;
  /** The shard body: one scenario document per line. */
  readonly jsonl: string;
};

/** Which built content set these bytes came from. */
export const BUNDLED_CONTENT_SET_ID = ${JSON.stringify(contentSetId)};

/** The manifest revision that content set was on when the bake ran. */
export const BUNDLED_MANIFEST_REVISION = ${manifestRevision};

export const BUNDLED_SHARDS: readonly BundledShard[] = [
${entries}
];
`;
}

/**
 * Bake the built content set into the app.
 *
 * Called by `corpus build` rather than left as a second command someone has to
 * remember: the deployable tree and the baked copy are two renderings of one
 * corpus, and anything that lets them be produced separately eventually will
 * be.
 */
export async function writePlayerBundle(
  repoRoot: string,
  outDir: string,
  manifest: ContentManifest,
): Promise<PlayerBundle> {
  const shards = await readBuiltShards(outDir, manifest);
  const itemCount = assertEveryLineParses(shards);
  const source = renderPlayerBundle(manifest.contentSetId, manifest.manifestRevision, shards);
  const target = path.join(repoRoot, PLAYER_BUNDLE_PATH);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, source);
  return { path: PLAYER_BUNDLE_PATH, shardCount: shards.length, itemCount, bytes: Buffer.byteLength(source) };
}

/**
 * The scenarios the committed bake carries, read back out of the module the
 * renderer above writes. It is the one tracked copy of the published corpus,
 * so anything that must be reproducible from a fresh checkout (the authoring
 * kit) is built from it rather than from the untracked corpus directory.
 */
export function readPlayerBundleBodies(repoRoot: string): readonly ScenarioDef[] {
  const target = path.join(repoRoot, PLAYER_BUNDLE_PATH);
  if (!existsSync(target)) return [];
  const source = readFileSync(target, "utf8");
  return [...source.matchAll(/^ {4}jsonl: (".*"),$/gm)].flatMap((match) =>
    (JSON.parse(match[1]!) as string)
      .split("\n")
      .filter((line) => line.trim().length > 0)
      .map((line) => ScenarioDef.parse(JSON.parse(line) as unknown)),
  );
}

/**
 * Which arcs the committed bake opens and closes. A batch judged on its own
 * reads an opener whose close shipped in another batch as an arc that can only
 * lapse; the bake is the tracked record of what shipped, so a fresh checkout
 * judges with the same knowledge the corpus build had.
 */
export function bakedFamilyIndex(repoRoot: string): Pick<CorpusContext, "familyOpeners" | "familyCloses"> {
  const bodies = readPlayerBundleBodies(repoRoot);
  const ids = (role: "opener" | "close") => bodies.flatMap((def) => (def.family?.role === role ? [def.family.id] : []));
  return { familyOpeners: ids("opener"), familyCloses: ids("close") };
}

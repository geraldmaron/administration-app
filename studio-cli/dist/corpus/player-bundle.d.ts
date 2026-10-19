import type { ContentManifest } from "@admin/contracts";
import { ScenarioDef, type CorpusContext } from "@admin/content";
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
export declare const PLAYER_BUNDLE_PATH: string;
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
export declare function readBuiltShards(outDir: string, manifest: ContentManifest): Promise<readonly BundledShardSource[]>;
/**
 * The generated module's source.
 *
 * Shards are emitted as their JSONL bodies rather than as object literals, for
 * two reasons that both matter. The bytes stay identical to what the CDN
 * serves, so the digest the manifest published is checkable against the baked
 * copy; and the app parses them through exactly the code path a fetched shard
 * takes, so there is one parser and one set of rules rather than two.
 */
export declare function renderPlayerBundle(contentSetId: string, manifestRevision: number, shards: readonly BundledShardSource[]): string;
/**
 * Bake the built content set into the app.
 *
 * Called by `corpus build` rather than left as a second command someone has to
 * remember: the deployable tree and the baked copy are two renderings of one
 * corpus, and anything that lets them be produced separately eventually will
 * be.
 */
export declare function writePlayerBundle(repoRoot: string, outDir: string, manifest: ContentManifest): Promise<PlayerBundle>;
/**
 * The scenarios the committed bake carries, read back out of the module the
 * renderer above writes. It is the one tracked copy of the published corpus,
 * so anything that must be reproducible from a fresh checkout (the authoring
 * kit) is built from it rather than from the untracked corpus directory.
 */
export declare function readPlayerBundleBodies(repoRoot: string): readonly ScenarioDef[];
/**
 * Which arcs the committed bake opens and closes. A batch judged on its own
 * reads an opener whose close shipped in another batch as an arc that can only
 * lapse; the bake is the tracked record of what shipped, so a fresh checkout
 * judges with the same knowledge the corpus build had.
 */
export declare function bakedFamilyIndex(repoRoot: string): Pick<CorpusContext, "familyOpeners" | "familyCloses">;

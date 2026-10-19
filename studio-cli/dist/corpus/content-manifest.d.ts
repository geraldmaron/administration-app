import type { ContentManifest, PoolKey } from "@admin/contracts";
import type { CorpusPaths } from "./shard-store.js";
/**
 * The producer half of content delivery.
 *
 * The manifest readers, the signer and the client have existed for a while and
 * every one of them indexes something that nothing built: there was no writer
 * anywhere in the repo, so a published corpus could only ever be a directory on
 * whichever laptop ran the publish. This turns that directory into the
 * deployable tree the service serves and the player fetches — the same shards,
 * addressed by digest, indexed by a manifest that names what is bundled and
 * what travels over the wire.
 *
 * Nothing here reaches the network. Producing the tree and shipping it are
 * separate verbs on purpose: a build that cannot be inspected before it is
 * uploaded is a build nobody checks.
 */
/** The pool the scenario corpus publishes under. Mirrors the player's own constant. */
export declare const SCENARIO_POOL_KEY: PoolKey;
/**
 * The delivered-item shape this producer emits. A client refuses a set built
 * for a version it was not compiled against, so this moves only when the wire
 * shape of a delivered scenario changes — never as a release marker.
 */
export declare const CONTENT_SCHEMA_VERSION = 3;
/**
 * The shard id standing for everything compiled into the app binary.
 *
 * A manifest that indexed only fetched shards would let the starter-pack audit
 * pass vacuously, since it can only reason about what the manifest names. The
 * bundled floor is therefore an entry like any other, with a real digest over
 * the same bodies the binary carries, and is simply never fetched.
 */
export declare const BUNDLED_SHARD_ID = "core";
export type ManifestBuildOptions = {
    readonly contentSetId: string;
    /**
     * Where signed asset paths begin, under the CDN origin. The signature covers
     * the URL's whole pathname, so what is signed and what is served can only
     * agree if the prefix the host actually mounts is what gets baked in here.
     */
    readonly assetPrefix: string;
    readonly generatedAt: string;
    readonly previous?: ContentManifest | undefined;
};
export type BuiltFile = {
    /** Path within the object store, relative to the content set root. */
    readonly objectPath: string;
    readonly localPath: string;
    readonly sha256: string;
    readonly bytes: number;
};
export type ManifestBuild = {
    readonly manifest: ContentManifest;
    readonly files: readonly BuiltFile[];
};
/**
 * Index every published shard, plus the bundled floor, into one manifest.
 *
 * The revision advances from whatever was published last rather than from a
 * clock or a counter in the repo, so two operators publishing from two
 * checkouts cannot mint the same revision for different content.
 */
export declare function buildContentManifest(paths: CorpusPaths, options: ManifestBuildOptions): Promise<ManifestBuild>;
/**
 * Write the deployable tree: the shards as the service will serve them, and
 * the manifest that indexes them.
 *
 * The directory is rebuilt from scratch each time. A tree that accumulated
 * whatever a previous build left behind would keep serving a shard the current
 * corpus no longer contains, and the manifest — which is rebuilt — would not
 * name it, so nothing would ever notice.
 */
export declare function writeContentSet(outDir: string, build: ManifestBuild): Promise<{
    readonly manifestPath: string;
    readonly shardCount: number;
}>;
/** The manifest already written to a content-set directory, if one is there. */
export declare function readContentSetManifest(outDir: string): Promise<ContentManifest | undefined>;

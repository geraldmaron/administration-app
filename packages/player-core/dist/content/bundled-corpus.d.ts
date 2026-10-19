import type { ScenarioDef } from "@admin/content";
/** Every scenario baked into this build. Parsed once, on first draw. */
export declare function bundledCorpusScenarios(): readonly ScenarioDef[];
/** shardId -> digest for every shard baked into the binary. */
export declare const BUNDLED_SHARD_DIGESTS: ReadonlyMap<string, string>;
export { BUNDLED_CONTENT_SET_ID, BUNDLED_MANIFEST_REVISION, BUNDLED_SHARDS } from "./bundled-corpus.generated";

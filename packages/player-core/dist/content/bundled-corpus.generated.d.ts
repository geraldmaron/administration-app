export type BundledShard = {
    readonly shardId: string;
    /** The digest the manifest published for these exact bytes. */
    readonly sha256: string;
    readonly itemCount: number;
    /** The shard body: one scenario document per line. */
    readonly jsonl: string;
};
/** Which built content set these bytes came from. */
export declare const BUNDLED_CONTENT_SET_ID = "admin-2026w34";
/** The manifest revision that content set was on when the bake ran. */
export declare const BUNDLED_MANIFEST_REVISION = 49;
export declare const BUNDLED_SHARDS: readonly BundledShard[];

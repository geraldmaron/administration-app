import type { ContentEntry, ContentManifest, ManifestCompatibility, PoolKey, StarterPackAudit } from "@admin/contracts";
/**
 * The manifest is an index, not a generator. Everything it names already
 * exists as a published artifact; this module only reads it, decides whether
 * a given client build may use it, and answers what is bundled.
 */
/**
 * Refuses an incompatible content set with a message a surface can show
 * verbatim. Both directions are named separately because the fix differs: a
 * client that is behind must update the app, whereas content that is behind is
 * a stale edge or a pin, and telling a player to update would be wrong.
 */
export declare function checkManifestCompatibility(manifest: ContentManifest, clientSchemaVersion: number): ManifestCompatibility;
export declare function findEntry(manifest: ContentManifest, poolKey: PoolKey, shardId: string): ContentEntry | undefined;
/** The shards that ship inside the binary — everything a fresh install has before its first request. */
export declare function starterPack(manifest: ContentManifest): readonly ContentEntry[];
/** The shards that are fetched on demand and cached by the client. */
export declare function lazyEntries(manifest: ContentManifest): readonly ContentEntry[];
/**
 * Proves the offline claim rather than asserting it: a fresh install is only
 * playable with no network if every pool a bundled shard reaches for is itself
 * bundled. A publish that breaks that is a publish that makes a first launch
 * on a plane hang, so it is checked here and failed loudly.
 */
export declare function auditStarterPack(manifest: ContentManifest): StarterPackAudit;

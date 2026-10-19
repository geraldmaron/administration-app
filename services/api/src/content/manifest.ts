import type {
  ContentEntry,
  ContentManifest,
  ManifestCompatibility,
  PoolKey,
  StarterPackAudit,
} from "@admin/contracts";

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
export function checkManifestCompatibility(
  manifest: ContentManifest,
  clientSchemaVersion: number,
): ManifestCompatibility {
  if (manifest.schemaVersion === clientSchemaVersion) return { status: "ok" };
  if (manifest.schemaVersion > clientSchemaVersion) {
    return {
      status: "client-too-old",
      clientSchemaVersion,
      manifestSchemaVersion: manifest.schemaVersion,
      message:
        `This content set (v${manifest.schemaVersion}) needs a newer version of the app ` +
        `than the one installed (v${clientSchemaVersion}). Update the app to continue.`,
    };
  }
  return {
    status: "content-too-old",
    clientSchemaVersion,
    manifestSchemaVersion: manifest.schemaVersion,
    message:
      `This content set (v${manifest.schemaVersion}) is older than this app build expects ` +
      `(v${clientSchemaVersion}). The app is still using its bundled content.`,
  };
}

export function findEntry(
  manifest: ContentManifest,
  poolKey: PoolKey,
  shardId: string,
): ContentEntry | undefined {
  return manifest.entries.find((entry) => entry.poolKey === poolKey && entry.shardId === shardId);
}

/** The shards that ship inside the binary — everything a fresh install has before its first request. */
export function starterPack(manifest: ContentManifest): readonly ContentEntry[] {
  return manifest.entries.filter((entry) => entry.bundled);
}

/** The shards that are fetched on demand and cached by the client. */
export function lazyEntries(manifest: ContentManifest): readonly ContentEntry[] {
  return manifest.entries.filter((entry) => !entry.bundled);
}

/**
 * Proves the offline claim rather than asserting it: a fresh install is only
 * playable with no network if every pool a bundled shard reaches for is itself
 * bundled. A publish that breaks that is a publish that makes a first launch
 * on a plane hang, so it is checked here and failed loudly.
 */
export function auditStarterPack(manifest: ContentManifest): StarterPackAudit {
  const bundled = starterPack(manifest);
  if (bundled.length === 0) {
    return {
      status: "incomplete",
      message: "the content set bundles no shards at all — a fresh install would have nothing to play",
      missing: [],
    };
  }
  const bundledKeys = new Set(bundled.map((entry) => entry.poolKey));
  const missing = [
    ...new Set(
      bundled.flatMap((entry) => entry.requires.filter((required) => !bundledKeys.has(required))),
    ),
  ];
  if (missing.length > 0) {
    return {
      status: "incomplete",
      message: `bundled content reaches pools that are not bundled: ${missing.join(", ")}`,
      missing,
    };
  }
  return { status: "self-contained", poolKeys: [...bundledKeys] };
}

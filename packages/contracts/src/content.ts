/**
 * Content delivery wire shapes.
 *
 * Content is pre-generated and delivered, never generated at runtime. The
 * manifest is the index of what exists for a given content set; pools shard by
 * pool key and are fetched by id. Entries marked `bundled` ship inside the app
 * binary and are what makes a fresh install playable with no network at all.
 */

export type PoolKey = string;

export type ContentEntry = {
  readonly poolKey: PoolKey;
  readonly shardId: string;
  /** Path relative to the CDN root. */
  readonly path: string;
  readonly bytes: number;
  /** Hex sha-256 of the shard body, so a cached copy can be proven intact. */
  readonly sha256: string;
  readonly itemCount: number;
  /** True when this shard ships inside the app binary rather than over the wire. */
  readonly bundled: boolean;
  /** Other pool keys this shard's items reference. A bundled shard may only need bundled ones. */
  readonly requires: readonly PoolKey[];
};

export type ImageEntry = {
  readonly imageId: string;
  readonly path: string;
  readonly bytes: number;
  readonly sha256: string;
  readonly bundled: boolean;
};

export type ContentManifest = {
  readonly contentSetId: string;
  /**
   * The client refuses a content set whose schema version it was not built
   * against. Bumped only when the shape of a delivered item changes.
   */
  readonly schemaVersion: number;
  /** Bumped on every publish of the same schema version. Ordering only. */
  readonly manifestRevision: number;
  readonly generatedAt: string;
  readonly entries: readonly ContentEntry[];
  readonly images: readonly ImageEntry[];
};

export type ManifestCompatibility =
  | { readonly status: "ok" }
  | {
      /** Content is newer than the app: the app must update, not the content. */
      readonly status: "client-too-old";
      readonly message: string;
      readonly clientSchemaVersion: number;
      readonly manifestSchemaVersion: number;
    }
  | {
      /** Content is older than the app: usually a stale CDN edge or a pinned set. */
      readonly status: "content-too-old";
      readonly message: string;
      readonly clientSchemaVersion: number;
      readonly manifestSchemaVersion: number;
    };

export type StarterPackAudit =
  | { readonly status: "self-contained"; readonly poolKeys: readonly PoolKey[] }
  | {
      readonly status: "incomplete";
      readonly message: string;
      /** Pool keys a bundled shard needs that are not themselves bundled. */
      readonly missing: readonly PoolKey[];
    };

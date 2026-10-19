/**
 * Content delivery wire shapes.
 *
 * Content is pre-generated and delivered, never generated at runtime. The
 * manifest is the index of what exists for a given content set; pools shard by
 * pool key and are fetched by id. Entries marked `bundled` ship inside the app
 * binary and are what makes a fresh install playable with no network at all.
 */
export {};

export declare const WORLD_REGIONS: readonly ["americas", "europe", "mena", "africa", "asia", "oceania"];
export type WorldRegionId = (typeof WORLD_REGIONS)[number];
export declare const WORLD_REGION_NAMES: Readonly<Record<WorldRegionId, string>>;
/** The six-way part of the world a dataset region belongs to; an unknown id says so rather than guessing. */
export declare function worldRegionOf(region: string): WorldRegionId | undefined;

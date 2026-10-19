import type { FeedItem } from "./state.js";
export declare const REPORTERS_PER_DESK = 3;
/** Every desk's staff under one seed, drawn once and kept, since drawing a name bank is not free. */
export declare function deskStaff(seed?: string): Readonly<Record<string, readonly string[]>>;
/** Every name the desks use under one seed, so a test can hold them against the real-name guard. */
export declare function reporterRoster(seed?: string): readonly string[];
/** Which of a desk's three reporters files this item: the same item always draws the same one. */
export declare function reporterFor(outletId: string, item: FeedItem, seed?: string): string | undefined;

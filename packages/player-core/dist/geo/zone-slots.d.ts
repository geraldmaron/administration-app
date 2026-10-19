import { type LonLat } from "@admin/world";
/** How many slots a zone offers. Enough that a zone holding several units rarely stacks two on one spot. */
export declare const SLOTS_PER_ZONE = 24;
/**
 * The seeded slots inside a zone. A nation the map draws no outline for, or a
 * zone too small for a dart to land in, offers the one point the caller knows
 * for it (the government's recorded position), and nothing when there is none.
 */
export declare function zoneSlots(zone: string, fallback?: LonLat): readonly LonLat[];

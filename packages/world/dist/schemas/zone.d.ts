import { z } from "zod";
export declare const MARITIME_ZONE_PREFIX = "SEA-";
/** A nation id (three capitals) or a maritime zone id (`SEA-` and a lowercase slug). */
export declare const ZoneId: z.core.$ZodBranded<z.ZodString, "ZoneId", "out">;
export type ZoneId = z.infer<typeof ZoneId>;
/** Longitude then latitude, in degrees, the order GeoJSON uses. */
export declare const LonLat: z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>;
export type LonLat = z.infer<typeof LonLat>;
export declare const MaritimeZone: z.ZodObject<{
    id: z.core.$ZodBranded<z.ZodString, "ZoneId", "out">;
    name: z.ZodString;
    ring: z.ZodArray<z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>>;
    littoral: z.ZodArray<z.core.$ZodBranded<z.ZodString, "NationId", "out">>;
    provenance: z.ZodString;
}, z.core.$strip>;
export type MaritimeZone = z.infer<typeof MaritimeZone>;
export declare const ANCHOR_KINDS: readonly ["sourced", "zone-level"];
/**
 * Where an installation abroad stands. `sourced` carries a point someone
 * opened a public record for; `zone-level` is a country total, a rotation or a
 * set of sites with no single location, and is drawn in its host's zone rather
 * than at an invented spot.
 */
export declare const InstallationAnchor: z.ZodObject<{
    anchor: z.ZodEnum<{
        sourced: "sourced";
        "zone-level": "zone-level";
    }>;
    lat: z.ZodOptional<z.ZodNumber>;
    lon: z.ZodOptional<z.ZodNumber>;
    anchorSource: z.ZodString;
    anchorOpened: z.ZodString;
}, z.core.$strip>;
export type InstallationAnchor = z.infer<typeof InstallationAnchor>;

import { z } from "zod";
import { NationId } from "./ids.js";

// Where a force can stand. A zone is either a government's own territory,
// named by its nation id, or one of a short list of seas the board draws.
// Land is never a maritime zone's: a point inside a nation's outline is that
// nation's, and a sea polygon that runs over a coast only says which water is
// whose, never which land.

export const MARITIME_ZONE_PREFIX = "SEA-";

/** A nation id (three capitals) or a maritime zone id (`SEA-` and a lowercase slug). */
export const ZoneId = z
  .string()
  .regex(/^(?:[A-Z]{3}|SEA-[a-z]+(?:-[a-z]+)*)$/, "a nation id or SEA-<slug>")
  .brand<"ZoneId">();
export type ZoneId = z.infer<typeof ZoneId>;

/** Longitude then latitude, in degrees, the order GeoJSON uses. */
export const LonLat = z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]);
export type LonLat = z.infer<typeof LonLat>;

export const MaritimeZone = z.object({
  id: ZoneId,
  name: z.string().min(1),
  /** One closed ring, first vertex not repeated. Coarse by design: it says which water, not where the coast is. */
  ring: z.array(LonLat).min(3),
  /**
   * The governments whose coasts frame the water, principal first. A sea
   * belongs to the combatant command that holds most of its littoral, and the
   * principal breaks a tie, so moving a country between commands can move a
   * sea with it.
   */
  littoral: z.array(NationId).min(1),
  /** How the outline was drawn. Every ring here is the game's own approximation, and says so. */
  provenance: z.string().min(1),
});
export type MaritimeZone = z.infer<typeof MaritimeZone>;

export const ANCHOR_KINDS = ["sourced", "zone-level"] as const;

/**
 * Where an installation abroad stands. `sourced` carries a point someone
 * opened a public record for; `zone-level` is a country total, a rotation or a
 * set of sites with no single location, and is drawn in its host's zone rather
 * than at an invented spot.
 */
export const InstallationAnchor = z.object({
  anchor: z.enum(ANCHOR_KINDS),
  lat: z.number().min(-90).max(90).optional(),
  lon: z.number().min(-180).max(180).optional(),
  anchorSource: z.string(),
  anchorOpened: z.string(),
});
export type InstallationAnchor = z.infer<typeof InstallationAnchor>;

import { z } from "zod";
import { StateId } from "./state.js";

// Where the government sits. An institution's headquarters is a point someone
// opened a public record for, or it is recorded as having none, with the
// reason. A component housed in its parent's building carries that building
// only where a record says it is headquartered there; a location is never
// inherited from a parent.

export const SITE_LOCATIONS = ["sourced", "none"] as const;

export const FederalSite = z.object({
  /** The engine institution id (`INST-…`). */
  institution: z.string().regex(/^INST-[A-Z0-9-]+$/),
  /** A neutral label for the building or campus. A building named for a person is labeled by place or function. */
  site: z.string(),
  location: z.enum(SITE_LOCATIONS),
  /** The state (or DC) the point stands in; absent with no location. */
  state: StateId.optional(),
  lat: z.number().min(-90).max(90).optional(),
  lon: z.number().min(-180).max(180).optional(),
  /** The record that the institution is headquartered at the site; empty with no location. */
  hqSource: z.string(),
  /** Why there is no single point; empty when there is one. */
  reason: z.string(),
  /** The record the coordinates were read from, or the provenance note for a row with no location. */
  source: z.string().min(1),
  opened: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});
export type FederalSite = z.infer<typeof FederalSite>;

export const StateCapitol = z.object({
  state: StateId,
  /** The capitol building, or DC's seat of government, labeled by place where its name honors a person. */
  capitol: z.string().min(1),
  /** The capital city's name. */
  city: z.string().min(1),
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  source: z.string().min(1),
  opened: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});
export type StateCapitol = z.infer<typeof StateCapitol>;

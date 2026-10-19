/**
 * Whether a force can strike from off the battlefield.
 *
 * Reach comes from the projection profile the war file already uses.
 * There is no kilometer range in this module. A cruise and standoff stock
 * that the munitions table does not state cannot be fired.
 */
import type { ForceProjectionProfile } from "./warfighting.js";

export type StandoffBand = "regional" | "expeditionary";

export type StandoffResult =
  | { readonly ok: true; readonly band: StandoffBand }
  | { readonly ok: false; readonly reason: string };

/** A local partner or a neighbor. Not an ocean strike, and not a missile count. */
export function proxyReach(profile: ForceProjectionProfile): boolean {
  return profile.regionalProjection > 0 && profile.expeditionary <= 0 && profile.globalReach <= 0;
}

export function standoffStrike(profile: ForceProjectionProfile, stock: number | null): StandoffResult {
  if (stock === null) return { ok: false, reason: "The stock is not known." };
  if (stock <= 0) return { ok: false, reason: "The class is empty." };
  if (profile.expeditionary > 0 || profile.globalReach > 0) return { ok: true, band: "expeditionary" };
  if (profile.regionalProjection > 0) return { ok: true, band: "regional" };
  return { ok: false, reason: "No force can be brought to bear." };
}

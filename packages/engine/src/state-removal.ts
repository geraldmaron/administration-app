import type { RemovalMechanism } from "@admin/world";
import type { InabilityState } from "./inability.js";

// The removal arc per the founding charter's mechanism. `pressure` is
// recomputed from live state
// every turn (packages/engine/src/removal.ts), never a countdown; `beats`
// is append-only narrated escalation, so the arc is a multi-step story the
// player can influence, not a single threshold that ends the campaign.
export type RemovalArcBeat = {
  readonly turn: number;
  readonly description: string;
};

export type RemovalArc = {
  readonly mechanism: RemovalMechanism;
  readonly pressure: number; // 0..1
  /**
   * Where pressure stood at the close of each completed turn, oldest first —
   * never the live turn, which is still moving. The same reasoning as
   * `player.metricHistory`: a figure on its own says how much trouble the
   * administration is in, only the series says whether that trouble is
   * building or easing. Bounded the same way, for the same reason.
   */
  readonly pressureHistory: readonly number[];
  readonly beats: readonly RemovalArcBeat[];
  readonly resolved: boolean;
  readonly endingSummary?: string; // set only once resolved — the legible "why you lost power"
  /** The watch on the President's own party for removal by inability (`inability.ts`); absent until it has anything to record. */
  readonly inability?: InabilityState;
};

import type { Campaign } from "@admin/engine";

/**
 * The desk, closed for the tick an answer landed on.
 *
 * It is what spaces an arc out: a follow-up scenario cannot arrive in the same
 * breath as the answer that unlocked it. What it is *not* is the pacing dial.
 * A sitting now runs as many ticks as the world needs to raise something, so a
 * flag keyed to one tick says nothing about the next, and the desk re-opens the
 * moment a week actually passes — which is correct, because a week that
 * actually passed is a week that may bring a decision.
 *
 * What decides whether that decision stops the presidency is the director's
 * staging floor, not this flag. Reading this as the throttle is what made the
 * loop degenerate: with a corpus deep enough that something is live every week,
 * "the desk is open" was true on every tick and the run halted on the first
 * one, every time.
 */
export function deskClosedFlag(turn: number): string {
  return `desk:closed:${turn}`;
}

export function deskOpen(campaign: Campaign): boolean {
  return !(campaign.player.flags[deskClosedFlag(campaign.turn)] ?? false);
}

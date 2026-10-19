import { graftDisclosed, selectLedger, type ActionRecord, type Campaign } from "@admin/engine";

/**
 * The Record's own ledger, the world's weekly plumbing left off it.
 *
 * Each weekly phase marks its own housekeeping packet `background`, and
 * `apply()` copies the mark onto the ledger entry it produces. This is a
 * filter, not a second description-matching rule: a foreground packet from
 * the same weekly phase (a rating action, an X-date event, a prioritization
 * week) carries no mark and stays on the ledger a president reads.
 */
export function foregroundLedger(campaign: Campaign): readonly ActionRecord[] {
  return selectLedger(campaign).filter((entry) => graftDisclosed(campaign, entry) && (!entry.background || entry.causal?.graft));
}

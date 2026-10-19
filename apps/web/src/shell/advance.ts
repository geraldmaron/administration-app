import type { Campaign } from "@admin/engine";
import { formatDate, isStaleAct, spanWords, stopWords, type ActReceipt, type CampaignState, type CampaignStore } from "@admin/player-core";
import { recordChange } from "../app/last-change";

/** Lets the browser paint the working state before the engine's synchronous run takes the thread. */
export const painted = (): Promise<void> => new Promise<void>((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)));

/**
 * What a run of the clock did, said in one sentence, after recording it as the
 * sitting's last change so the Brief's map can play the delta. The sentence
 * is the one the Brief shows above the stop.
 */
export function settleAdvance(store: CampaignStore, before: Campaign, receipt: ActReceipt): string {
  const after = store.getState();
  if (after.status !== "ready") return "The presidency could not be read after the run.";
  recordChange({ kind: "advance", before, after: after.campaign, camera: "us", eventIds: receipt.eventIds });
  const date = formatDate(after.campaign.calendar);
  const brief = after.brief;
  const ran = brief ? `Time moved ${spanWords(brief)}, to ${date}. ${stopWords(brief)}` : `Time moved to ${date}.`;
  return receipt.persisted ? ran : `${ran} This device did not save it. Use the save status in the top bar to try again.`;
}

/**
 * What changed under a press that was refused as stale, from the campaign it
 * was prepared on and the one in play now: time ran (the turn or the date
 * moved), or another act landed first on the same day.
 */
export function staleWords(basis: Campaign | undefined, now: CampaignState | undefined): string {
  if (!basis || !now) return "The situation changed in the meantime. Nothing was applied. Review it again before acting.";
  if (now.status !== "ready") return "The administration closed in the meantime. Nothing was applied.";
  const date = formatDate(now.campaign.calendar);
  if (now.campaign.turn !== basis.turn || date !== formatDate(basis.calendar)) {
    return `Time moved on to ${date} in the meantime, so the terms may have changed. Nothing was applied. Review them before acting again.`;
  }
  return "Another act was taken in the meantime, so the terms may have changed. Nothing was applied. Review them before acting again.";
}

/** A refusal said in the player's words: a stale press with what changed under it, or the engine's own sentence. */
export function refusalWords(cause: unknown, basis?: Campaign, now?: CampaignState): string {
  if (isStaleAct(cause)) return staleWords(basis, now);
  return cause instanceof Error ? cause.message : String(cause);
}

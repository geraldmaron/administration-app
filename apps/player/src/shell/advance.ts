import type { Campaign } from "@admin/engine";
import { formatDate, isStaleAct, spanWords, stopWords, type ActReceipt, type CampaignState, type CampaignStore } from "@admin/player-core";

/** Lets the frame paint the working state before the engine's synchronous run takes the thread. */
export const painted = (): Promise<void> => new Promise<void>((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)));

/** What a run of the clock did, in the one sentence the Brief shows above the stop. */
export function settleAdvance(store: CampaignStore, receipt: ActReceipt): string {
  const after = store.getState();
  if (after.status !== "ready") return "Time moved forward, but your game couldn't be loaded afterward.";
  const date = formatDate(after.campaign.calendar);
  const brief = after.brief;
  const ran = brief ? `Time moved ${spanWords(brief)}, to ${date}. ${stopWords(brief)}` : `Time moved to ${date}.`;
  return receipt.persisted ? ran : `${ran} This device couldn't save it. You can try again from Settings, or keep playing and it will try again after your next move.`;
}

/** What changed under a press refused as stale: time ran, or another act landed first. */
export function staleWords(basis: Campaign | undefined, now: CampaignState | undefined): string {
  if (!basis || !now) return "Things changed while you were deciding, so nothing went through. Take another look when you're ready.";
  if (now.status !== "ready") return "Your game closed while you were deciding, so nothing went through.";
  const date = formatDate(now.campaign.calendar);
  if (now.campaign.turn !== basis.turn || date !== formatDate(basis.calendar)) {
    return `Time moved on to ${date} while you were deciding, so things may be different now. Nothing went through. Take another look before you try again.`;
  }
  return "Something else happened while you were deciding, so things may be different now. Nothing went through. Take another look before you try again.";
}

/** A refusal in the player's words: a stale press with what changed under it, or the engine's own sentence. */
export function refusalWords(cause: unknown, basis?: Campaign, now?: CampaignState): string {
  if (isStaleAct(cause)) return staleWords(basis, now);
  return cause instanceof Error ? cause.message : String(cause);
}

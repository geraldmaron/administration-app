import { useMemo } from "react";
import { selectEnding, type Campaign } from "@admin/engine";
import { briefMatters, pendingConversations, presentedItems } from "@admin/player-core";
import { usePreferences } from "../device/hooks";

export type Attention =
  | { readonly state: "clear" }
  | { readonly state: "waiting"; readonly matters: number }
  | { readonly state: "held"; readonly reason: string; readonly count: number };

/** Whether this press may spend time: open work holds it, and it says why. */
export function continueHold(waiting: number, blockingTitles: readonly string[]): string | undefined {
  const decisions = waiting > 0 ? `${waiting === 1 ? "A decision is" : `${waiting} decisions are`} waiting for your answer.` : "";
  const matters = blockingTitles.length > 0 ? `Time is paused for: ${blockingTitles.map((title) => title.replace(/\.$/, "")).join(", ")}.` : "";
  if (!decisions && !matters) return undefined;
  return `${decisions} ${matters} You can continue once you've answered or put off each one.`.trim();
}

/**
 * What the clock is waiting on, from the one derivation the command bar's pip
 * and Continue both read. Held means a matter stops time; waiting means
 * actionable Brief matters exist but none stops it. The inbox's unread count
 * is not this: it also counts news and calendar items.
 */
export function useAttention(campaign: Campaign | undefined): Attention {
  const { preferences } = usePreferences();
  return useMemo(() => {
    if (!campaign || selectEnding(campaign) !== "in-office") return { state: "clear" };
    const pending = pendingConversations(campaign).length;
    const blocking = presentedItems(campaign, preferences.attentionByKind).map((item) => item.title);
    const reason = continueHold(pending, blocking);
    if (reason) return { state: "held", reason, count: pending + blocking.length };
    const matters = briefMatters(campaign, preferences.attentionByKind).length;
    return matters > 0 ? { state: "waiting", matters } : { state: "clear" };
  }, [campaign, preferences.attentionByKind]);
}

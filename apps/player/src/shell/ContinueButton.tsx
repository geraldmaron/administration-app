import { useRef, useState } from "react";
import { usePathname } from "expo-router";
import { selectEnding, type Campaign } from "@admin/engine";
import { briefMatters, pendingConversations, presentedItems, type BriefMatter, type CampaignState } from "@admin/player-core";
import { Button, Row, useMedia } from "@admin/ui";
import { useCampaignStore, usePreferences } from "../device/hooks";
import { painted, refusalWords, settleAdvance } from "./advance";
import { go } from "./navigate";

/** Whether this press may spend time: open work holds it, and it says why. */
export function continueHold(waiting: number, blockingTitles: readonly string[]): string | undefined {
  const decisions = waiting > 0 ? `${waiting === 1 ? "A decision is" : `${waiting} decisions are`} waiting for your answer.` : "";
  const matters = blockingTitles.length > 0 ? `Time is paused for: ${blockingTitles.map((title) => title.replace(/\.$/, "")).join(", ")}.` : "";
  if (!decisions && !matters) return undefined;
  return `${decisions} ${matters} You can continue once you've answered or put off each one.`.trim();
}

/** The matter holding the clock that a press should open first: the first that stops time and has a place to be answered. */
export function firstHolding(matters: readonly BriefMatter[]): BriefMatter | undefined {
  return matters.find((matter) => matter.holds && matter.href) ?? matters.find((matter) => matter.href);
}

/** Where a run that just stopped should leave the President: on a matter that now holds the clock, else exactly where they were. */
function landing(after: CampaignState, attention: Parameters<typeof briefMatters>[1], pathname: string): string | undefined {
  if (after.status !== "ready") return undefined;
  const matter = briefMatters(after.campaign, attention).find((candidate) => candidate.holds && candidate.href);
  return matter?.href && pathname !== "/brief" && pathname !== matter.href.split("?")[0] ? matter.href : undefined;
}

/**
 * The one control that spends the presidency's time. It runs the world until
 * something needs the President. A decision or a matter already waiting holds
 * it, and it says why. A run that stops on nothing new leaves the President on
 * the screen they were on, with the result said in the bar; one that stops on
 * a matter opens that matter.
 */
export function ContinueButton({ campaign, onSaid }: { readonly campaign: Campaign; readonly onSaid?: (sentence: string) => void }) {
  const store = useCampaignStore();
  const pathname = usePathname();
  const { preferences } = usePreferences();
  const inFlight = useRef(false);
  const [running, setRunning] = useState(false);
  const media = useMedia();
  if (selectEnding(campaign) !== "in-office") {
    return (
      <Button kind="secondary" size="compact" icon="record" onPress={() => go("/ending")}>
        Ended
      </Button>
    );
  }
  const waiting = pendingConversations(campaign).length;
  const blocking = presentedItems(campaign, preferences.attentionByKind).map((item) => item.title);
  const hold = continueHold(waiting, blocking);
  async function advance() {
    if (inFlight.current || hold) return;
    inFlight.current = true;
    setRunning(true);
    try {
      await painted();
      const receipt = await store.continueUntilAttention(undefined, { basis: campaign });
      onSaid?.(settleAdvance(store, receipt));
      const href = landing(store.getState(), preferences.attentionByKind, pathname);
      if (href) go(href);
    } catch (cause) {
      onSaid?.(refusalWords(cause, campaign, store.getState()));
    } finally {
      inFlight.current = false;
      setRunning(false);
    }
  }
  const holding = hold ? firstHolding(briefMatters(campaign, preferences.attentionByKind).filter((matter) => matter.holds && matter.href?.split(/[?#]/)[0] !== pathname)) : undefined;
  const count = waiting + blocking.length;
  return (
    <Row gap="sm">
      {/* While time is held the bar names how many matters hold it and opens the first, so no page gives its first screen to a banner. On a phone that control takes Continue's place, since the bar has room for one. */}
      {hold && holding?.href ? (
        <Button kind="secondary" size="compact" icon="paused" label={`Time is paused. ${hold} Open ${holding.title}`} onPress={() => go(holding.href!)}>
          {media.phone ? `${count} waiting` : `${count} waiting on you`}
        </Button>
      ) : null}
      {hold && holding?.href && media.phone ? null : (
        <Button kind={hold ? "secondary" : "gold"} size="compact" icon={hold ? "paused" : "dispatch"} disabled={Boolean(hold) || running} label={hold ? `You can't continue yet. ${hold}` : "Continue. Time moves forward until something needs you."} onPress={() => void advance()}>
          {running ? "Running…" : "Continue"}
        </Button>
      )}
    </Row>
  );
}

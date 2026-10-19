import { useId, useRef, useState } from "react";
import { useNavigate, useRouter } from "@tanstack/react-router";
import { selectEnding, type Campaign } from "@admin/engine";
import { pendingConversations, presentedItems } from "@admin/player-core";
import { Button, Icon } from "@admin/ui-web";
import { useCampaignStore, usePreferences } from "../app/hooks";
import { painted, refusalWords, settleAdvance } from "./advance";
import { Door } from "./Door";

export type ContinueOffer =
  | { readonly held: false }
  | { readonly held: true; readonly note: string };

/**
 * Whether this press may spend time. Open work holds the press; it is never
 * put off or answered on the player's behalf as part of running the clock.
 */
export function continueOffer(waiting: number, blockingTitles: readonly string[]): ContinueOffer {
  const decisions = waiting > 0 ? `${waiting === 1 ? "A decision is" : `${waiting} decisions are`} waiting for your answer.` : "";
  const matters = blockingTitles.length > 0 ? `Time is paused for: ${blockingTitles.map((title) => title.replace(/\.$/, "")).join("; ")}.` : "";
  if (!decisions && !matters) return { held: false };
  return { held: true, note: `${decisions} ${matters} Continue resumes once each is dealt with on the Brief.`.trim() };
}

const ENDED: Readonly<Record<string, string>> = {
  removed: "Removed from office",
  defeated: "Defeated at the polls",
  "term-limited": "Both terms served",
};

/** The hold, in the fewest words the top bar can carry. */
function heldWord(waiting: number, blocking: number): string {
  const total = waiting + blocking;
  return `${total} waiting`;
}

/**
 * The one control that spends the presidency's time, in the top bar. It runs
 * the world until something needs the President; a decision or a matter
 * already waiting holds it, and it says why. Every run lands on the Brief,
 * which says how far time moved and what stopped it.
 */
export function ContinueControl({ campaign }: { readonly campaign: Campaign }) {
  const store = useCampaignStore();
  const navigate = useNavigate();
  const router = useRouter();
  const { preferences } = usePreferences();
  const noteId = useId();
  const inFlight = useRef(false);
  const [running, setRunning] = useState(false);
  const [said, setSaid] = useState("");
  const ending = selectEnding(campaign);
  const waiting = pendingConversations(campaign).length;
  const blocking = presentedItems(campaign, preferences.attentionByKind).map((item) => item.title);
  const offer = continueOffer(waiting, blocking);

  if (ending !== "in-office") {
    return (
      <div className="continue continue--ended">
        <Button asChild kind="secondary" size="sm">
          <Door href="/ending" aria-label={`${ENDED[ending] ?? "The presidency has ended"}. View the presidency's outcome.`} title={ENDED[ending] ?? "The presidency has ended"}>
            <Icon name="record" size={18} /><span className="ui-button__label">Ended</span>
          </Door>
        </Button>
      </div>
    );
  }

  async function advance() {
    if (inFlight.current) return;
    if (offer.held) return;
    inFlight.current = true;
    setRunning(true);
    setSaid("Moving time forward.");
    const pressedOn = router.state.location.pathname;
    try {
      await painted();
      const receipt = await store.continueUntilAttention(undefined, { basis: campaign });
      setSaid(settleAdvance(store, campaign, receipt));
      // The run lands on the Brief, unless the player has already gone on from
      // where they pressed: the stop shows while the save is still being written.
      if (router.state.location.pathname === pressedOn) await navigate({ to: "/brief" });
    } catch (cause) {
      setSaid(refusalWords(cause, campaign, store.getState()));
    } finally {
      inFlight.current = false;
      setRunning(false);
    }
  }

  return (
    <div className="continue" data-held={offer.held ? "true" : undefined}>
      {offer.held ? (
        <span className="continue__held" aria-hidden="true">
          <Icon name="paused" size={16} />
          <span className="continue__held-word">{heldWord(waiting, blocking.length)}</span>
        </span>
      ) : null}
      <Button
        kind={offer.held ? "secondary" : "primary"}
        size="sm"
        icon={<Icon name={offer.held ? "paused" : "dispatch"} size={18} />}
        busy={running}
        disabled={offer.held}
        aria-describedby={offer.held ? noteId : undefined}
        onClick={() => void advance()}
      >
        Continue
      </Button>
      {offer.held ? (
        <span id={noteId} className="ui-visually-hidden">
          {offer.note}
        </span>
      ) : null}
      <span className="ui-visually-hidden" role="status" aria-live="polite">
        {said}
      </span>
    </div>
  );
}

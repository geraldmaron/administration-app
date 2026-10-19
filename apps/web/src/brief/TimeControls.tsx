import { useRef, useState } from "react";
import { selectEnding, type Campaign } from "@admin/engine";
import { continuationHorizon, formatDate, handOffClears, handOffPlan, pendingConversations, presentedItems } from "@admin/player-core";
import { Button, Icon } from "@admin/ui-web";
import { useCampaignStore, usePreferences } from "../app/hooks";
import { painted, refusalWords, settleAdvance } from "../shell/advance";

/**
 * The two other ways to spend time, beside Continue in the top bar: one
 * office day, and handing what a chief of staff may take to the Chief of
 * Staff before running on. Both are held by the same open work Continue is,
 * and the hand-off says what it would leave and what it costs.
 */
export function TimeControls({ campaign, onSettled, quiet = false }: { readonly campaign: Campaign; readonly onSettled: (sentence: string) => void; readonly quiet?: boolean }) {
  const store = useCampaignStore();
  const { preferences } = usePreferences();
  const inFlight = useRef(false);
  const [running, setRunning] = useState<"day" | "hand" | null>(null);
  if (selectEnding(campaign) !== "in-office") return null;
  const waiting = pendingConversations(campaign).length;
  const held = waiting > 0 || presentedItems(campaign, preferences.attentionByKind).length > 0;
  const plan = handOffPlan(campaign, preferences.attentionByKind);
  const clears = handOffClears(plan);
  const handed = plan.rows.length + plan.decisions.length;
  const horizon = held ? undefined : continuationHorizon(campaign);

  async function run(kind: "day" | "hand") {
    if (inFlight.current) return;
    if (kind === "day" && held) return;
    inFlight.current = true;
    setRunning(kind);
    try {
      await painted();
      const receipt = kind === "day" ? await store.stepClockDay() : await store.handOffAndContinue(undefined, { basis: campaign, settings: preferences.attentionByKind });
      onSettled(settleAdvance(store, campaign, receipt));
    } catch (cause) {
      onSettled(refusalWords(cause, campaign, store.getState()));
    } finally {
      inFlight.current = false;
      setRunning(null);
    }
  }

  return (
    <section className="time" aria-labelledby="time-title" data-quiet={quiet ? "true" : undefined}>
      <h2 id="time-title" className="brief-section__title">
        <Icon name="schedule" size={20} /> Time
      </h2>
      {horizon ? (
        <p className="time__horizon">
          Continue runs to {formatDate(horizon.dueDate)} at the latest ({horizon.title.replace(/\.$/, "")}), unless something needs you sooner.
        </p>
      ) : null}
      <div className="time__acts">
        <Button kind={quiet ? "primary" : "secondary"} size={quiet ? "md" : "sm"} icon={<Icon name="schedule" size={18} />} busy={running === "day"} disabled={held || running !== null} {...(held ? { "aria-describedby": "time-held" } : {})} onClick={() => void run("day")}>
          Advance one day
        </Button>
        {handed > 0 ? (
          <Button kind="secondary" size="sm" icon={<Icon name="westWing" size={18} />} busy={running === "hand"} disabled={!clears || running !== null} onClick={() => void run("hand")}>
            Hand the rest to the Chief of Staff and continue
          </Button>
        ) : null}
      </div>
      {held ? (
        <p id="time-held" className="time__note">
          Time is held until you answer or put off what is waiting on the Desk{waiting > 0 ? `: ${waiting === 1 ? "one decision" : `${waiting} decisions`} first` : ""}.
        </p>
      ) : null}
      {handed > 0 ? (
        <p className="time__note">
          {clears
            ? `The Chief of Staff puts off ${plan.rows.length === 1 ? "one item" : `${plan.rows.length} items`} and leaves ${plan.decisions.length === 1 ? "one decision" : `${plan.decisions.length} decisions`} unanswered, at the price each already shows. Each goes on the Record.`
            : `Only you can answer ${plan.kept.map((item) => item.title.replace(/\.$/, "")).join("; ")}, so the Chief of Staff cannot take the rest and run on.`}
        </p>
      ) : null}
    </section>
  );
}

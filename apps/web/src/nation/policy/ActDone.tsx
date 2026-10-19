import { useEffect, useRef } from "react";
import { readingMoves } from "@admin/player-core";
import { Button, Receipt, buttonClass } from "@admin/ui-web";
import { Door } from "../../shell/Door";
import { Moves } from "../../shell/Moves";
import type { DoneAct } from "./use-act";

const MAP_NOTE = "The map shows the change in approval by state, from before the act to now.";

/**
 * The proof a domestic act was taken: what was done, what it set, what it
 * moved from what to what, and the door to its Record entry. The screen plays
 * the delta lens while this is shown.
 */
export function ActDone({ done, onBack, backLabel, mapNote = MAP_NOTE }: { readonly done: DoneAct; readonly onBack?: () => void; readonly backLabel?: string; readonly mapNote?: string | null }) {
  const moves = readingMoves(done.before, done.after);
  // The receipt replaces the comparison where the player was reading, often
  // far down the sheet: bring it to the top and give it focus so it is the
  // next thing seen and heard.
  const root = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    root.current?.scrollIntoView({ block: "start" });
    root.current?.focus({ preventScroll: true });
  }, []);
  return (
    <div className="act-done" ref={root} tabIndex={-1}>
      <Receipt
        title={done.title}
        date={done.date}
        lines={done.lines}
        {...(done.outcome ? { outcome: done.outcome } : {})}
        record={done.saveError ? `It stands, but this device did not save it: ${done.saveError}` : done.eventId ? "It is on your Record." : "It is on your Record with this week's entries."}
      >
        {done.eventId ? (
          <Door href={`/record/event/${encodeURIComponent(done.eventId)}`} className={buttonClass("primary", "sm")}>
            View record
          </Door>
        ) : null}
        {onBack && backLabel ? (
          <Button kind="ghost" size="sm" onClick={onBack}>
            {backLabel}
          </Button>
        ) : null}
      </Receipt>
      <section aria-labelledby="act-moved">
        <h2 id="act-moved" className="situation__label">
          What it moved
        </h2>
        <Moves moves={moves} none="No reading moved right away. What follows reaches the Record as it happens." />
        {mapNote ? <p className="brief-section__note">{mapNote}</p> : null}
      </section>
    </div>
  );
}

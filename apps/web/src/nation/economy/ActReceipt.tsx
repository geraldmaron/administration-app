import { readingMoves } from "@admin/player-core";
import { Button, Receipt, buttonClass } from "@admin/ui-web";
import { Door } from "../../shell/Door";
import { Moves } from "../../shell/Moves";
import type { Committed } from "./commit";
import "./economy.css";

/**
 * The proof an act on the country happened: what was done, what it set and
 * cost, what it moved, and the door to its Record entry. The screen plays the
 * delta lens beside it.
 */
export function ActReceipt({
  committed,
  onAgain,
  again,
  mapNote = "The map shows the change in approval by state, from before the act to now.",
}: {
  readonly committed: Committed;
  readonly onAgain: () => void;
  readonly again: string;
  /** What the map is showing beside the receipt; null on a screen whose map is paused. */
  readonly mapNote?: string | null;
}) {
  return (
    <section className="nation-receipt" aria-label="Receipt">
      <Receipt
        title={committed.title}
        date={committed.date}
        lines={committed.lines}
        {...(committed.outcome ? { outcome: committed.outcome } : {})}
        record={
          committed.saveError
            ? `It stands, but this device did not save it: ${committed.saveError}`
            : committed.eventId
              ? "It is on your Record, with what follows from it."
              : "It is on your Record."
        }
      >
        {committed.eventId ? (
          <Door href={`/record/event/${encodeURIComponent(committed.eventId)}`} className={buttonClass("primary", "sm")}>
            View record
          </Door>
        ) : null}
        <Button kind="secondary" size="sm" onClick={onAgain}>
          {again}
        </Button>
      </Receipt>
      <h3 className="nation-section__title">What it moved right away</h3>
      <Moves moves={readingMoves(committed.before, committed.after)} none="No headline reading moved right away. What follows reaches the Record as the weeks run." />
      {mapNote ? <p className="nation-note">{mapNote}</p> : null}
    </section>
  );
}

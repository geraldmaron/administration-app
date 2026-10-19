import { readingMoves } from "@admin/player-core";
import { Button, Receipt, buttonClass } from "@admin/ui-web";
import { Door } from "../../shell/Door";
import { Moves } from "../../shell/Moves";
import { Screen } from "../../shell/Screen";
import type { ChairActDone } from "./acts";

export type ActReceiptProps = {
  readonly done: ChairActDone;
  /** Back to the screen the act was taken on, which reads the board as it now stands. */
  readonly back: { readonly label: string; readonly onBack: () => void };
};

/**
 * The proof an act on a chair was taken: what was done, what it moved from
 * what to what, and the door to its Record entry. The map plays the move by
 * state from before the act to now, framed on the office.
 */
export function ActReceipt({ done, back }: ActReceiptProps) {
  const moves = readingMoves(done.before, done.after);
  return (
    <Screen icon="approve" title={done.title} eyebrow="Done" screenClass="workspace" camera={done.camera} lens="delta" marks="offices">
      <div className="exec exec--done">
        <Receipt
          title={done.title}
          date={done.date}
          lines={done.lines}
          record={done.saveError ? `It stands, but this device did not save it: ${done.saveError}` : "It is on your Record."}
        >
          {done.eventId ? (
            <Door href={`/record/event/${encodeURIComponent(done.eventId)}`} className={buttonClass("primary", "sm")}>
              Open the Record entry
            </Door>
          ) : null}
          <Button kind="secondary" size="sm" onClick={back.onBack}>
            {back.label}
          </Button>
          <Door href="/washington" className={buttonClass("ghost", "sm")}>
            Back to Washington
          </Door>
        </Receipt>
        <section aria-labelledby="exec-moved">
          <h2 id="exec-moved" className="exec__heading">
            What it moved
          </h2>
          <Moves moves={moves} none="No reading moved right away. What follows from it reaches the Record as it happens." />
        </section>
      </div>
    </Screen>
  );
}

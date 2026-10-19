import type { Campaign } from "@admin/engine";
import { scenarioOccurrenceKey } from "@admin/content";
import { entryJudgments, pendingConversations, readingMoves } from "@admin/player-core";
import { Receipt, buttonClass } from "@admin/ui-web";
import { Door } from "../shell/Door";
import { Moves } from "../shell/Moves";
import { Screen } from "../shell/Screen";
import type { Decided } from "./acts";

/**
 * The proof the decision was taken: what was done, what it moved from what to
 * what, what your staff said next, and the door to its Record entry.
 */
export function DecisionReceipt({ campaign, decided }: { readonly campaign: Campaign; readonly decided: Decided }) {
  const moves = readingMoves(decided.before, decided.after);
  const entry = decided.eventId ? decided.after.ledger.find((row) => row.causal?.eventId === decided.eventId) : undefined;
  const judgments = entry ? entryJudgments(entry) : [];
  const next = pendingConversations(campaign)[0];
  return (
    <Screen icon="approve" title={decided.subject} eyebrow="Decided" screenClass="workspace" camera="us">
      <div className="decision decision--done">
        <Receipt
          title={decided.title}
          date={decided.date}
          lines={judgments.map((judgment) => ({ label: `Public view of ${judgment.label.toLowerCase()}`, value: judgment.text }))}
          record={
            decided.saveError
              ? `It stands, but this device did not save it: ${decided.saveError}`
              : decided.eventId
                ? "It is on your Record, with what it answered to and what follows from it."
                : "It is on your Record."
          }
        >
          {decided.eventId ? (
            <Door href={`/record/event/${encodeURIComponent(decided.eventId)}`} className={buttonClass("primary", "sm")}>
              Open the Record entry
            </Door>
          ) : null}
          {next ? (
            <Door href={`/brief/decision/${encodeURIComponent(scenarioOccurrenceKey(next))}`} className={buttonClass("secondary", "sm")}>
              The next decision
            </Door>
          ) : null}
          <Door href="/brief" className={buttonClass("ghost", "sm")}>
            Back to the Brief
          </Door>
        </Receipt>
        <section aria-labelledby="receipt-moved">
          <h2 id="receipt-moved" className="situation__label">
            What it moved
          </h2>
          <Moves moves={moves} none="No reading moved right away. What follows from it reaches the Record as it happens." />
        </section>
        {decided.beats.length > 0 ? (
          <section aria-labelledby="receipt-said">
            <h2 id="receipt-said" className="situation__label">
              What your staff said next
            </h2>
            <ol className="aftermath">
              {decided.beats.map((beat, index) => (
                <li key={index}>{beat.text}</li>
              ))}
            </ol>
          </section>
        ) : null}
      </div>
    </Screen>
  );
}

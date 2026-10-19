import type { Campaign } from "@admin/engine";
import { entryJudgments, readingMoves } from "@admin/player-core";
import { Column, Section, Text } from "@admin/ui";
import type { Decided } from "./acts";
import { ResultPage } from "./ResultPage";

/**
 * The proof the decision was taken: what was done, what it moved from what to
 * what, what the staff said next, and the door to its Record entry.
 */
export function DecisionReceipt({ campaign, decided, here }: { readonly campaign: Campaign; readonly decided: Decided; readonly here: string }) {
  const moves = readingMoves(decided.before, decided.after);
  const entry = decided.eventId ? decided.after.ledger.find((row) => row.causal?.eventId === decided.eventId) : undefined;
  const judgments = entry ? entryJudgments(entry) : [];
  return (
    <ResultPage
      campaign={campaign}
      icon="approve"
      eyebrow="Decided"
      subject={decided.subject}
      title={decided.title}
      date={decided.date}
      saveError={decided.saveError}
      eventId={decided.eventId}
      here={here}
      lines={judgments.map((judgment) => ({ label: `What the public thinks of ${judgment.label.toLowerCase()}`, value: judgment.text }))}
      moves={{ moves, none: "None of your numbers changed right away. Anything that follows will show up on your Record when it happens." }}
    >
      {decided.beats.length > 0 ? (
        <Section icon="microphone" title="What your staff said next">
          <Column gap="sm" role="list">
            {decided.beats.map((beat, index) => (
              <Text key={index} role="listitem" variant="body" serif>
                {beat.text}
              </Text>
            ))}
          </Column>
        </Section>
      ) : null}
    </ResultPage>
  );
}

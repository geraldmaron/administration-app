import type { ReactNode } from "react";
import type { Campaign } from "@admin/engine";
import { metricFraction, place, type ReadingMove } from "@admin/player-core";
import { Button, CardGrid, Column, Meter, Page, Pressable, ReadingFrame, Row, Text, type IconName } from "@admin/ui";
import { ResultView } from "@admin/ui/review";
import { beforeKey } from "../brief/before-key";
import { usePreferences } from "../device/hooks";
import { BackButton } from "../shell/BackButton";
import { go } from "../shell/navigate";
import { nextMatter } from "./next-matter";
import { termDoor } from "../handbook/term-door";

/** One reading's move on its own scale: the meter stands where it is now, with a tick where it stood before; the whole reading opens its history. */
function MoveMeter({ move }: { readonly move: ReadingMove }) {
  return (
    <Pressable role="link" aria-label={`${move.label}, ${move.text}. Open its history`} href={place.metric(move.key)} onPress={() => go(place.metric(move.key))} borderRadius="card" padding="xs">
      <Column gap="2xs" flexGrow={1}>
        <Meter label={move.label} value={metricFraction(move.key, move.after)} figure={move.afterText} tone={move.delta < 0 ? "danger" : "accent"} marks={[{ id: "before", label: `Before, ${move.beforeText}`, at: metricFraction(move.key, move.before), kind: "historical" }]} />
        <Text variant="caption" weight="strong" tone={move.delta < 0 ? "danger" : "success"}>{`${move.text}, from ${move.beforeText}`}</Text>
      </Column>
    </Pressable>
  );
}

/** Every reading that moved, framed and keyed, or the sentence for none. */
export function Moves({ moves, none }: { readonly moves: readonly ReadingMove[]; readonly none: string }) {
  if (moves.length === 0) {
    return (
      <Text variant="body" tone="secondary">
        {none}
      </Text>
    );
  }
  return (
    <ReadingFrame
      title="What it moved"
      unit="Each reading on its own scale"
      period="Now, against where it stood before"
      legend={beforeKey("Where it stood before")}
      pressHint="Press a reading to open its history."
      help={{ meaning: "Each bar shows where a reading stands now. The tick marks where it stood before you acted, so the distance between them is what this act did.", steps: ["Find the tick: that is where the reading was.", "The words under the bar say how far it moved."], term: termDoor("approval-rating", "approval rating") }}
    >
      <CardGrid columns={{ phone: 1, tablet: 2, desktop: 3, wide: 3 }} gap="xl">
        {moves.map((move) => (
          <MoveMeter key={move.key} move={move} />
        ))}
      </CardGrid>
    </ReadingFrame>
  );
}

export type ResultLine = { readonly label: string; readonly value: string };

export type ResultBodyProps = {
  readonly campaign: Campaign;
  /** What was done, as the Record will name it. */
  readonly title: string;
  readonly date: string;
  readonly saveError?: string | undefined;
  readonly eventId?: string | undefined;
  readonly moves?: { readonly moves: readonly ReadingMove[]; readonly none: string };
  readonly lines?: readonly ResultLine[];
  /** The address of the screen showing this result, so the next matter is never the one just answered. */
  readonly here: string;
};

export type ResultPageProps = ResultBodyProps & {
  readonly icon: IconName;
  readonly eyebrow: string;
  /** What the act was about; the page title. */
  readonly subject: string;
  /** More to read under the result, such as what the staff said next. */
  readonly children?: ReactNode;
};

function summaryOf({ date, saveError, eventId }: Pick<ResultPageProps, "date" | "saveError" | "eventId">): string {
  const when = date ? `${date}. ` : "";
  if (saveError) return `${when}This went through, but your game wasn't saved. ${saveError}`;
  return `${when}${eventId ? "It's on your Record, along with what led to it and what comes next." : "It's on your Record."}`;
}

/**
 * The one result after any commit from the desk: the verdict, what it moved,
 * its Record entry and the next waiting matter. Nothing advances on its own,
 * and there is no Close step, so every way on is a choice the President makes.
 */
export function ResultBody({ campaign, title, date, saveError, eventId, moves, lines, here }: ResultBodyProps) {
  const { preferences } = usePreferences();
  const next = nextMatter(campaign, preferences.attentionByKind, here);
  const readings = moves || lines?.length ? (
    <Column gap="md">
      {lines?.map((line) => (
        <Row key={line.label} gap="md" top wrap>
          <Text variant="label" tone="secondary" width={200}>{line.label}</Text>
          <Text variant="body" flex={1} minWidth={180}>{line.value}</Text>
        </Row>
      ))}
      {moves ? <Moves moves={moves.moves} none={moves.none} /> : null}
    </Column>
  ) : undefined;
  return (
    <ResultView
      title={title}
      verdict={saveError ? { word: "Done, not saved", tone: "warning", icon: "caution" } : { word: "Done", tone: "success", icon: "approve" }}
      summary={summaryOf({ date, saveError, eventId })}
      {...(readings ? { readings } : {})}
      {...(eventId ? { record: <Row><Button kind="secondary" icon="record" onPress={() => go(place.event(eventId))}>Open the Record entry</Button></Row> } : {})}
      {...(next ? { next: (
        <Column gap="2xs" alignItems="flex-start">
          <Button kind="primary" icon="review" onPress={() => go(next.href!)}>Next waiting matter</Button>
          <Text variant="caption" tone="secondary">{next.title}</Text>
        </Column>
      ) } : {})}
      secondary={<BackButton parent={place.brief()} parentLabel="Brief" />}
    />
  );
}

export function ResultPage({ icon, eyebrow, subject, children, ...body }: ResultPageProps) {
  return (
    <Page icon={icon} eyebrow={eyebrow} title={subject}>
      <ResultBody {...body} />
      {children}
    </Page>
  );
}

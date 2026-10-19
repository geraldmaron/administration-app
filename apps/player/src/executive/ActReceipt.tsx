import type { ReactNode } from "react";
import { usePathname } from "expo-router";
import type { Campaign } from "@admin/engine";
import { place, readingMoves } from "@admin/player-core";
import { Button, Column, Page, Row, Text } from "@admin/ui";
import { ResultView } from "@admin/ui/review";
import { usePreferences } from "../device/hooks";
import { go } from "../shell/navigate";
import { Moves } from "../decision/ResultPage";
import { nextMatter } from "../decision/next-matter";

type ResultLine = { readonly label: string; readonly value: string };

/** What an act did, kept beside its result so it is said from the commit, not re-read off a board that has moved. */
export type ActDoneView = {
  readonly title: string;
  readonly date: string;
  readonly lines: readonly ResultLine[];
  readonly before: Campaign;
  readonly after: Campaign;
  readonly eventId?: string;
  readonly saveError?: string;
};

/** The next matter that waits on the President, as the primary way on; nothing when nothing else waits. */
function NextMatter({ campaign }: { readonly campaign: Campaign }) {
  const { preferences } = usePreferences();
  const next = nextMatter(campaign, preferences.attentionByKind, usePathname());
  if (!next?.href) return null;
  const href = next.href;
  return (
    <Button kind="primary" icon="brief" label={`Next waiting matter: ${next.title}`} onPress={() => go(href)}>
      Next waiting matter
    </Button>
  );
}

function Terms({ lines }: { readonly lines: readonly ResultLine[] }) {
  if (lines.length === 0) return null;
  return (
    <Column gap="xs">
      {lines.map((line) => (
        <Row key={line.label} gap="sm" between wrap>
          <Text variant="caption" tone="secondary">
            {line.label}
          </Text>
          <Text variant="label" flexShrink={1}>
            {line.value}
          </Text>
        </Row>
      ))}
    </Column>
  );
}

export type ActResultProps = {
  readonly done: ActDoneView;
  /** The way back to the screen the act started from. */
  readonly back: ReactNode;
};

/**
 * The one result after an act on a chair, a person or a chamber: the verdict,
 * the terms it was taken on, the readings it moved, its Record entry, the next
 * matter waiting, and the way back to where it started.
 */
export function ActResult({ done, back }: ActResultProps) {
  const unsaved = done.saveError !== undefined;
  const moves = readingMoves(done.before, done.after);
  return (
    <ResultView
      title={done.title}
      verdict={unsaved ? { word: "Done, not saved", tone: "warning", icon: "caution" } : { word: "Done", tone: "success", icon: "approve" }}
      summary={unsaved ? `${done.date}. This went through, but this device didn't save it. ${done.saveError}` : `${done.date}. It is on your Record.`}
      readings={
        <Column gap="md">
          <Terms lines={done.lines} />
          <Moves moves={moves} none="None of your numbers changed right away. Anything that follows will show up on your Record when it happens." />
        </Column>
      }
      record={
        done.eventId ? (
          <Row>
            <Button kind="secondary" icon="record" onPress={() => go(place.event(done.eventId!))}>
              Open the Record entry
            </Button>
          </Row>
        ) : undefined
      }
      next={<NextMatter campaign={done.after} />}
      secondary={back}
    />
  );
}

/** The result as a page of its own, for a screen the act replaced. */
export function ActReceipt({ done, subject, backLabel, onBack }: { readonly done: ActDoneView; readonly subject: string; readonly backLabel: string; readonly onBack: () => void }) {
  return (
    <Page eyebrow="Done" icon="approve" title={subject}>
      <ActResult
        done={done}
        back={
          <Button kind="quiet" icon="return" onPress={onBack}>
            {backLabel}
          </Button>
        }
      />
    </Page>
  );
}

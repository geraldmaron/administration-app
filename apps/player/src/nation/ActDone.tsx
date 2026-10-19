import type { ReactNode } from "react";
import { place, readingMoves } from "@admin/player-core";
import { Button, Column, Row, Text } from "@admin/ui";
import { ResultView } from "@admin/ui/review";
import { ActResult } from "../executive/ActReceipt";
import { go } from "../shell/navigate";
import { Moves } from "../decision/ResultPage";
import type { DoneAct } from "./act";

/** The act the one with the last word turned down: no reading moved, and the way on is back. */
function Refused({ done, back }: { readonly done: DoneAct; readonly back: ReactNode }) {
  return (
    <ResultView
      title={done.title}
      verdict={{ word: "Turned down", tone: "danger", icon: "reject" }}
      summary={`${done.date}. You tried, and it was turned down. It's on your Record.`}
      readings={
        <Column gap="md">
          {done.lines.map((line) => (
            <Row key={line.label} gap="sm" between wrap>
              <Text variant="caption" tone="secondary">
                {line.label}
              </Text>
              <Text variant="label" flexShrink={1}>
                {line.value}
              </Text>
            </Row>
          ))}
          <Moves moves={readingMoves(done.before, done.after)} none="None of your numbers changed." />
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
      secondary={back}
    />
  );
}

/**
 * The result of a domestic act: the verdict, the terms it was taken on, what
 * it moved, its Record entry, the next matter waiting and the way back to
 * where it started.
 */
export function ActDone({ done, onBack, backLabel }: { readonly done: DoneAct; readonly onBack?: () => void; readonly backLabel?: string }) {
  const back =
    onBack && backLabel ? (
      <Button kind="quiet" icon="return" onPress={onBack}>
        {backLabel}
      </Button>
    ) : undefined;
  if (done.outcome === "refused") return <Refused done={done} back={back} />;
  return <ActResult done={done} back={back} />;
}

/** An act's refusal, in the engine's or the store's own words. */
export function ActProblem({ problem }: { readonly problem: string }) {
  if (!problem) return null;
  return (
    <Text variant="body" tone="danger" role="alert">
      {problem}
    </Text>
  );
}

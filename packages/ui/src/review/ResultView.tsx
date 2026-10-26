import type { ReactNode } from "react";
import type { IconName } from "../icons/Icon";
import { Tag } from "../primitives/Tag";
import { Surface } from "../primitives/Surface";
import { Column, Row } from "../primitives/Stack";
import { Text } from "../primitives/Text";

/** How an act came out, in a word with its glyph: done, refused, partly done, waiting on someone else. */
export type ResultVerdict = { readonly word: string; readonly tone: "success" | "danger" | "warning" | "info" | "pending"; readonly icon?: IconName };

export type ResultViewProps = {
  /** What was done, as the Record will name it. */
  readonly title: string;
  readonly verdict: ResultVerdict;
  /** One sentence on what happened. */
  readonly summary?: string;
  /** The readings the act moved, drawn from today. */
  readonly readings?: ReactNode;
  /** The door to the act's Record entry. */
  readonly record?: ReactNode;
  /** The one thing to do next, as a primary button. */
  readonly next?: ReactNode;
  /** Other ways on (back to the desk, open the subject). */
  readonly secondary?: ReactNode;
};

/**
 * The one result after a commit: the verdict with what was done, what it
 * moved, its Record entry and what to do next. There is no Close step: the
 * next action, or any way on, leaves it, and the Record keeps it.
 */
export function ResultView({ title, verdict, summary, readings, record, next, secondary }: ResultViewProps) {
  return (
    <Surface level="base" pad="lg" accentEdge={verdict.tone === "danger" ? "danger" : verdict.tone === "warning" ? "warning" : verdict.tone === "success" ? "success" : "accent"} role="region" aria-label={`${title}: ${verdict.word}`}>
      <Column gap="md">
        <Column gap="xs">
          <Tag tone={verdict.tone} {...(verdict.icon ? { icon: verdict.icon } : {})}>
            {verdict.word}
          </Tag>
          <Text variant="title" role="heading" aria-level={2}>
            {title}
          </Text>
          {summary ? (
            <Text variant="body" tone="secondary">
              {summary}
            </Text>
          ) : null}
        </Column>
        {readings}
        {record}
        {next || secondary ? (
          <Row gap="sm" wrap>
            {next}
            {secondary}
          </Row>
        ) : null}
      </Column>
    </Surface>
  );
}

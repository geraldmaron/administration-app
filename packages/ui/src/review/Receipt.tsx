import type { ReactNode } from "react";
import { Icon } from "../icons/Icon";
import { Badge } from "../primitives/Badge";
import { Column, Divider, Row } from "../primitives/Stack";
import { Surface } from "../primitives/Surface";
import { Text } from "../primitives/Text";

export type ReceiptLine = { readonly label: string; readonly value: ReactNode };

export type ReceiptProps = {
  /** What was done, as a past-tense sentence: "Answered: Firm". */
  readonly title: string;
  /** When, in the game's calendar. */
  readonly date: string;
  readonly lines: readonly ReceiptLine[];
  /** A refused act is still on the Record, so it still gets a receipt, without the check. */
  readonly outcome?: "done" | "refused";
  /** Where it is written down: the Record entry, or why it is not. */
  readonly record?: string;
  /** The record line is a warning: the act stands but the device did not keep it. */
  readonly unsaved?: boolean;
  /** Doors onward. */
  readonly children?: ReactNode;
};

/** The proof an act happened: what, when, what it set, and where it is recorded. */
export function Receipt({ title, date, lines, outcome = "done", record, unsaved, children }: ReceiptProps) {
  const refused = outcome === "refused";
  return (
    <Surface level="raised" pad="lg" accentEdge={refused ? "danger" : "success"} elevated role="article" aria-label={`Receipt: ${title}`}>
      <Column gap="md">
        <Row gap="md" top>
          <Icon name={refused ? "reject" : "approve"} size={32} tone={refused ? "danger" : "successInk"} weight="fill" />
          <Column flex={1} gap="2xs">
            {refused ? <Badge status="danger">Refused</Badge> : <Badge status="success">Done</Badge>}
            <Text variant="heading" role="heading" aria-level={2}>
              {title}
            </Text>
            {date ? (
              <Text variant="caption" tone="secondary">
                {date}
              </Text>
            ) : null}
          </Column>
        </Row>
        {lines.length > 0 ? (
          <Column gap="sm">
            <Divider />
            {lines.map((line) => (
              <Row key={line.label} gap="md" top wrap>
                <Text variant="label" tone="secondary" width={200}>
                  {line.label}
                </Text>
                {typeof line.value === "string" ? <Text variant="body" flex={1} minWidth={180}>{line.value}</Text> : line.value}
              </Row>
            ))}
          </Column>
        ) : null}
        {record ? (
          <Row gap="xs" top>
            <Icon name={unsaved ? "caution" : "record"} size={16} tone={unsaved ? "warningInk" : "colorSecondary"} />
            <Text variant="caption" tone={unsaved ? "warning" : "secondary"} flex={1}>
              {record}
            </Text>
          </Row>
        ) : null}
        {children ? (
          <Row gap="sm" wrap>
            {children}
          </Row>
        ) : null}
      </Column>
    </Surface>
  );
}

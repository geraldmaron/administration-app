import type { ReactNode } from "react";
import { Icon } from "../icons/Icon";
import { Tag } from "../primitives/Tag";
import { Surface } from "../primitives/Surface";
import { Column, Divider, Row } from "../primitives/Stack";
import { Text } from "../primitives/Text";

export type ReceiptLine = { readonly label: string; readonly value: string };

/**
 * The proof an act was taken: what was done and when, the lines it was
 * taken on, whether the one with the last word said no, and where it is
 * recorded. Its doors (the Record entry, back to the board) sit at the foot.
 */
export function ReceiptCard({ title, date, lines, outcome, record, children }: { readonly title: string; readonly date: string; readonly lines: readonly ReceiptLine[]; readonly outcome?: "refused"; readonly record: string; readonly children?: ReactNode }) {
  return (
    <Surface level="raised" pad="lg" accentEdge={outcome === "refused" ? "danger" : "success"} role="status" aria-label={`Receipt: ${title}`}>
      <Column gap="md">
        <Row gap="sm" top>
          <Icon name={outcome === "refused" ? "reject" : "approve"} size={28} tone={outcome === "refused" ? "danger" : "successInk"} weight="fill" />
          <Column flex={1} gap="2xs">
            <Text variant="eyebrow" tone="secondary">
              {outcome === "refused" ? "Tried, but turned down" : "Done"} · {date}
            </Text>
            <Text variant="title" role="heading" aria-level={2}>
              {title}
            </Text>
          </Column>
          {outcome === "refused" ? <Tag tone="danger">Refused</Tag> : <Tag tone="success">Recorded</Tag>}
        </Row>
        {lines.length > 0 ? (
          <Column gap="2xs">
            {lines.map((line) => (
              <Row key={line.label} gap="md" top wrap paddingVertical="2xs">
                <Text variant="label" tone="secondary" width={180}>
                  {line.label}
                </Text>
                <Text variant="body" flex={1} minWidth={160}>
                  {line.value}
                </Text>
              </Row>
            ))}
          </Column>
        ) : null}
        <Divider />
        <Text variant="label" weight="regular" tone="secondary">
          {record}
        </Text>
        {children ? (
          <Row gap="sm" wrap>
            {children}
          </Row>
        ) : null}
      </Column>
    </Surface>
  );
}

import type { ReactNode } from "react";
import { Column, Row } from "../../primitives/Stack";
import { Text } from "../../primitives/Text";
import type { ClassificationKey } from "../Classification";
import { Caps, Paper, Rule } from "../Paper";

// The President's Daily Brief as the community prints it: the title over the
// date, "For the President Only", then the morning's items, each a numbered
// article with its headline set as the lead. The marking is the engine's.

export type BriefItem = { readonly id: string; readonly headline: string; readonly body?: ReactNode };

export type BriefPaperProps = {
  readonly seal?: ReactNode;
  /** "20 January 2029", the brief's own date line. */
  readonly date: string;
  readonly items: readonly BriefItem[];
  /** Said when the morning carries nothing. */
  readonly empty: string;
  readonly level?: ClassificationKey;
  readonly caveat?: string;
};

export function BriefPaper({ seal, date, items, empty, level, caveat }: BriefPaperProps) {
  return (
    <Paper label={`The President's Daily Brief, ${date}`} {...(level ? { level } : {})} {...(caveat ? { caveat } : {})}>
      <Column gap="xs" alignItems="center">
        {seal ?? null}
        <Caps size="heading" weight="strong">The President's Daily Brief</Caps>
        <Caps size="caption">{date}</Caps>
        <Text variant="caption" serif center fontStyle="italic">
          For the President Only
        </Text>
      </Column>
      <Rule double />
      {items.length === 0 ? <Text variant="document">{empty}</Text> : null}
      {items.map((item, index) => (
        <Row key={item.id} gap="md" top>
          <Text variant="document" serif weight="strong" width={24} aria-hidden>
            {`${index + 1}.`}
          </Text>
          <Column flex={1} gap="xs" minWidth={0}>
            <Text variant="document" weight="strong">
              {item.headline}
            </Text>
            {item.body ? <Text variant="document">{item.body}</Text> : null}
          </Column>
        </Row>
      ))}
    </Paper>
  );
}

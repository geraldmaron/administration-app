import type { ReactNode } from "react";
import { Column, Row } from "../../primitives/Stack";
import { Text } from "../../primitives/Text";
import { Caps, Paper, Prose, Rule } from "../Paper";

// A White House release as the press office puts it out: the seal and the
// house, the office, the release line and date, the kind of release over its
// headline, the body, and the three marks that end it.

export type ReleasePaperProps = {
  readonly seal?: ReactNode;
  /** "Office of the Press Secretary". */
  readonly office: string;
  /** "January 21, 2029". */
  readonly date: string;
  /** "Statement", "Readout", "Fact sheet". */
  readonly kind: string;
  readonly headline: string;
  readonly paragraphs: readonly ReactNode[];
};

export function ReleasePaper({ seal, office, date, kind, headline, paragraphs }: ReleasePaperProps) {
  return (
    <Paper label={`${kind}: ${headline}`}>
      <Column gap="xs" alignItems="center">
        {seal ?? null}
        <Caps size="title" weight="strong">The White House</Caps>
        <Caps size="caption">{office}</Caps>
      </Column>
      <Rule />
      <Row between wrap gap="sm">
        <Text variant="label" serif weight="strong">FOR IMMEDIATE RELEASE</Text>
        <Text variant="label" serif>{date}</Text>
      </Row>
      <Column gap="2xs" alignItems="center" marginTop="sm">
        <Caps size="caption">{kind}</Caps>
        <Text variant="title" serif center weight="strong">
          {headline}
        </Text>
      </Column>
      {paragraphs.map((paragraph, index) => (
        <Prose key={index}>{paragraph}</Prose>
      ))}
      <Text variant="document" serif center>
        ###
      </Text>
    </Paper>
  );
}

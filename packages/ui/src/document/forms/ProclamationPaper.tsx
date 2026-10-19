import type { ReactNode } from "react";
import { Column } from "../../primitives/Stack";
import { Text } from "../../primitives/Text";
import { Caps, Paper, Prose, SignLine } from "../Paper";

// A proclamation as the President issues one: the title, "By the President
// of the United States of America, A Proclamation", the operative paragraph
// opening "NOW, THEREFORE, I, ...", any further paragraphs, the witness clause
// with the date it was signed, and the signature.

export type ProclamationPaperProps = {
  readonly seal?: ReactNode;
  /** "Declaring an Emergency in the State of Florida". */
  readonly title: string;
  /** Paragraphs that open "WHEREAS". */
  readonly whereas?: readonly string[];
  /** The operative words after "NOW, THEREFORE, I, {signer}, President of the United States of America, ". */
  readonly operative: string;
  readonly further?: readonly string[];
  readonly signer: string;
  /** "the twentieth day of January, in the year of our Lord two thousand twenty-nine": the witness clause's date, from the record. */
  readonly witnessed: string;
  readonly stamp?: ReactNode;
};

export function ProclamationPaper({ seal, title, whereas = [], operative, further = [], signer, witnessed, stamp }: ProclamationPaperProps) {
  return (
    <Paper label={`Proclamation: ${title}`} stamp={stamp}>
      <Column gap="xs" alignItems="center">
        {seal ?? null}
        <Caps size="title" weight="strong">{title}</Caps>
        <Text variant="document" serif center fontStyle="italic">
          By the President of the United States of America
        </Text>
        <Caps size="caption" weight="strong">A Proclamation</Caps>
      </Column>
      {whereas.map((line) => (
        <Prose key={line} indent>{line}</Prose>
      ))}
      <Prose indent>{`NOW, THEREFORE, I, ${signer.toUpperCase()}, President of the United States of America, ${operative}`}</Prose>
      {further.map((line) => (
        <Prose key={line} indent>{line}</Prose>
      ))}
      <Prose indent>{`IN WITNESS WHEREOF, I have hereunto set my hand this ${witnessed}.`}</Prose>
      <Column alignItems="flex-end" marginTop="md">
        <SignLine name={signer} office="President of the United States" />
      </Column>
    </Paper>
  );
}

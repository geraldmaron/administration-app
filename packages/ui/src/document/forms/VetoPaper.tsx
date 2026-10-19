import type { ReactNode } from "react";
import { Column } from "../../primitives/Stack";
import { Text } from "../../primitives/Text";
import { Caps, Paper, Prose, SignLine } from "../Paper";

// A veto message as the President returns it: addressed to the chamber the
// bill came from, the line returning the bill "without my approval", the
// objections, the signature, and the place and date.

export type VetoPaperProps = {
  readonly seal?: ReactNode;
  /** "To the House of Representatives:". */
  readonly chamber: "house" | "senate";
  /** "H. R. 4021". */
  readonly number: string;
  readonly title: string;
  /** The objections as the President stated them, or a line saying they were not kept. */
  readonly objections: string;
  readonly signer: string;
  /** "March 3, 2029". */
  readonly date: string;
};

export function VetoPaper({ seal, chamber, number, title, objections, signer, date }: VetoPaperProps) {
  return (
    <Paper label={`Veto message on ${number}, ${title}`}>
      <Column gap="xs" alignItems="center">
        {seal ?? null}
        <Caps size="caption" weight="strong">Veto message</Caps>
      </Column>
      <Text variant="document" weight="strong">
        {chamber === "house" ? "To the House of Representatives:" : "To the Senate of the United States:"}
      </Text>
      <Prose indent>{`I am returning herewith without my approval ${number}, the “${title.replace(/^The\s+/, "")}.”`}</Prose>
      <Prose indent>{objections}</Prose>
      <Column alignItems="flex-end" marginTop="md">
        <SignLine name={signer} office="President of the United States" />
      </Column>
      <Text variant="document" serif>{`THE WHITE HOUSE,\n${date}.`}</Text>
    </Paper>
  );
}

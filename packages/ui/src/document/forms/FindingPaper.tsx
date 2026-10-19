import type { ReactNode } from "react";
import { Column } from "../../primitives/Stack";
import { Caps, HeadLine, Paper, Prose, Rule, SignLine } from "../Paper";

// A presidential finding as the law requires it be written: titled under
// section 503 of the National Security Act of 1947, the determination the
// statute asks the President to make, the scope and description, and the
// President's signature with the date it was signed.

export type FindingPaperProps = {
  readonly seal?: ReactNode;
  /** The government it is aimed at: "the Republic of Belarus". */
  readonly scope: string;
  /** What it authorizes, in its own words. */
  readonly description: string;
  readonly signer: string;
  /** "March 3, 2029". */
  readonly signed: string;
  readonly stamp?: ReactNode;
};

const DETERMINATION =
  "I hereby find that the following covert action is necessary to support identifiable foreign policy objectives of the United States and is important to the national security of the United States, which determination shall be recorded in this finding.";

export function FindingPaper({ seal, scope, description, signer, signed, stamp }: FindingPaperProps) {
  return (
    <Paper label={`Presidential finding concerning ${scope}`} stamp={stamp}>
      <Column gap="xs" alignItems="center">
        {seal ?? null}
        <Caps size="body" weight="strong">Presidential Finding</Caps>
        <Caps size="caption">Under Section 503 of the National Security Act of 1947, as amended</Caps>
      </Column>
      <Rule />
      <Prose>{DETERMINATION}</Prose>
      <Column gap="xs">
        <HeadLine label="SCOPE:">{scope}</HeadLine>
        <HeadLine label="DESCRIPTION:">{description}</HeadLine>
      </Column>
      <Column alignItems="flex-end" marginTop="md">
        <SignLine name={signer} office={`President of the United States · ${signed}`} />
      </Column>
    </Paper>
  );
}

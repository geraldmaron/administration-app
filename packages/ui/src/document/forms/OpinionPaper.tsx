import type { ReactNode } from "react";
import { Column, Row } from "../../primitives/Stack";
import { Text } from "../../primitives/Text";
import { Caps, Paper, Prose, Rule } from "../Paper";

// A court's decision as its slip opinion prints it: the running head with the
// term, the court in capitals, the docket number, the caption, the dates,
// the line saying who delivered the opinion, the opinion, and any dissent
// under its own heading.

export type OpinionPaperProps = {
  /** "SUPREME COURT OF THE UNITED STATES", or the lower court's name. */
  readonly court: string;
  /** "October Term, 2029", where the court sits in terms. */
  readonly term?: string;
  /** "No. 29–4417". */
  readonly docket: string;
  /** The case's caption: "In re Executive Order on Border Controls". */
  readonly caption: string;
  /** "Decided March 3, 2030". */
  readonly decided: string;
  /** What the court did, said once above the opinion. */
  readonly holding: ReactNode;
  readonly opinion?: { readonly author?: string; readonly text: ReactNode; readonly forCourt: boolean };
  readonly dissent?: { readonly author?: string; readonly text: ReactNode };
  readonly stamp?: ReactNode;
};

export function OpinionPaper({ court, term, docket, caption, decided, holding, opinion, dissent, stamp }: OpinionPaperProps) {
  return (
    <Paper label={`${court}, ${caption}, ${decided}`} stamp={stamp}>
      <Row between>
        <Text variant="caption" serif>(Slip Opinion)</Text>
        {term ? <Caps size="caption">{term}</Caps> : null}
      </Row>
      <Rule />
      <Caps size="title" weight="strong">{court}</Caps>
      <Caps size="caption">{docket}</Caps>
      <Rule />
      <Caps size="body" weight="strong">{caption}</Caps>
      <Text variant="caption" serif center>
        {decided}
      </Text>
      <Rule />
      <Column gap="xs">
        <Caps size="caption">Judgment</Caps>
        <Prose>{holding}</Prose>
      </Column>
      {opinion ? (
        <Column gap="sm">
          <Prose>{opinion.author ? `${opinion.author.toUpperCase()} delivered the ${opinion.forCourt ? "opinion of the Court" : "judgment"}.` : `${opinion.forCourt ? "Opinion of the Court" : "Judgment of the court"}.`}</Prose>
          <Prose indent>{opinion.text}</Prose>
        </Column>
      ) : null}
      {dissent ? (
        <Column gap="sm">
          <Rule />
          <Prose>{dissent.author ? `${dissent.author.toUpperCase()}, dissenting.` : "Dissenting opinion."}</Prose>
          <Prose indent>{dissent.text}</Prose>
        </Column>
      ) : null}
    </Paper>
  );
}

import type { ReactNode } from "react";
import { Column } from "../../primitives/Stack";
import { Text } from "../../primitives/Text";
import { Caps, Paper, Prose, RunIn, SignLine } from "../Paper";

// An executive order as the White House issues it: the form's name over the
// order's title in capitals, the authority clause, numbered sections with
// run-in heads, the President's signature, and the place and date it was
// signed. The seal sits at the head, as on the signed original.

export type OrderSection = { readonly heading: string; readonly body: ReactNode };

export type OrderPaperProps = {
  /** "Executive Order 14512", or undefined for a draft that has no number yet. */
  readonly number?: string;
  readonly title: string;
  readonly seal?: ReactNode;
  /** The authority clause; defaults to the standard words. */
  readonly authority?: string;
  readonly sections: readonly OrderSection[];
  /** The President's name once signed; a draft leaves the line blank. */
  readonly signer?: string;
  /** "January 21, 2029", once signed. */
  readonly signed?: string;
  readonly stamp?: ReactNode;
};

const AUTHORITY = "By the authority vested in me as President by the Constitution and the laws of the United States of America, it is hereby ordered as follows:";

export function OrderPaper({ number, title, seal, authority = AUTHORITY, sections, signer, signed, stamp }: OrderPaperProps) {
  return (
    <Paper label={`${number ?? "Draft executive order"}: ${title}`} stamp={stamp}>
      <Column gap="sm" alignItems="center">
        {seal ?? null}
        <Caps size="caption">{number ?? "Executive Order (draft, not yet numbered)"}</Caps>
        <Caps size="title" weight="strong">{title}</Caps>
      </Column>
      <Prose>{authority}</Prose>
      {sections.map((section, index) => (
        <RunIn key={section.heading} head={`${index === 0 ? "Section" : "Sec."} ${index + 1}. ${section.heading}.`}>
          {section.body}
        </RunIn>
      ))}
      <Column alignItems="flex-end" marginTop="md">
        <SignLine {...(signer ? { name: signer } : {})} office={signer ? "President of the United States" : "Unsigned: the President's signature goes here"} />
      </Column>
      <Text variant="document" serif>
        {`THE WHITE HOUSE,${signed ? `\n${signed}.` : ""}`}
      </Text>
    </Paper>
  );
}

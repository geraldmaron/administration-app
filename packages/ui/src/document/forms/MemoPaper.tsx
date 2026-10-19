import type { ReactNode } from "react";
import { Column } from "../../primitives/Stack";
import { Text } from "../../primitives/Text";
import type { ClassificationKey } from "../Classification";
import { Caps, HeadLine, Paper, Rule } from "../Paper";

// A memorandum to the President as an office sends one: the office's emblem
// and name in the letterhead, the date, "MEMORANDUM FOR THE PRESIDENT", the
// FROM and SUBJECT lines, a rule, then the body. Classified memoranda carry the
// engine's marking as banners top and bottom.

export type MemoPaperProps = {
  readonly seal?: ReactNode;
  /** The office in the letterhead: "Department of the Treasury". */
  readonly house: string;
  /** "January 20, 2029". Left out where the record keeps no date. */
  readonly date?: string;
  /** Whom it is for; the President unless said otherwise. */
  readonly to?: string;
  /** "Johnny Guzman, Secretary of the Treasury". */
  readonly from?: string;
  readonly subject: string;
  readonly level?: ClassificationKey;
  readonly caveat?: string;
  readonly stamp?: ReactNode;
  readonly children: ReactNode;
  /** Routing and handling at the foot. */
  readonly footer?: ReactNode;
};

export function MemoPaper({ seal, house, date, to = "The President", from, subject, level, caveat, stamp, children, footer }: MemoPaperProps) {
  return (
    <Paper label={`Memorandum: ${subject}`} {...(level ? { level } : {})} {...(caveat ? { caveat } : {})} stamp={stamp}>
      <Column gap="xs" alignItems="center">
        {seal ?? null}
        <Caps size="caption" weight="strong">{house}</Caps>
        <Caps size="caption">Washington</Caps>
      </Column>
      {date ? (
        <Text variant="document" serif textAlign="right">
          {date}
        </Text>
      ) : null}
      <Caps size="body" weight="strong">{`Memorandum for ${to}`}</Caps>
      <Column gap="xs">
        {from ? <HeadLine label="FROM:">{from}</HeadLine> : null}
        <HeadLine label="SUBJECT:">{subject}</HeadLine>
      </Column>
      <Rule />
      <Column gap="md">{children}</Column>
      {footer ? (
        <>
          <Rule />
          {footer}
        </>
      ) : null}
    </Paper>
  );
}

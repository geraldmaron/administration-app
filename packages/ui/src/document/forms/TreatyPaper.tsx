import type { ReactNode } from "react";
import { Column, Row } from "../../primitives/Stack";
import { Text } from "../../primitives/Text";
import { Caps, Paper, Prose, Rule, RunIn, SignLine, SignRow } from "../Paper";

// An international agreement as the parties sign it: its title naming the
// parties, the preamble, numbered articles, the clause saying where and when
// it was done, and one signature block for each party.

export type TreatyArticle = { readonly heading: string; readonly body: ReactNode };

export type TreatyPaperProps = {
  /** "Agreement between the United States of America and the Republic of Korea on ...". */
  readonly title: string;
  /** Each party as it signs: "the United States of America". */
  readonly parties: readonly { readonly name: string; readonly signer?: string }[];
  readonly articles: readonly TreatyArticle[];
  /** "Done at Washington, March 3, 2030", once signed. */
  readonly done?: string;
  /** The parties' flags or seals, drawn in a row at the head. */
  readonly marks?: ReactNode;
  readonly stamp?: ReactNode;
};

const sentence = (text: string): string => text.charAt(0).toUpperCase() + text.slice(1);

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];

export function TreatyPaper({ title, parties, articles, done, marks, stamp }: TreatyPaperProps) {
  return (
    <Paper label={title} stamp={stamp}>
      {marks ? (
        <Row gap="md" justifyContent="center">
          {marks}
        </Row>
      ) : null}
      <Caps size="title" weight="strong">{title}</Caps>
      <Rule double />
      <Prose>{sentence(`${parties.map((party) => party.name).join(" and ")}, hereinafter referred to as \u201cthe Parties,\u201d`)}</Prose>
      <Prose>Have agreed as follows:</Prose>
      {articles.map((article, index) => (
        <Column key={article.heading} gap="xs">
          <Caps size="caption">{`Article ${ROMAN[index] ?? String(index + 1)}`}</Caps>
          <RunIn head={`${article.heading}.`}>{article.body}</RunIn>
        </Column>
      ))}
      <Prose>{done ? `${done}, in duplicate, both texts being equally authentic.` : "Not yet signed by the Parties."}</Prose>
      <SignRow>
        {parties.map((party) => (
          <SignLine key={party.name} {...(party.signer ? { name: party.signer } : {})} office={`For ${party.name}:`} />
        ))}
      </SignRow>
      <Text variant="caption" tone="tertiary" serif center>
        {"IN WITNESS WHEREOF, the undersigned, being duly authorized by their respective Governments, have signed this Agreement."}
      </Text>
    </Paper>
  );
}

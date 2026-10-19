import type { ReactNode } from "react";
import { Column, Row } from "../../primitives/Stack";
import { Text } from "../../primitives/Text";
import { Caps, Paper, Prose, Rule, RunIn, SignLine, SignRow } from "../Paper";
import { congressOrdinalWords, ordinalSuffix } from "./ordinals";

// A bill as Congress prints it. While it moves it is the introduced print:
// the Congress and session, the bill number, the chamber, how it came in,
// "A BILL", its long title, the enacting clause and its numbered sections.
// Once it is law it is the enrolled Act: the Congress named in full, "AN ACT",
// the same sections, and the three signatures that make it law.

export type BillSection = { readonly heading: string; readonly body: ReactNode };

export type BillPaperProps = {
  /** The Congress it sits in, as a number: 121. */
  readonly congress: number;
  /** 1 or 2. */
  readonly session: number;
  /** "H. R. 4021" or "S. 1187". */
  readonly number: string;
  readonly chamber: "house" | "senate";
  /** "January 22, 2029". */
  readonly introduced: string;
  /** How it came in, in the record's words: "introduced the following bill, by request". */
  readonly introducedBy: string;
  /** The short title: "National Infrastructure Investment Act". */
  readonly title: string;
  /** The long title, from "To": "To provide for ... and for other purposes." */
  readonly longTitle: string;
  readonly sections: readonly BillSection[];
  /** Present once it is law: the enrolled print, the President's name when the President signed it, and the endorsement saying how it became law. */
  readonly enrolled?: { readonly signer?: string; readonly endorsement: string };
  readonly stamp?: ReactNode;
};

/** Bills print a number beside every line; here every block of text carries the next one, set in the margin. */
function Numbered({ from, children }: { readonly from: number; readonly children: ReactNode }) {
  return (
    <Row gap="md" top>
      <Text variant="caption" tone="tertiary" width={20} textAlign="right" tabular aria-hidden>
        {String(from)}
      </Text>
      <Column flex={1} minWidth={0}>
        {children}
      </Column>
    </Row>
  );
}

function IntroducedHead({ props }: { readonly props: BillPaperProps }) {
  return (
    <>
      <Row between top>
        <Column>
          <Text variant="label" serif>{`${ordinalSuffix(props.congress).toUpperCase()} CONGRESS`}</Text>
          <Text variant="label" serif>{`${ordinalSuffix(props.session).toUpperCase()} SESSION`}</Text>
        </Column>
        <Text variant="heading" serif marginRight={props.stamp ? 120 : 0}>
          {props.number}
        </Text>
      </Row>
      <Column gap="xs" marginTop="sm">
        <Caps size="caption">{props.chamber === "house" ? "In the House of Representatives" : "In the Senate of the United States"}</Caps>
        <Text variant="caption" serif center>
          {props.introduced}
        </Text>
        <Prose indent>{props.introducedBy}</Prose>
      </Column>
      <Rule />
      <Caps size="display">A Bill</Caps>
      <Prose indent>{props.longTitle}</Prose>
      <Rule />
    </>
  );
}

function EnrolledHead({ props }: { readonly props: BillPaperProps }) {
  return (
    <Column gap="sm" alignItems="center">
      <Text variant="title" serif center fontStyle="italic">
        {`${congressOrdinalWords(props.congress)} Congress of the United States of America`}
      </Text>
      <Caps size="caption">{`At the ${props.session === 1 ? "first" : "second"} session`}</Caps>
      <Rule double />
      <Caps size="display">An Act</Caps>
      <Prose center>{props.longTitle}</Prose>
      <Rule />
    </Column>
  );
}

export function BillPaper(props: BillPaperProps) {
  const enacting = "Be it enacted by the Senate and House of Representatives of the United States of America in Congress assembled,";
  return (
    <Paper label={`${props.number}, ${props.enrolled ? "an act" : "a bill"}: ${props.title}`} stamp={props.stamp}>
      {props.enrolled ? <EnrolledHead props={props} /> : <IntroducedHead props={props} />}
      <Numbered from={1}>
        <Prose italic>{enacting}</Prose>
      </Numbered>
      {props.sections.map((section, index) => (
        <Numbered key={section.heading} from={index + 2}>
          <RunIn head={`${index === 0 ? "SECTION" : "SEC."} ${index + 1}. ${section.heading.toUpperCase()}.`}>{section.body}</RunIn>
        </Numbered>
      ))}
      {props.enrolled ? (
        <SignRow>
          <SignLine office="Speaker of the House of Representatives." />
          <SignLine office="Vice President of the United States and President of the Senate." />
          <SignLine {...(props.enrolled.signer ? { name: props.enrolled.signer } : {})} office={props.enrolled.endorsement} />
        </SignRow>
      ) : null}
    </Paper>
  );
}

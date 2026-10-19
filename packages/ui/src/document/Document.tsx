import type { ReactNode } from "react";
import { Theme, View } from "@tamagui/core";
import { Column, Divider, Row } from "../primitives/Stack";
import { Text } from "../primitives/Text";
import { ClassificationBanner, PortionMark, type ClassificationKey } from "./Classification";

export type DocumentProps = {
  /** The issuing office, set in the letterhead: "The White House, Office of the Press Secretary". */
  readonly issuer: string;
  /** The document's kind: "Executive Order", "The President's Daily Brief", "Memorandum for the President". */
  readonly kind: string;
  readonly title?: string;
  /** "January 21, 2029". */
  readonly date?: string;
  /** The seal or emblem drawn in the letterhead. */
  readonly seal?: ReactNode;
  /** Present for classified material: it sets the banner and moves the page onto the situation-room surface. */
  readonly level?: ClassificationKey;
  readonly caveat?: string;
  /** "Control number PDB-2029-0121". */
  readonly reference?: string;
  readonly children: ReactNode;
  /** The signature block or the routing at the foot. */
  readonly footer?: ReactNode;
};

/**
 * Anything that is paper in the fiction: an order, a memo, a brief, a
 * cable. Unclassified documents are paper with a serif body; classified ones
 * carry the banner top and bottom (DECISIONS §8.11). The letterhead names the
 * issuer under its seal so the player always knows which institution speaks.
 */
export function Document({ issuer, kind, title, date, seal, level, caveat, reference, children, footer }: DocumentProps) {
  const classified = level !== undefined && level !== "unclassified";
  return (
    <Theme name={classified ? "situation" : "paper"}>
      <View backgroundColor="surface" borderWidth={1} borderColor="borderColorStrong" borderRadius="chip" overflow="hidden" role="article" aria-label={`${kind}${title ? `: ${title}` : ""}`}>
        {level ? <ClassificationBanner level={level} caveat={caveat} /> : null}
        <Column gap="md" padding="xl">
          <Column gap="sm" alignItems="center">
            {seal}
            <Text variant="eyebrow" tone="secondary" center>
              {issuer}
            </Text>
            <Text variant="heading" serif center>
              {kind}
            </Text>
            {title ? (
              <Text variant="title" serif center weight="regular">
                {title}
              </Text>
            ) : null}
          </Column>
          <Divider strong />
          {date || reference ? (
            <Row between wrap gap="sm">
              {date ? (
                <Text variant="caption" tone="secondary">
                  {date}
                </Text>
              ) : null}
              {reference ? (
                <Text variant="caption" tone="secondary" mono>
                  {reference}
                </Text>
              ) : null}
            </Row>
          ) : null}
          <Column gap="md">{children}</Column>
          {footer ? (
            <>
              <Divider />
              {footer}
            </>
          ) : null}
        </Column>
        {level ? <ClassificationBanner level={level} caveat={caveat} /> : null}
      </View>
    </Theme>
  );
}

/** A paragraph of a document, with its portion mark when it is marked. */
export function DocParagraph({ children, level }: { readonly children: ReactNode; readonly level?: ClassificationKey }) {
  return (
    <Text variant="document">
      {level ? <PortionMark level={level} /> : null}
      {children}
    </Text>
  );
}

/** A signature block: the name, the office, and the date it was signed. */
export function SignatureBlock({ name, office, signed }: { readonly name: string; readonly office: string; readonly signed?: string }) {
  return (
    <Column gap="2xs" alignSelf="flex-end" minWidth={220}>
      <Text variant="title" serif fontStyle="italic">
        {name}
      </Text>
      <Divider strong />
      <Text variant="caption" tone="secondary">
        {office}
        {signed ? ` · ${signed}` : ""}
      </Text>
    </Column>
  );
}

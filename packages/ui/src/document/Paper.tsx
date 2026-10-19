import type { ReactNode } from "react";
import { Theme, View, useMedia } from "@tamagui/core";
import { Column, Divider, Row } from "../primitives/Stack";
import { Text } from "../primitives/Text";
import { ClassificationBanner, type ClassificationKey } from "./Classification";

// The page every printed government form sits on: a sheet of paper in the
// paper theme, set at a letter page's measure, with the form's own furniture
// drawn by the form itself. A stamp across the corner says what has happened
// to the paper since it was printed (signed, vetoed, law), the way a clerk
// would mark it, and it is said aloud as text.

export type StampTone = "law" | "refused" | "draft" | "pending";

const STAMP_INK = { law: "successInk", refused: "danger", draft: "warningInk", pending: "accent" } as const;
const STAMP_TEXT = { law: "success", refused: "danger", draft: "warning", pending: "accent" } as const;

/** A clerk's stamp: a ruled box of capitals, set at a slant in the paper's top corner. */
export function Stamp({ tone, children }: { readonly tone: StampTone; readonly children: string }) {
  return (
    <View position="absolute" top={16} right={20} zIndex={1} borderWidth={3} borderColor={STAMP_INK[tone]} borderRadius={4} paddingHorizontal="sm" paddingVertical={2} style={{ transform: [{ rotate: "-6deg" }] }} role="note" aria-label={`Stamped: ${children}`}>
      <Text variant="label" weight="strong" caps tone={STAMP_TEXT[tone]} aria-hidden>
        {children.toUpperCase()}
      </Text>
    </View>
  );
}

export type PaperProps = {
  /** Names the paper for a screen reader: "H. R. 4021, a bill". */
  readonly label: string;
  readonly stamp?: ReactNode;
  /** The engine's marking, for paper the fiction classifies: banners top and bottom, on the situation-room surface. */
  readonly level?: ClassificationKey;
  readonly caveat?: string;
  readonly children: ReactNode;
};

/** The sheet itself: paper, or the situation-room surface under its banners when the engine classifies it. */
export function Paper({ label, stamp, level, caveat, children }: PaperProps) {
  const media = useMedia();
  const classified = level !== undefined && level !== "unclassified";
  const banner = level ? <ClassificationBanner level={level} {...(caveat ? { caveat } : {})} /> : null;
  return (
    <Theme name={classified ? "situation" : "paper"}>
      <View
        width="100%"
        maxWidth={816}
        alignSelf="center"
        position="relative"
        backgroundColor="surface"
        borderWidth={1}
        borderColor="borderColorStrong"
        borderRadius={2}
        overflow="hidden"
        role="article"
        aria-label={label}
        shadowColor="shadowColor"
        shadowOpacity={1}
        shadowRadius={18}
        shadowOffset={{ width: 0, height: 6 }}
      >
        {banner}
        <View
          position="relative"
          paddingHorizontal={media.phone ? "lg" : 56}
          paddingVertical={media.phone ? "xl" : 48}
          // A stamp takes the top corner, so the form's own heading starts below it rather than under it.
          {...(stamp ? { paddingTop: media.phone ? 64 : 76 } : {})}
        >
          {stamp ?? null}
          <Column gap="md">{children}</Column>
        </View>
        {banner}
      </View>
    </Theme>
  );
}

/** A labeled line in a memorandum's heading block: "FROM:", "SUBJECT:". */
export function HeadLine({ label, children }: { readonly label: string; readonly children: ReactNode }) {
  return (
    <Row gap="md" top>
      <Text variant="document" serif weight="strong" minWidth={96} flexShrink={0} numberOfLines={1}>
        {label}
      </Text>
      <Text variant="document" flex={1}>
        {children}
      </Text>
    </Row>
  );
}

/** Capitals in the document face, centered: a form's fixed headings ("A BILL", "EXECUTIVE ORDER"). */
export function Caps({ children, size = "body", weight }: { readonly children: string; readonly size?: "caption" | "body" | "title" | "heading" | "display"; readonly weight?: "regular" | "strong" }) {
  const variant = size === "body" ? "document" : size;
  return (
    <Text variant={variant} caps serif center weight={weight === "strong" ? "strong" : undefined}>
      {children.toUpperCase()}
    </Text>
  );
}

/** Running text in the document face. */
export function Prose({ children, italic, center, indent }: { readonly children: ReactNode; readonly italic?: boolean; readonly center?: boolean; readonly indent?: boolean }) {
  return (
    <Text variant="document" {...(italic ? { fontStyle: "italic" } : {})} {...(center ? { center: true } : {})} {...(indent ? { paddingLeft: "xl" } : {})}>
      {children}
    </Text>
  );
}

/** A run-in heading and its text, as statutes and orders set them: "SEC. 2. FINDINGS." then the text. A body that is not text (a citation that opens the law) sits under its head instead. */
export function RunIn({ head, children }: { readonly head: string; readonly children: ReactNode }) {
  if (typeof children !== "string") {
    return (
      <Column gap="xs">
        <Text variant="document" weight="strong">
          {head}
        </Text>
        {children}
      </Column>
    );
  }
  return (
    <Text variant="document">
      <Text variant="document" weight="strong">
        {`${head} `}
      </Text>
      {children}
    </Text>
  );
}

/** A full-width rule; `double` for the heavy double rule under a form's heading. */
export function Rule({ double }: { readonly double?: boolean }) {
  return double ? (
    <Column gap={2}>
      <Divider strong />
      <Divider strong />
    </Column>
  ) : (
    <Divider strong />
  );
}

/** A line to sign on: the name over the rule when signed, the office under it. */
export function SignLine({ name, office, width = 260 }: { readonly name?: string; readonly office: string; readonly width?: number }) {
  return (
    <Column gap={2} width={width} maxWidth="100%">
      <Text variant="title" serif fontStyle="italic" minHeight={28}>
        {name ?? ""}
      </Text>
      <Divider strong />
      <Text variant="caption" tone="secondary">
        {office}
      </Text>
    </Column>
  );
}

/** A row of signature lines that wraps on a phone. */
export function SignRow({ children }: { readonly children: ReactNode }) {
  return (
    <Row gap="xl" wrap rowGap="lg" marginTop="md">
      {children}
    </Row>
  );
}

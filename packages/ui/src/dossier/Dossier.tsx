import type { ReactNode } from "react";
import { Theme, View, useMedia } from "@tamagui/core";
import { Icon, type IconName } from "../icons/Icon";
import { Column, Row } from "../primitives/Stack";
import { Surface } from "../primitives/Surface";
import { Text } from "../primitives/Text";

// The official frame an office's file is laid out in: a navy banner with the
// house that keeps it, an identity plate, then numbered sections, the way a
// briefing memorandum is laid out.

export type DossierProps = {
  /** What kind of file this is: "Personnel record", "Office file". */
  readonly kind: string;
  /** The house that keeps it: "United States House". Left out when it would only repeat the file's name. */
  readonly house?: string;
  /** How it is marked for handling, read first. */
  readonly marking?: string;
  readonly children: ReactNode;
};

/** The file's frame: one thin document strip (what it is, how it is marked), then the body. The identity block under it carries the name. */
export function Dossier({ kind, house, marking = "For the President", children }: DossierProps) {
  const media = useMedia();
  return (
    <Surface level="base" pad="none" overflow="hidden" role="article" aria-label={house ? `${kind}: ${house}` : kind}>
      <Theme name="chrome">
        <Row gap="sm" paddingHorizontal={media.phone ? "md" : "lg"} paddingVertical="sm" backgroundColor="chromeBackground" borderBottomWidth={3} borderBottomColor="goldRule" alignItems="center" justifyContent="space-between">
          <Text variant="eyebrow" tone="gold" flexShrink={1}>
            {house ? `${kind} · ${house}` : kind}
          </Text>
          <View borderWidth={1} borderColor="goldRule" paddingHorizontal="sm" paddingVertical="2xs" borderRadius="chip" flexShrink={0}>
            <Text variant="eyebrow" tone="gold">
              {marking}
            </Text>
          </View>
        </Row>
      </Theme>
      <Column gap="xl" padding={media.phone ? "md" : "xl"}>
        {children}
      </Column>
    </Surface>
  );
}

/** A six-figure file number that is the same for the same record every time, so a file reads as filed rather than generated. */
export function fileNumber(id: string): string {
  const hash = [...id].reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) % 1_000_000, 7);
  return String(hash).padStart(6, "0");
}

export type IdPlateProps = {
  /** The face, the seal or the flag. */
  readonly mark: ReactNode;
  /** The name, which is the page's only level-one heading. */
  readonly title: string;
  /** The role or post, stated once, as the door to where it is held. */
  readonly door?: ReactNode;
  readonly tags?: ReactNode;
  readonly line?: ReactNode;
  readonly reference?: { readonly id: string; readonly dated: string };
};

/** Who or what the file is about: the mark, the name, the role once, the tags that say where they stand, one quiet meta line. */
export function IdPlate({ mark, title, door, tags, line, reference }: IdPlateProps) {
  const media = useMedia();
  return (
    <Row gap="lg" top wrap>
      <View>{mark}</View>
      <Column gap="xs" flexGrow={1} flexShrink={1} flexBasis={media.phone ? "100%" : 240} minWidth={0}>
        <Text variant={media.phone ? "heading" : "display"} role="heading" aria-level={1}>
          {title}
        </Text>
        {door ? <View alignSelf="flex-start" maxWidth="100%">{typeof door === "string" ? <Text variant="body">{door}</Text> : door}</View> : null}
        {tags ? (
          <Row gap="xs" wrap>
            {tags}
          </Row>
        ) : null}
        {line ? (
          <Text variant="body" tone="secondary">
            {line}
          </Text>
        ) : null}
        {reference ? (
          <Text variant="caption" tone="tertiary">
            {`File ${fileNumber(reference.id)} · As of ${reference.dated}`}
          </Text>
        ) : null}
      </Column>
    </Row>
  );
}

export type DossierSectionProps = {
  readonly n: number;
  readonly icon: IconName;
  readonly title: string;
  readonly note?: ReactNode;
  readonly children: ReactNode;
};

/** A numbered section of the file, with its mark and a one-line note on what it reads. */
export function DossierSection({ n, icon, title, note, children }: DossierSectionProps) {
  return (
    <Column gap="md" role="region" aria-label={title}>
      <Column gap="2xs" borderBottomWidth={1} borderBottomColor="borderColor" paddingBottom="xs">
        <Row gap="sm">
          <View width={24} height={24} borderRadius="pill" backgroundColor="accentFill" alignItems="center" justifyContent="center">
            <Text variant="caption" weight="strong" tone="inverse">
              {n}
            </Text>
          </View>
          <Icon name={icon} size={18} tone="gold" />
          <Text variant="title" role="heading" aria-level={2} flex={1}>
            {title}
          </Text>
        </Row>
        {note ? (
          <Text variant="caption" tone="secondary">
            {note}
          </Text>
        ) : null}
      </Column>
      {children}
    </Column>
  );
}

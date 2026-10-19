import type { ReactNode } from "react";
import { View, useMedia } from "@tamagui/core";
import { Column, Divider, Row } from "../primitives/Stack";
import { Surface } from "../primitives/Surface";
import { anchorHref, pressLink, type LinkPress } from "../primitives/link-press";
import { Text } from "../primitives/Text";

/** A name that appears in the body and the way into it. */
export type ArticleEntity = { readonly text: string; readonly href?: string; readonly onOpen: () => void };

export type ArticleViewProps = {
  /** The outlet's nameplate, drawn full. */
  readonly masthead: ReactNode;
  /** "News report · Wars and fronts". */
  readonly kicker: string;
  readonly headline: string;
  /** The standfirst under the headline. */
  readonly dek: string;
  /** "GENEVA, March 3, 2029". */
  readonly dateline: string;
  readonly byline: string;
  /** The first is the lede and is set larger. */
  readonly paragraphs: readonly string[];
  /** The scene still, already drawn. */
  readonly art?: ReactNode;
  /** A second desk that filed the same story. */
  readonly also?: string;
  /** Why the administration should keep it in view. */
  readonly relevance?: string;
  /** Topic tags and links to what the story names, drawn by the app. */
  readonly tags?: ReactNode;
  /** Names the body mentions that open their subject; each appearance in the text becomes a link. */
  readonly entities?: readonly ArticleEntity[];
};

const escapeRegExp = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** A paragraph's text with every named entity set as an inline link, longest names matched first. */
function withEntities(text: string, entities: readonly ArticleEntity[]): ReactNode {
  const named = entities.filter((entity) => entity.text.length > 0);
  if (named.length === 0) return text;
  const pattern = new RegExp(`(${[...named].sort((a, b) => b.text.length - a.text.length).map((entity) => escapeRegExp(entity.text)).join("|")})`);
  return text.split(pattern).map((part, i) => {
    const entity = named.find((candidate) => candidate.text === part);
    return entity ? (
      <Text key={i} {...(entity.href ? { render: "a", href: anchorHref(entity.href) } as const : {})} role={entity.href ? "link" : "button"} tabIndex={0} aria-label={`Open ${part}`} tone="accent" textDecorationLine="underline" onPress={entity.href ? ((event: LinkPress) => pressLink(event, entity.onOpen)) as never : entity.onOpen} onKeyDown={(event: { key: string }) => (!entity.href && event.key === "Enter" ? entity.onOpen() : undefined)}>
        {part}
      </Text>
    ) : (
      part
    );
  });
}

/**
 * One news report read whole, set as a paper sets it: nameplate, kicker,
 * headline, standfirst, the dateline and byline, then the piece, the lede
 * first and larger. The measure is held to a reading width.
 */
export function ArticleView({ masthead, kicker, headline, dek, dateline, byline, paragraphs, art, also, relevance, tags, entities = [] }: ArticleViewProps) {
  const media = useMedia();
  const [lede, ...rest] = paragraphs;
  return (
    <Surface pad={media.phone ? "lg" : "xl"} role="article" aria-label={`News report: ${headline}`}>
      <Column gap="md" maxWidth={720} alignSelf="center" width="100%">
        {masthead}
        <Text variant="eyebrow" tone="secondary">
          {kicker}
        </Text>
        <Text variant={media.phone ? "heading" : "display"} serif role="heading" aria-level={2}>
          {headline}
        </Text>
        <Text variant="title" serif weight="regular" tone="secondary">
          {dek}
        </Text>
        {art ? (
          <View height={media.phone ? 200 : 320} borderRadius="chip" overflow="hidden">
            {art}
          </View>
        ) : null}
        <Row gap="sm" wrap>
          <Text variant="eyebrow">
            {dateline}
          </Text>
          <Text variant="caption" tone="secondary">
            {byline}
          </Text>
        </Row>
        <Divider />
        {lede ? (
          <Text variant="title" serif weight="regular">
            {withEntities(lede, entities)}
          </Text>
        ) : null}
        {rest.map((paragraph, i) => (
          <Text key={i} variant="document">
            {withEntities(paragraph, entities)}
          </Text>
        ))}
        {also ? (
          <Text variant="caption" tone="secondary" fontStyle="italic">
            {also}
          </Text>
        ) : null}
        {relevance ? (
          <Surface level="raised" pad="md" accentEdge="gold">
            <Column gap="2xs">
              <Text variant="eyebrow" tone="gold">
                Why it matters to you
              </Text>
              <Text variant="body">{relevance}</Text>
            </Column>
          </Surface>
        ) : null}
        {tags ? (
          <Row gap="sm" wrap>
            {tags}
          </Row>
        ) : null}
      </Column>
    </Surface>
  );
}

/** A small label naming a topic: not a link, a word in a box. */
export function TopicTag({ children }: { readonly children: string }) {
  return (
    <View paddingHorizontal="sm" paddingVertical="2xs" borderRadius="chip" borderWidth={1} borderColor="borderColor">
      <Text variant="caption" tone="secondary">
        {children}
      </Text>
    </View>
  );
}

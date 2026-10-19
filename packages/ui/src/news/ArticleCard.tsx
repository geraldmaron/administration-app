import type { ReactNode } from "react";
import { View, useMedia } from "@tamagui/core";
import { Badge } from "../primitives/Badge";
import { CardLink } from "../primitives/CardLink";
import { Column, Row } from "../primitives/Stack";
import { Text } from "../primitives/Text";

/** How a story leans toward the administration, as the words and the edge it is drawn with. */
export type StoryLean = { readonly word: string; readonly tone: "critical" | "even" | "friendly" };

const LEAN_STATUS = { critical: "danger", even: "outline", friendly: "success" } as const;
const LEAN_EDGE = { critical: "danger", even: "borderColorStrong", friendly: "successInk" } as const;

export type ArticleSummary = {
  readonly headline: string;
  /** The masthead or issuer, already drawn: a compact Masthead, a seal and a name. */
  readonly source: ReactNode;
  readonly when: string;
  readonly topic: string;
  /** "Official notice", "Intelligence summary"; absent for ordinary reporting. */
  readonly kind?: string;
  readonly lean?: StoryLean;
  /** Links to what the story names, drawn by the app. */
  readonly tags?: ReactNode;
  readonly onOpen: () => void;
};

function Meta({ story }: { readonly story: ArticleSummary }) {
  return (
    <Row gap="sm" wrap>
      {story.kind ? <Badge status="info">{story.kind}</Badge> : null}
      {story.lean ? <Badge status={LEAN_STATUS[story.lean.tone]}>{story.lean.word}</Badge> : null}
      <Text variant="caption" tone="secondary">
        {story.topic}
      </Text>
      <Text variant="caption" tone="tertiary">
        {story.when}
      </Text>
    </Row>
  );
}

/**
 * One story in a list: who filed it, the headline, how it leans and what it
 * names. The whole row opens the story; a tag inside it opens what it names.
 * The lean is a colored edge and a word.
 */
export function ArticleRow({ story, first }: { readonly story: ArticleSummary; readonly first?: boolean }) {
  return (
    <CardLink onPress={story.onOpen} label={`Read: ${story.headline}`} level="flat" pad="md" radius="none" borderWidth={0} borderTopWidth={first ? 0 : 1} borderTopColor="borderColor" borderLeftWidth={3} borderLeftColor={story.lean ? LEAN_EDGE[story.lean.tone] : "transparent"} gap="xs" outlineOffset={-2}>
      {story.source}
      <Text variant="title" serif>
        {story.headline}
      </Text>
      <Meta story={story} />
      {story.tags ? (
        <Row gap="sm" wrap>
          {story.tags}
        </Row>
      ) : null}
    </CardLink>
  );
}

/** A story as a card on the front page: an optional still above, the source, the headline and the lean. The whole card opens it. */
export function ArticleCard({ story, art }: { readonly story: ArticleSummary; readonly art?: ReactNode }) {
  return (
    <CardLink onPress={story.onOpen} label={`Read: ${story.headline}`} pad="none" overflow="hidden" flex={1} minWidth={240}>
      {art ? <View height={120}>{art}</View> : null}
      <Column gap="xs" padding="md">
        {story.source}
        <Text variant="title" serif numberOfLines={3}>
          {story.headline}
        </Text>
        <Meta story={story} />
      </Column>
    </CardLink>
  );
}

/**
 * The week's lead story: its still across the top (or beside it on a wide
 * screen), the masthead, the headline at display size and the standfirst.
 * The whole card opens it.
 */
export function LeadStory({ story, art, dek, eyebrow }: { readonly story: ArticleSummary; readonly art?: ReactNode; readonly dek?: string; readonly eyebrow: string }) {
  const media = useMedia();
  const wide = Boolean(media.desktop);
  return (
    <CardLink onPress={story.onOpen} label={`Read the lead story: ${story.headline}`} pad="none" overflow="hidden" elevated>
      <View flexDirection={wide ? "row" : "column"}>
        {art ? <View height={wide ? undefined : 200} minHeight={wide ? 320 : undefined} flex={wide ? 1.2 : undefined}>{art}</View> : null}
        <Column gap="sm" padding={wide ? "xl" : "lg"} flex={wide ? 1 : undefined} justifyContent="center">
          <Text variant="eyebrow" tone="gold">
            {eyebrow}
          </Text>
          {story.source}
          <Text variant={wide ? "display" : "heading"} serif role="heading" aria-level={2}>
            {story.headline}
          </Text>
          {dek ? (
            <Text variant="body" tone="secondary" serif>
              {dek}
            </Text>
          ) : null}
          <Meta story={story} />
          {story.tags ? (
            <Row gap="sm" wrap>
              {story.tags}
            </Row>
          ) : null}
        </Column>
      </View>
    </CardLink>
  );
}

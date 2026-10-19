import { useEffect, useRef, useState, type ReactNode } from "react";
import { ScrollView, type ScrollViewInstance } from "react-native";
import { View, useMedia } from "@tamagui/core";
import { Icon } from "../icons/Icon";
import { Sheet } from "../layers/Sheet";
import { Button } from "../primitives/Button";
import { Column, Row } from "../primitives/Stack";
import { Surface } from "../primitives/Surface";
import { Text } from "../primitives/Text";
import type { LinkComponent } from "../shell/nav-types";
import { AnchorProvider, useAnchorRegistry, useLandOn } from "./Anchors";

export type ChapterLink = {
  readonly id: string;
  /** "1", "2", … or "A" for the A to Z. */
  readonly mark: string;
  readonly title: string;
  readonly href: string;
};

function ChapterList({ chapters, current, Link }: { readonly chapters: readonly ChapterLink[]; readonly current?: string; readonly Link: LinkComponent }) {
  return (
    <Column gap="2xs" role="list">
      {chapters.map((chapter) => {
        const on = chapter.id === current;
        return (
          <View key={chapter.id} role="listitem">
            <Link href={chapter.href} label={`${chapter.mark === "A" ? "" : `Chapter ${chapter.mark}: `}${chapter.title}`} current={on}>
              <Row gap="sm" paddingVertical="xs" paddingHorizontal="sm" borderRadius="control" backgroundColor={on ? "infoFill" : "transparent"}>
                <View width={26} height={26} borderRadius="pill" borderWidth={1} borderColor={on ? "accent" : "goldRule"} alignItems="center" justifyContent="center">
                  <Text variant="caption" weight="strong" tone={on ? "accent" : "gold"}>
                    {chapter.mark}
                  </Text>
                </View>
                <Text variant="label" tone={on ? "accent" : "primary"} weight={on ? "strong" : "medium"} flex={1}>
                  {chapter.title}
                </Text>
              </Row>
            </Link>
          </View>
        );
      })}
    </Column>
  );
}

function Lander({ id }: { readonly id: string | undefined }) {
  useLandOn(id);
  return null;
}

export type HandbookFrameProps = {
  readonly eyebrow: string;
  readonly title: string;
  readonly lede?: string;
  /** The way out of the Handbook, beside the title. */
  readonly back: ReactNode;
  readonly chapters: readonly ChapterLink[];
  /** The chapter on screen; absent on the contents page, which draws no rail. */
  readonly current?: string;
  readonly Link: LinkComponent;
  /** A section to land on once drawn. */
  readonly landOn?: string;
  readonly children: ReactNode;
};

function Header({ eyebrow, title, lede, back, phone }: Pick<HandbookFrameProps, "eyebrow" | "title" | "lede" | "back"> & { readonly phone: boolean }) {
  return (
    <Row gap="lg" top wrap={phone}>
      <Column gap="2xs" flex={1} minWidth={240}>
        <Row gap="xs">
          <Icon name="info" size={16} tone="gold" weight="fill" />
          <Text variant="eyebrow" tone="gold">
            {eyebrow}
          </Text>
        </Row>
        <Text variant={phone ? "heading" : "display"} role="heading" aria-level={1}>
          {title}
        </Text>
        {lede ? (
          <Text variant="body" tone="secondary" maxWidth={720}>
            {lede}
          </Text>
        ) : null}
      </Column>
      {back}
    </Row>
  );
}

/**
 * The Handbook's own frame, outside the game's: it reads with or without an
 * administration. A header with the way back, the chapter rail beside the
 * page on a desktop, a Chapters sheet on a phone, and named sections a link
 * can land on.
 */
export function HandbookFrame({ eyebrow, title, lede, back, chapters, current, Link, landOn, children }: HandbookFrameProps) {
  const media = useMedia();
  const phone = Boolean(media.phone);
  const rail = Boolean(media.desktop) && current !== undefined;
  const scroll = useRef<ScrollViewInstance | null>(null);
  const content = useRef<unknown>(null);
  const registry = useAnchorRegistry(scroll, content);
  const [open, setOpen] = useState(false);
  // A chapter chosen from the sheet replaces the page under it; the sheet goes with the page it was opened on.
  useEffect(() => setOpen(false), [current]);
  const pad = phone ? 16 : media.wide ? 40 : 28;
  return (
    <AnchorProvider registry={registry}>
      <ScrollView ref={scroll} style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: pad, paddingTop: phone ? 16 : 28, paddingBottom: 64 }}>
        <View ref={(node: unknown) => { content.current = node; }} width="100%" maxWidth={1240} alignSelf="center" gap={phone ? "lg" : "xl"}>
          <Header eyebrow={eyebrow} title={title} lede={lede} back={back} phone={phone} />
          {current !== undefined && !rail ? (
            <Row>
              <Button kind="secondary" size="compact" icon="menu" onPress={() => setOpen(true)}>
                Chapters
              </Button>
            </Row>
          ) : null}
          <Row gap="xl" top>
            {rail ? (
              <Surface level="raised" pad="sm" width={280} role="navigation" aria-label="Handbook chapters">
                <ChapterList chapters={chapters} current={current} Link={Link} />
              </Surface>
            ) : null}
            <Column flex={1} minWidth={0} gap="xl">
              {children}
            </Column>
          </Row>
        </View>
        <Lander id={landOn} />
      </ScrollView>
      <Sheet open={open} onClose={() => setOpen(false)} title="Handbook chapters" eyebrow="Handbook">
        <ChapterList chapters={chapters} current={current} Link={Link} />
      </Sheet>
    </AnchorProvider>
  );
}

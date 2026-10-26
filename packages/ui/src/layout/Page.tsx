import type { ReactNode } from "react";
import { ScrollView } from "react-native";
import { View, useMedia } from "@tamagui/core";
import type { IconName } from "../icons/Icon";
import { Column, Row } from "../primitives/Stack";
import { Text } from "../primitives/Text";
import { PageScrollProvider, usePageScroll } from "./anchors";
import { pageGutter } from "./gutter";
import { useHashLanding } from "./landing";

export type PageProps = {
  /** The institution or section the page belongs to, above the title. */
  readonly eyebrow?: string;
  readonly title: string;
  /** One sentence saying what this page answers. */
  readonly lede?: string;
  readonly icon?: IconName;
  /** Controls that act on the whole page: help, compare, filter. */
  readonly actions?: ReactNode;
  /** Art or an emblem beside the title: a seal, a flag, a portrait. */
  readonly emblem?: ReactNode;
  readonly children: ReactNode;
  /** Full-bleed pages (a map, a board) drop the reading measure. */
  readonly wide?: boolean;
  readonly testID?: string;
  /** The body supplies its own level-one heading (a file's identity block), so the page draws no header of its own. */
  readonly bare?: boolean;
};

export { pageGutter } from "./gutter";

/**
 * A working page: its header and its scrolling body at a reading width that
 * grows with the window. The header carries the page's identity so every
 * screen says where the President is and what it is for before any data.
 */
export function Page({ eyebrow, title, lede, actions, emblem, children, wide, testID, bare }: PageProps) {
  const media = useMedia();
  const pad = pageGutter(media);
  const { page, scrollRef, contentRef, onScroll } = usePageScroll();
  useHashLanding();
  return (
    <PageScrollProvider value={page}>
      <ScrollView ref={scrollRef} onScroll={onScroll} scrollEventThrottle={64} style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: pad, paddingTop: media.phone ? 16 : 28, paddingBottom: 64 }} testID={testID}>
        <View ref={contentRef as never} width="100%" maxWidth={wide ? 1680 : 1240} alignSelf="center" gap={media.phone ? "lg" : "xl"}>
          {bare ? null : <Row gap={media.phone ? "md" : "lg"} top wrap>
            {emblem ? <View flexShrink={0}>{emblem}</View> : null}
            {/* On a phone the title shares the emblem's line rather than wrapping beneath it, so the page starts a screen higher. */}
            <Column gap="2xs" flexGrow={1} flexShrink={1} flexBasis={media.phone ? 0 : 320} minWidth={media.phone ? 160 : 0}>
              {eyebrow ? (
                <Text variant="eyebrow" tone="tertiary">
                  {eyebrow}
                </Text>
              ) : null}
              <Text variant={media.phone ? "heading" : "display"} role="heading" aria-level={1}>
                {title}
              </Text>
              {lede ? (
                <Text variant="body" tone="secondary" maxWidth={720}>
                  {lede}
                </Text>
              ) : null}
            </Column>
            {actions && !media.phone ? <Row gap="sm" wrap flexShrink={1} maxWidth="100%">{actions}</Row> : null}
          </Row>}
          {actions && media.phone ? <Row gap="sm" wrap>{actions}</Row> : null}
          {children}
        </View>
      </ScrollView>
    </PageScrollProvider>
  );
}

import { View } from "@tamagui/core";
import { Theme } from "@tamagui/core";
import { useCallback, useState } from "react";
import { ScrollView, type LayoutChangeEvent, type NativeScrollEvent, type NativeSyntheticEvent } from "react-native";
import { BrandMark } from "../brand/BrandMark";
import { Icon } from "../icons/Icon";
import { CountDot } from "../primitives/Badge";
import { Column, Divider, Row } from "../primitives/Stack";
import { Text } from "../primitives/Text";
import type { LinkComponent, NavGroup, NavItem } from "./nav-types";

type RailProps = {
  readonly groups: readonly NavGroup[];
  readonly utilities: readonly NavItem[];
  readonly activeId: string | undefined;
  readonly Link: LinkComponent;
  /** Labeled navigation from 1440px; the compact rail below it. */
  readonly expanded: boolean;
  readonly title: string;
};

function RailItem({ item, active, expanded, Link }: { item: NavItem; active: boolean; expanded: boolean; Link: LinkComponent }) {
  const count = (item.fresh ?? 0) + (item.waiting ?? 0);
  return (
    <Link href={item.href} label={item.label} current={active}>
      <View
        flexDirection={expanded ? "row" : "column"}
        alignItems="center"
        gap={expanded ? "md" : "2xs"}
        // The labeled rail is pointer-driven at 1440 and wider, so a 28px row (above the 24px target minimum) lets every place fit a 900px-tall window without scrolling.
        paddingVertical={expanded ? "xs" : "sm"}
        paddingHorizontal={expanded ? "md" : "xs"}
        borderRadius="control"
        backgroundColor={active ? "surfaceRaised" : { default: "transparent", hover: "backgroundHover" }}
        borderLeftWidth={3}
        borderLeftColor={active ? "goldRule" : "transparent"}
        position="relative"
      >
        <Icon name={item.icon} size={expanded ? 20 : 22} tone={active ? "chromeColor" : "chromeSecondary"} weight={active ? "fill" : "duotone"} />
        {/* Pinned to the item's own corner, not the icon's: the rail's scroll view clips anything that overhangs the item. */}
        {!expanded && count > 0 ? (
          <View position="absolute" top={2} right={2}>
            <CountDot count={count} label={`${count} waiting`} />
          </View>
        ) : null}
        <Text variant={expanded ? "label" : "caption"} tone={active ? "primary" : "secondary"} numberOfLines={1} flex={expanded ? 1 : undefined} center={!expanded}>
          {item.label}
        </Text>
        {expanded && count > 0 ? <CountDot count={count} label={`${count} waiting`} /> : null}
      </View>
    </Link>
  );
}

/** A reserved strip that shows a chevron only while the list continues past that edge. */
function EdgeCue({ show, direction }: { show: boolean; direction: "up" | "down" }) {
  return (
    <View height={16} flexShrink={0} alignItems="center" justifyContent="center" borderColor="borderColor" borderTopWidth={direction === "down" && show ? 1 : 0} borderBottomWidth={direction === "up" && show ? 1 : 0} aria-hidden>
      {show ? (
        <View style={{ transform: [{ rotate: direction === "down" ? "90deg" : "-90deg" }] }}>
          <Icon name="chevron" size={14} tone="chromeSecondary" />
        </View>
      ) : null}
    </View>
  );
}

function useScrollEdges() {
  const [edges, setEdges] = useState({ up: false, down: false });
  const [, setSizes] = useState({ viewport: 0, content: 0 });
  const update = useCallback((offset: number, viewport: number, content: number) => {
    const up = offset > 1;
    const down = offset + viewport < content - 1;
    setEdges((prev) => (prev.up === up && prev.down === down ? prev : { up, down }));
  }, []);
  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, layoutMeasurement, contentSize } = e.nativeEvent;
    update(contentOffset.y, layoutMeasurement.height, contentSize.height);
  }, [update]);
  const onLayout = useCallback((e: LayoutChangeEvent) => {
    setSizes((prev) => {
      const next = { ...prev, viewport: e.nativeEvent.layout.height };
      update(0, next.viewport, next.content);
      return next;
    });
  }, [update]);
  const onContentSizeChange = useCallback((_w: number, h: number) => {
    setSizes((prev) => {
      const next = { ...prev, content: h };
      update(0, next.viewport, next.content);
      return next;
    });
  }, [update]);
  return { edges, onScroll, onLayout, onContentSizeChange };
}

/** The navy institutional navigation on tablet and desktop widths. */
export function NavRail({ groups, utilities, activeId, Link, expanded, title }: RailProps) {
  const { edges, onScroll, onLayout, onContentSizeChange } = useScrollEdges();
  return (
    <Theme name="chrome">
      <View width={expanded ? "nav" : "rail"} backgroundColor="background" borderRightWidth={1} borderRightColor="borderColor" alignSelf="stretch" minHeight={0}>
        <Row gap="sm" paddingHorizontal={expanded ? "lg" : "sm"} height="bar" flexShrink={0} justifyContent={expanded ? "flex-start" : "center"}>
          <BrandMark size={expanded ? 26 : 30} />
          {expanded ? (
            <Column>
              <Text variant="eyebrow" tone="gold">
                The
              </Text>
              <Text variant="title" weight="strong" marginTop={-4}>
                {title}
              </Text>
            </Column>
          ) : null}
        </Row>
        <Divider gold />
        {/* The list scrolls in the space the pinned utilities leave, so the two groups can never share pixels. */}
        <EdgeCue show={edges.up} direction="up" />
        <ScrollView style={{ flex: 1, minHeight: 0 }} onScroll={onScroll} scrollEventThrottle={32} onLayout={onLayout} onContentSizeChange={onContentSizeChange} contentContainerStyle={{ paddingVertical: 12, gap: 4 }} showsVerticalScrollIndicator={false}>
          <Column gap="md" paddingHorizontal={expanded ? "sm" : "xs"} role="navigation" aria-label="Main">
            {groups.map((group) => (
              <Column key={group.id} gap="2xs">
                {expanded && group.items.length > 1 ? (
                  <Text variant="eyebrow" tone="tertiary" paddingHorizontal="md" paddingBottom="2xs">
                    {group.label}
                  </Text>
                ) : null}
                {group.items.map((item) => (
                  <RailItem key={item.id} item={item} active={item.id === activeId} expanded={expanded} Link={Link} />
                ))}
              </Column>
            ))}
          </Column>
        </ScrollView>
        <EdgeCue show={edges.down} direction="down" />
        <Divider />
        <Column gap="2xs" padding={expanded ? "sm" : "xs"} flexShrink={0} backgroundColor="background">
          {utilities.map((item) => (
            <RailItem key={item.id} item={item} active={item.id === activeId} expanded={expanded} Link={Link} />
          ))}
        </Column>
      </View>
    </Theme>
  );
}

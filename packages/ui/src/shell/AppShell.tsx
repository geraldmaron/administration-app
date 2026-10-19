import type { ReactNode } from "react";
import { Theme, View, useMedia } from "@tamagui/core";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NavRail } from "./NavRail";
import { TabBar } from "./TabBar";
import type { LinkComponent, NavGroup, NavItem } from "./nav-types";

export type AppShellProps = {
  readonly groups: readonly NavGroup[];
  readonly utilities: readonly NavItem[];
  /** The items the phone bar names; the rest live behind More. */
  readonly phoneItems: readonly NavItem[];
  readonly activeId: string | undefined;
  /** The phone bar's item for this place, which may be a group's lead or More. */
  readonly phoneActiveId?: string | undefined;
  readonly Link: LinkComponent;
  /** The situation bar: date, standing, the inbox and Continue. */
  readonly bar: ReactNode;
  /** The marking and workspace lines above the whole frame, full width. */
  readonly frameTop?: ReactNode;
  /** The marking line closing the frame; on a phone it sits above the tab bar so the thumb target stays at the screen's edge. */
  readonly frameBottom?: ReactNode;
  readonly children: ReactNode;
  readonly title?: string;
};

/**
 * The frame every working screen sits in. Layout follows width alone
 * (DECISIONS §8.5): a bottom bar below 768px, a compact rail to 1439px and
 * the labeled navigation from 1440px. What a President can do is the same at
 * every width; only where the controls sit changes.
 */
export function AppShell({ groups, utilities, phoneItems, activeId, phoneActiveId, Link, bar, frameTop, frameBottom, children, title = "Administration" }: AppShellProps) {
  const media = useMedia();
  const insets = useSafeAreaInsets();
  if (media.phone) {
    return (
      <View flex={1} backgroundColor="backgroundStrong">
        <View paddingTop={insets.top} backgroundColor="background" flexShrink={0}>
          {frameTop}
          <Theme name="chrome">
            <View backgroundColor="background">{bar}</View>
          </Theme>
        </View>
        <View flex={1} minHeight={0} overflow="hidden" role="main">
          {children}
        </View>
        <View flexShrink={0}>{frameBottom}</View>
        <TabBar items={phoneItems} activeId={phoneActiveId ?? activeId} Link={Link} />
      </View>
    );
  }
  return (
    <View flex={1} minHeight={0} backgroundColor="backgroundStrong" paddingTop={insets.top}>
      <View flexShrink={0}>{frameTop}</View>
      <View flex={1} minHeight={0} flexDirection="row">
        <NavRail groups={groups} utilities={utilities} activeId={activeId} Link={Link} expanded={Boolean(media.wide)} title={title} />
        <View flex={1} minWidth={0} minHeight={0}>
          <Theme name="chrome">
            <View backgroundColor="background" borderBottomWidth={1} borderBottomColor="borderColor" flexShrink={0}>
              {bar}
            </View>
          </Theme>
          <View flex={1} minHeight={0} overflow="hidden" role="main">
            {children}
          </View>
        </View>
      </View>
      <View flexShrink={0}>{frameBottom}</View>
    </View>
  );
}

import { Theme, View } from "@tamagui/core";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "../icons/Icon";
import { CountDot } from "../primitives/CountDot";
import { Text } from "../primitives/Text";
import type { LinkComponent, NavItem } from "./nav-types";

/** The phone bar: four destinations by name and More for the rest. */
export function TabBar({ items, activeId, Link }: { readonly items: readonly NavItem[]; readonly activeId: string | undefined; readonly Link: LinkComponent }) {
  const insets = useSafeAreaInsets();
  return (
    <Theme name="chrome">
      <View
        role="navigation"
        aria-label="Main"
        flexDirection="row"
        backgroundColor="background"
        borderTopWidth={1}
        borderTopColor="borderColor"
        paddingBottom={Math.max(insets.bottom, 4)}
        paddingTop="2xs"
      >
        {items.map((item) => {
          const active = item.id === activeId;
          const count = (item.fresh ?? 0) + (item.waiting ?? 0);
          return (
            // Cells take their content's width and share what is left, so "Government" is not cut at 320px while "Brief" has room to spare.
            <View key={item.id} flexGrow={1} flexBasis="auto">
              <Link href={item.href} label={item.label} current={active}>
                <View alignItems="center" gap="2xs" minHeight="tab" justifyContent="center" paddingVertical="xs">
                  <View position="relative" paddingVertical="2xs" paddingHorizontal="md" borderRadius="pill" backgroundColor={active ? "selected" : "transparent"}>
                    <Icon name={item.icon} size={24} tone={active ? "accent" : "colorTertiary"} weight={active ? "fill" : "regular"} />
                    {count > 0 ? (
                      <View position="absolute" top={-4} right={0}>
                        <CountDot count={count} label={`${count} waiting`} />
                      </View>
                    ) : null}
                  </View>
                  <Text variant="caption" tone={active ? "primary" : "secondary"} weight={active ? "strong" : "regular"} numberOfLines={1}>
                    {item.label}
                  </Text>
                </View>
              </Link>
            </View>
          );
        })}
      </View>
    </Theme>
  );
}

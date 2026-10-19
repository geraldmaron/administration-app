import { Theme, View } from "@tamagui/core";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "../icons/Icon";
import { CountDot } from "../primitives/Badge";
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
        borderTopWidth={2}
        borderTopColor="goldRule"
        paddingBottom={Math.max(insets.bottom, 4)}
        paddingTop="2xs"
      >
        {items.map((item) => {
          const active = item.id === activeId;
          const count = (item.fresh ?? 0) + (item.waiting ?? 0);
          return (
            <View key={item.id} flex={1}>
              <Link href={item.href} label={item.label} current={active}>
                <View alignItems="center" gap="2xs" minHeight="tab" justifyContent="center" paddingVertical="xs">
                  <View position="relative">
                    <Icon name={item.icon} size={24} tone={active ? "chromeColor" : "chromeSecondary"} weight={active ? "fill" : "regular"} />
                    {count > 0 ? (
                      <View position="absolute" top={-6} right={-12}>
                        <CountDot count={count} label={`${count} waiting`} />
                      </View>
                    ) : null}
                  </View>
                  <Text variant="caption" tone={active ? "primary" : "secondary"} weight={active ? "strong" : "regular"} numberOfLines={1}>
                    {item.label}
                  </Text>
                  <View height={3} width={20} borderRadius="pill" backgroundColor={active ? "goldRule" : "transparent"} />
                </View>
              </Link>
            </View>
          );
        })}
      </View>
    </Theme>
  );
}

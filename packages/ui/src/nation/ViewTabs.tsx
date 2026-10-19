import { View } from "@tamagui/core";
import { Icon, type IconName } from "../icons/Icon";
import { Pressable } from "../primitives/Button";
import { ScrollStrip } from "../primitives/ScrollStrip";
import { Row } from "../primitives/Stack";
import { Text } from "../primitives/Text";

export type ViewTab<T extends string> = { readonly id: T; readonly label: string; readonly count?: number; readonly icon?: IconName };

/**
 * The views of one subject: a row of tabs that keeps the page and its header
 * in place while the body below changes. It scrolls sideways on a phone
 * rather than wrapping, so the tabs keep one line and one order, and an
 * arrow at the edge shows when more tabs are past it.
 */
export function ViewTabs<T extends string>({ label, tabs, selected, onSelect }: { readonly label: string; readonly tabs: readonly ViewTab<T>[]; readonly selected: T; readonly onSelect: (id: T) => void }) {
  return (
    <View borderBottomWidth={1} borderBottomColor="borderColor">
      <ScrollStrip>
        <Row role="tablist" aria-label={label} gap="2xs">
          {tabs.map((tab) => {
            const current = tab.id === selected;
            return (
              <Pressable
                key={tab.id}
                role="tab"
                aria-selected={current}
                aria-label={tab.count === undefined ? tab.label : `${tab.label}, ${tab.count}`}
                onPress={() => onSelect(tab.id)}
                flexDirection="row"
                alignItems="center"
                gap="xs"
                paddingHorizontal="md"
                paddingVertical="sm"
                borderRadius={0}
                borderBottomWidth={3}
                borderBottomColor={current ? "accent" : "transparent"}
              >
                {tab.icon ? <Icon name={tab.icon} size={16} tone={current ? "accent" : "colorSecondary"} /> : null}
                <Text variant="label" tone={current ? "accent" : "secondary"}>
                  {tab.label}
                </Text>
                {tab.count === undefined ? null : (
                  <View minWidth={20} paddingHorizontal="xs" borderRadius="pill" backgroundColor={current ? "infoFill" : "pendingFill"} alignItems="center">
                    <Text variant="caption" weight="strong" tone={current ? "info" : "secondary"}>
                      {tab.count}
                    </Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </Row>
      </ScrollStrip>
    </View>
  );
}

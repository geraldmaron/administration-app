import type { ReactNode } from "react";
import { View } from "@tamagui/core";
import { Icon, type IconName } from "../icons/Icon";
import { Surface } from "../primitives/Surface";
import { Column, Row } from "../primitives/Stack";
import { Text } from "../primitives/Text";

export type Fact = { readonly label: string; readonly value: ReactNode; readonly icon?: IconName; readonly note?: string };

/** Terms as a list of name and value, the way an order's critical terms or a measure's context read. */
export function Facts({ items, label }: { readonly items: readonly Fact[]; readonly label?: string }) {
  return (
    <Column gap="2xs" role="list" aria-label={label}>
      {items.map((item) => (
        <Row key={item.label} gap="md" top wrap paddingVertical="xs" borderBottomWidth={1} borderBottomColor="borderColor" role="listitem">
          <Row gap="xs" width={200} minWidth={140} flexShrink={0}>
            {item.icon ? <Icon name={item.icon} size={16} tone="colorSecondary" /> : null}
            <Text variant="label" tone="secondary" flexShrink={1}>
              {item.label}
            </Text>
          </Row>
          <View flex={1} minWidth={180} gap="2xs">
            {typeof item.value === "string" ? <Text variant="body">{item.value}</Text> : item.value}
            {item.note ? (
              <Text variant="caption" tone="tertiary">
                {item.note}
              </Text>
            ) : null}
          </View>
        </Row>
      ))}
    </Column>
  );
}

/** Figures set side by side as tiles: a summary band over a workspace. */
export function FigureBand({ items, label }: { readonly items: readonly { readonly label: string; readonly value: string; readonly unit?: string; readonly note?: string; readonly tone?: "good" | "watch" | "bad" | "neutral"; readonly icon?: IconName }[]; readonly label: string }) {
  const ink = { good: "success", watch: "warning", bad: "danger", neutral: "primary" } as const;
  return (
    <Row gap="sm" wrap role="list" aria-label={label}>
      {items.map((item) => (
        <Surface key={item.label} level="raised" pad="md" flexGrow={1} flexBasis={160} minWidth={150} role="listitem" aria-label={`${item.label}: ${item.value}${item.unit ? ` ${item.unit}` : ""}${item.note ? `. ${item.note}` : ""}`}>
          <Column gap="2xs">
            <Row gap="xs">
              {item.icon ? <Icon name={item.icon} size={16} tone="colorSecondary" /> : null}
              <Text variant="label" tone="secondary" numberOfLines={2} flex={1}>
                {item.label}
              </Text>
            </Row>
            <Row gap="xs" alignItems="baseline" wrap>
              <Text variant="heading" tone={ink[item.tone ?? "neutral"]} tabular>
                {item.value}
              </Text>
              {item.unit ? (
                <Text variant="caption" tone="secondary">
                  {item.unit}
                </Text>
              ) : null}
            </Row>
            {item.note ? (
              <Text variant="caption" tone="tertiary">
                {item.note}
              </Text>
            ) : null}
          </Column>
        </Surface>
      ))}
    </Row>
  );
}

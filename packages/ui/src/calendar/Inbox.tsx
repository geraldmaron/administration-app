import type { ReactNode } from "react";
import { View } from "@tamagui/core";
import { Icon, type IconName } from "../icons/Icon";
import { CountDot } from "../primitives/CountDot";
import { Button, Pressable } from "../primitives/Button";
import { Column, Row } from "../primitives/Stack";
import { Text } from "../primitives/Text";
import type { Urgency } from "./types";

export type NotificationView = {
  readonly id: string;
  readonly title: string;
  readonly summary: string;
  readonly dateLabel: string;
  readonly sourceLabel: string;
  readonly icon: IconName;
  readonly urgency: Urgency;
  readonly read: boolean;
  readonly actionable: boolean;
  readonly href?: string;
  readonly onPress?: () => void;
  /** Who and what the item is about, as names that open a quick look; the screen builds them. */
  readonly refs?: ReactNode;
};

/** The bell in the situation bar: the count of unread matters, said in words. */
export function BellButton({ count, onPress }: { readonly count: number; readonly onPress: () => void }) {
  return (
    <View position="relative">
      <Button kind="quiet" size="compact" icon="notificationStack" label={count === 0 ? "Notifications: nothing new" : `Notifications: ${count} unread`} onPress={onPress} />
      {count > 0 ? (
        <View position="absolute" top={2} right={2} pointerEvents="none">
          <CountDot count={count} label={`${count} unread`} />
        </View>
      ) : null}
    </View>
  );
}

/** Every notification, unread first within urgency; a row needing an answer says so. */
export function NotificationList({ items, onMarkAllRead }: { readonly items: readonly NotificationView[]; readonly onMarkAllRead?: () => void }) {
  const unread = items.filter((item) => !item.read).length;
  return (
    <Column gap="sm">
      <Row between>
        <Text variant="label" tone="secondary">
          {unread === 0 ? "All read" : `${unread} unread`}
        </Text>
        {onMarkAllRead && unread > 0 ? (
          <Button kind="quiet" size="compact" icon="approve" onPress={onMarkAllRead}>
            Mark all read
          </Button>
        ) : null}
      </Row>
      {items.length === 0 ? (
        <Text variant="body" tone="secondary">
          No notifications yet.
        </Text>
      ) : null}
      {items.map((item) => (
        <Pressable key={item.id} href={item.href} onPress={item.onPress} disabled={!item.onPress} role={item.href ? "link" : "button"} aria-label={item.title} padding="md" borderRadius="card" borderWidth={1} borderColor={item.read ? "borderColor" : "borderColorStrong"} backgroundColor={item.read ? "surface" : { default: "surfaceRaised", hover: "surfaceHover" }} flexDirection="row" gap="md" alignItems="flex-start">
          <View paddingTop="2xs">
            <Icon name={item.icon} size={20} tone={item.urgency === "hard" ? "danger" : item.urgency === "soft" ? "warningInk" : "colorSecondary"} weight={item.read ? "regular" : "fill"} />
          </View>
          <Column flex={1} gap="2xs">
            <Row between gap="sm">
              <Text variant="eyebrow" tone="secondary" numberOfLines={1} flex={1}>
                {item.sourceLabel}
                {item.actionable ? " · Needs your answer" : ""}
              </Text>
              <Text variant="caption" tone="tertiary">
                {item.dateLabel}
              </Text>
            </Row>
            <Text variant="label" weight={item.read ? "medium" : "strong"}>
              {item.title}
            </Text>
            <Text variant="caption" tone="secondary" numberOfLines={3}>
              {item.summary}
            </Text>
            {item.refs}
          </Column>
          {item.read ? null : <View width={8} height={8} borderRadius="pill" backgroundColor="accent" marginTop="xs" aria-label="Unread" />}
        </Pressable>
      ))}
    </Column>
  );
}

import type { ReactNode } from "react";
import { Icon, type IconName } from "../icons/Icon";
import { Pressable } from "../primitives/Button";
import { Column, Row } from "../primitives/Stack";
import { Surface } from "../primitives/Surface";
import { Text } from "../primitives/Text";

/**
 * A person, government, institution, bill or place named in running text,
 * drawn as a link: a press opens it where the app decides (a peek sheet or
 * its own screen). The design system never routes.
 */
export function EntityLink({ label, href, onPress, icon }: { readonly label: string; readonly href?: string; readonly onPress: () => void; readonly icon?: IconName }) {
  return (
    <Pressable href={href} onPress={onPress} role="link" aria-label={label} flexDirection="row" alignItems="center" gap="2xs" alignSelf="flex-start" backgroundColor="transparent" borderRadius="chip">
      {icon ? <Icon name={icon} size={14} tone="accent" /> : null}
      <Text variant="label" tone="accent" textDecorationLine="underline">
        {label}
      </Text>
    </Pressable>
  );
}

export type RelatedItem = { readonly id: string; readonly label: string; readonly detail?: string; readonly icon?: IconName; readonly emblem?: ReactNode; readonly href?: string; readonly onPress: () => void };

/** What else bears on this page: the people, governments, laws and records linked to it. */
export function RelatedRail({ title = "Related", items }: { readonly title?: string; readonly items: readonly RelatedItem[] }) {
  if (items.length === 0) return null;
  return (
    <Surface level="raised" pad="md">
      <Column gap="sm">
        <Text variant="eyebrow" tone="secondary">
          {title}
        </Text>
        {items.map((item) => (
          <Pressable key={item.id} href={item.href} onPress={item.onPress} role="link" aria-label={item.label} padding="xs" flexDirection="row" alignItems="center" gap="sm">
            {item.emblem ?? (item.icon ? <Icon name={item.icon} size={20} tone="colorSecondary" /> : null)}
            <Column flex={1}>
              <Text variant="label" numberOfLines={1}>
                {item.label}
              </Text>
              {item.detail ? (
                <Text variant="caption" tone="secondary" numberOfLines={1}>
                  {item.detail}
                </Text>
              ) : null}
            </Column>
            <Row>
              <Icon name="chevron" size={16} tone="colorTertiary" />
            </Row>
          </Pressable>
        ))}
      </Column>
    </Surface>
  );
}

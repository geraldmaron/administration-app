import { View } from "@tamagui/core";
import { Icon, type IconName } from "../icons/Icon";
import { Pressable } from "../primitives/Button";
import { Row } from "../primitives/Stack";
import { Text } from "../primitives/Text";

export type SectionNavItem = {
  /** The Section's id. */
  readonly id: string;
  readonly label: string;
  readonly icon?: IconName;
  /** A count worth seeing before the jump, such as matters waiting. */
  readonly count?: number;
};

export type SectionNavProps = {
  readonly items: readonly SectionNavItem[];
  /** The navigation landmark's name. */
  readonly label?: string;
  /** An element id to land on when the page opens: a section, or anything inside one. */
  readonly initial?: string;
};

export const chipId = (id: string): string => `section-nav-${id}`;

/** One chip: the current section is filled navy with a gold underline, the rest are quiet outlines. */
export function SectionChip({ item, current, onPress }: { readonly item: SectionNavItem; readonly current: boolean; readonly onPress: () => void }) {
  return (
    <Pressable
      id={chipId(item.id)}
      href={`#${item.id}`}
      role="link"
      aria-current={current ? "location" : undefined}
      aria-label={item.count ? `${item.label}, ${item.count}` : item.label}
      onPress={onPress}
      flexDirection="row"
      alignItems="center"
      gap="xs"
      minHeight={36}
      paddingHorizontal="md"
      borderRadius="pill"
      borderWidth={1}
      borderColor={current ? "chromeBackground" : "borderColor"}
      backgroundColor={current ? { default: "chromeBackground", hover: "chromeBackground" } : { default: "surface", hover: "surfaceHover", press: "backgroundPress" }}
      flexShrink={0}
    >
      {item.icon ? <Icon name={item.icon} size={16} tone={current ? "gold" : "colorSecondary"} weight={current ? "fill" : "duotone"} /> : null}
      <Text variant="label" color={current ? "chromeColor" : "color"} numberOfLines={1}>
        {item.label}
      </Text>
      {item.count ? (
        <View minWidth={20} height={20} paddingHorizontal="xs" borderRadius="pill" backgroundColor="warningFill" alignItems="center" justifyContent="center">
          <Text variant="caption" weight="strong" tone="warning" tabular>
            {item.count}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

/** The chips in page order. */
export function ChipRow({ items, current, onJump }: { readonly items: readonly SectionNavItem[]; readonly current: string | undefined; readonly onJump: (id: string) => void }) {
  return (
    <Row gap="xs" paddingVertical="sm">
      {items.map((item) => (
        <SectionChip key={item.id} item={item} current={item.id === current} onPress={() => onJump(item.id)} />
      ))}
    </Row>
  );
}

import type { ReactNode } from "react";
import { router } from "expo-router";
import { place } from "@admin/player-core";
import { Column, Icon, Pressable, Row, Text, View, useMedia, type IconName } from "@admin/ui";

// One bar across the top of every Nation screen, so Policy, the Budget, the
// Economy, Emergencies and each state read as rooms of the same place: where
// you are inside the Nation, and the way to each of its other rooms.

export type NationRoom = "overview" | "policy" | "budget" | "economy" | "emergency" | "state";

const ROOMS: readonly { readonly id: Exclude<NationRoom, "state" | "overview">; readonly label: string; readonly icon: IconName; readonly href: () => string }[] = [
  { id: "policy", label: "Policy", icon: "order", href: place.policy },
  { id: "budget", label: "Budget", icon: "budget", href: place.budget },
  { id: "economy", label: "Economy", icon: "economyGrowth", href: place.economy },
  { id: "emergency", label: "Emergencies", icon: "caution", href: place.emergency },
];

function Room({ label, icon, current, href, onPress }: { readonly label: string; readonly icon: IconName; readonly current: boolean; readonly href: string; readonly onPress: () => void }) {
  return (
    <Pressable href={href} role="link" aria-label={label} aria-current={current ? "page" : undefined} onPress={onPress} flexDirection="row" alignItems="center" gap="xs" minHeight={32} paddingHorizontal="sm" borderRadius="control" borderBottomWidth={2} borderBottomColor={current ? "goldRule" : "transparent"}>
      <Icon name={icon} size={16} tone={current ? "gold" : "colorSecondary"} weight={current ? "fill" : "duotone"} />
      <Text variant="label" tone={current ? "primary" : "secondary"} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

/** The Nation's bar: the trail back to the Nation, then each of its rooms with the one you are in marked. */
export function NationTrail({ room, here }: { readonly room: NationRoom; readonly here?: string }) {
  const media = useMedia();
  // The overview is the Nation itself: its own section chips are the way around it, and the rooms are in the sidebar and under "Run the country".
  if (room === "overview") return null;
  return (
    <View role="navigation" aria-label="Nation" paddingHorizontal={media.phone ? 16 : 28} paddingVertical="xs" borderBottomWidth={1} borderBottomColor="borderColorStrong" backgroundColor="background">
      <Row gap="md" wrap>
        <Row gap="xs">
          <Pressable role="link" href={place.nation()} aria-label="Nation overview" onPress={() => router.push(place.nation() as never)} flexDirection="row" alignItems="center" gap="xs" minHeight={32} paddingHorizontal="xs" borderRadius="control">
            <Icon name="flag" size={16} tone="gold" weight="fill" />
            <Text variant="label" tone="accent">
              Nation
            </Text>
          </Pressable>
          {here ? (
            <>
              <Icon name="chevron" size={12} tone="colorTertiary" />
              <Text variant="label" numberOfLines={1}>
                {here}
              </Text>
            </>
          ) : null}
        </Row>
        {media.phone ? null : (
          <Row gap="2xs" wrap flex={1} justifyContent="flex-end">
            {ROOMS.map((entry) => (
              <Room href={entry.href()} key={entry.id} label={entry.label} icon={entry.icon} current={entry.id === room} onPress={() => router.push(entry.href() as never)} />
            ))}
          </Row>
        )}
      </Row>
    </View>
  );
}

/** A Nation screen under its bar; the screen keeps its own scrolling page. */
export function InNation({ room, here, children }: { readonly room: NationRoom; readonly here?: string; readonly children: ReactNode }) {
  return (
    <Column flex={1} minHeight={0}>
      <NationTrail room={room} {...(here ? { here } : {})} />
      <Column flex={1} minHeight={0}>
        {children}
      </Column>
    </Column>
  );
}

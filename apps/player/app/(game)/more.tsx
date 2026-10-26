import { legacyReading, place } from "@admin/player-core";
import { CardGrid, Column, Icon, Page, Pressable, Surface, Text, type NavItem } from "@admin/ui";
import { useCampaignState } from "../../src/device/hooks";
import { go } from "../../src/shell/navigate";
import { navGroups, navUtilities } from "../../src/shell/nav";
import { BackButton } from "../../src/shell/BackButton";

function Door({ item }: { readonly item: NavItem }) {
  return (
    <Pressable onPress={() => go(item.href)} role="link" aria-label={item.label} flexDirection="row" alignItems="center" gap="md" padding="md" borderRadius="control">
      <Icon name={item.icon} size={22} tone="gold" />
      <Text variant="label" flex={1}>{item.label}</Text>
      <Icon name="chevron" size={16} tone="colorTertiary" />
    </Pressable>
  );
}

function Group({ label, items }: { readonly label: string; readonly items: readonly NavItem[] }) {
  return (
    <Column gap="xs" flexGrow={1}>
      <Text variant="eyebrow" tone="secondary" role="heading" aria-level={2}>{label}</Text>
      <Surface pad="none" flexGrow={1}>
        {items.map((item, i) => (
          <Column key={item.id} borderTopWidth={i === 0 ? 0 : 1} borderTopColor="borderColor">
            <Door item={item} />
          </Column>
        ))}
      </Surface>
    </Column>
  );
}

/**
 * Everything the phone bar does not name: the press, the Record, the
 * calendar, every institution under its group, the Handbook, the saves and
 * the settings. On a wide screen the rail already lists all of it.
 */
export default function More() {
  const state = useCampaignState();
  const ended = state.status === "ready" && legacyReading(state.campaign) !== undefined;
  const groups = navGroups();
  const extras: readonly NavItem[] = ended ? [{ id: "ending", label: "How it ended", href: place.ending(), icon: "record" }, { id: "legacy", label: "Legacy", href: place.legacy(), icon: "archive" }] : [];
  return (
    <Page eyebrow="The Administration" icon="menu" title="More" lede="The rest of the game, grouped by institution." actions={<BackButton parent={place.brief()} parentLabel="Brief" />}>
      <CardGrid columns={{ phone: 1, tablet: 2, desktop: 3, wide: 3 }} gap="xl">
        {groups.map((group) => (
          <Group key={group.id} label={group.label} items={group.items} />
        ))}
        {extras.length > 0 ? <Group label="End of your term" items={extras} /> : null}
        <Group label="Utilities" items={[...navUtilities(), { id: "recovery", label: "Recovery", href: place.recovery(), icon: "caution" }]} />
      </CardGrid>
    </Page>
  );
}
